// HEXAGON: outside – DRIVING adapter
// Transport-level validation only (types, presence). Business validation stays in the hexagon,
// so the CLI and Kafka adapters get it too.

export const paginationProperties = {
  limit: { type: 'integer', minimum: 1 },
  offset: { type: 'integer', minimum: 0 },
} as const;

export const iataParamsSchema = {
  type: 'object',
  required: ['iata'],
  properties: { iata: { type: 'string' } },
} as const;
