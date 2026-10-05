// ENTRY POINT – CLI process. Same composition root, different driving adapter.
import { EXIT_FAILURE, runCli } from '@usflights/adapter-cli';
import { ConfigError, createContainer, loadConfig } from '@usflights/bootstrap';

async function main(): Promise<number> {
  const config = loadConfig({ LOG_LEVEL: 'warn', ...process.env });
  const container = await createContainer(config, { logToStderr: true });
  try {
    return await runCli(process.argv.slice(2), container.ports, {
      out: (text) => process.stdout.write(`${text}\n`),
      err: (text) => process.stderr.write(`${text}\n`),
    });
  } finally {
    await container.dispose();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message =
      error instanceof ConfigError
        ? error.message
        : error instanceof Error
          ? error.stack
          : String(error);
    process.stderr.write(`Fatal: ${message}\n`);
    process.exitCode = EXIT_FAILURE;
  });
