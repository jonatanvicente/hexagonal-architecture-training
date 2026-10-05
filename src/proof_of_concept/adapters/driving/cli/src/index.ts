// HEXAGON: outside – DRIVING adapter (command line)
// A second driving adapter over the SAME driving ports as the REST API: argv instead of HTTP,
// exit codes instead of status codes, text tables instead of JSON.
import { parseArgs } from 'node:util';
import {
  NotFoundError,
  ValidationError,
  type FindDelayedFlightsUseCase,
  type GetAirportDelayStatsUseCase,
  type GetAirportUseCase,
  type GetCarrierPunctualityRankingUseCase,
  type ListAirportsUseCase,
  type ListCarriersUseCase,
} from '@usflights/application';

export interface CliDrivingPorts {
  readonly listAirports: ListAirportsUseCase;
  readonly getAirport: GetAirportUseCase;
  readonly getAirportDelayStats: GetAirportDelayStatsUseCase;
  readonly findDelayedFlights: FindDelayedFlightsUseCase;
  readonly listCarriers: ListCarriersUseCase;
  readonly getCarrierPunctualityRanking: GetCarrierPunctualityRankingUseCase;
}

export interface CliIo {
  out(text: string): void;
  err(text: string): void;
}

export const EXIT_OK = 0;
export const EXIT_USAGE = 2;
export const EXIT_NOT_FOUND = 3;
export const EXIT_FAILURE = 1;

const USAGE = `Usage: npm run cli -- <command> [options] [--json]

Commands:
  airports  [--state TX] [--city Houston] [--q text] [--limit N] [--offset N]
  airport   <IATA>
  stats     <IATA>                         delay statistics for an airport
  delayed   [--min 60] [--origin JFK] [--dest LAX] [--carrier AA] [--year 2005] [--limit N]
  carriers  [--q text] [--limit N]
  ranking   [--year 2005] [--min-flights 10] [--limit N]
`;

type Row = Record<string, unknown>;

export async function runCli(argv: string[], ports: CliDrivingPorts, io: CliIo): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      state: { type: 'string' },
      city: { type: 'string' },
      q: { type: 'string' },
      origin: { type: 'string' },
      dest: { type: 'string' },
      carrier: { type: 'string' },
      year: { type: 'string' },
      min: { type: 'string' },
      'min-flights': { type: 'string' },
      limit: { type: 'string' },
      offset: { type: 'string' },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const [command, argument] = positionals;
  if (!command || values.help) {
    io.out(USAGE);
    return command ? EXIT_OK : EXIT_USAGE;
  }

  const print = (data: unknown, rows: Row[]): void =>
    io.out(values.json ? JSON.stringify(data, null, 2) : formatTable(rows));

  try {
    switch (command) {
      case 'airports': {
        const page = await ports.listAirports.execute({
          state: values.state,
          city: values.city,
          text: values.q,
          limit: toInt(values.limit),
          offset: toInt(values.offset),
        });
        print(
          page,
          page.items.map(({ latitude: _lat, longitude: _lon, ...rest }) => rest),
        );
        io.err(`${page.items.length} of ${page.total} airports`);
        return EXIT_OK;
      }
      case 'airport': {
        const airport = await ports.getAirport.execute({ iata: requireArg(argument, 'IATA') });
        print(airport, [airport as unknown as Row]);
        return EXIT_OK;
      }
      case 'stats': {
        const stats = await ports.getAirportDelayStats.execute({
          iata: requireArg(argument, 'IATA'),
        });
        print(stats, [
          { direction: 'departures', ...stats.departures },
          { direction: 'arrivals', ...stats.arrivals },
        ]);
        const { airport, delayThresholdMinutes } = stats;
        io.err(`${airport.iata} – ${airport.name} (delay >= ${delayThresholdMinutes} min)`);
        return EXIT_OK;
      }
      case 'delayed': {
        const page = await ports.findDelayedFlights.execute({
          minDelayMinutes: toInt(values.min),
          origin: values.origin,
          destination: values.dest,
          carrier: values.carrier,
          year: toInt(values.year),
          limit: toInt(values.limit),
          offset: toInt(values.offset),
        });
        print(
          page,
          page.items.map((f) => ({
            date: f.date,
            flight: `${f.carrier}${f.flightNumber}`,
            route: `${f.origin}->${f.destination}`,
            arrDelay: f.arrivalDelayMinutes,
            depDelay: f.departureDelayMinutes,
            status: f.status,
          })),
        );
        io.err(`${page.items.length} of ${page.total} delayed flights`);
        return EXIT_OK;
      }
      case 'carriers': {
        const page = await ports.listCarriers.execute({
          text: values.q,
          limit: toInt(values.limit),
          offset: toInt(values.offset),
        });
        print(page, page.items as unknown as Row[]);
        io.err(`${page.items.length} of ${page.total} carriers`);
        return EXIT_OK;
      }
      case 'ranking': {
        const view = await ports.getCarrierPunctualityRanking.execute({
          year: toInt(values.year),
          minFlights: toInt(values['min-flights']),
          limit: toInt(values.limit),
        });
        print(
          view,
          view.ranking.map((r) => ({
            rank: r.rank,
            carrier: r.carrier.code,
            name: r.carrier.name,
            flights: r.punctuality.totalFlights,
            onTimePct: r.punctuality.onTimePercentage,
            avgArrDelay: r.punctuality.avgArrivalDelayMinutes,
          })),
        );
        return EXIT_OK;
      }
      default:
        io.err(`Unknown command '${command}'\n\n${USAGE}`);
        return EXIT_USAGE;
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      io.err(error.message);
      return EXIT_NOT_FOUND;
    }
    if (error instanceof ValidationError || error instanceof CliUsageError) {
      io.err(error.message);
      return EXIT_USAGE;
    }
    throw error;
  }
}

class CliUsageError extends Error {}

function requireArg(value: string | undefined, name: string): string {
  if (!value) throw new CliUsageError(`Missing argument <${name}>`);
  return value;
}

function toInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new CliUsageError(`'${value}' is not an integer`);
  return parsed;
}

function formatTable(rows: Row[]): string {
  if (rows.length === 0) return '(no results)';
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const cell = (value: unknown): string =>
    value === null || value === undefined
      ? '-'
      : Array.isArray(value)
        ? value.join(',')
        : String(value);
  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((row) => cell(row[col]).length)),
  );
  const line = (values: string[]): string =>
    values.map((v, i) => v.padEnd(widths[i] ?? 0)).join('  ');
  return [
    line(columns),
    line(widths.map((w) => '-'.repeat(w))),
    ...rows.map((row) => line(columns.map((col) => cell(row[col])))),
  ].join('\n');
}
