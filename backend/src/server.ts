import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/index.js';

// ---------------------------------------------------------------------------
// Server entry point
// ---------------------------------------------------------------------------

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.info(`✅ Inventory API server started`);
  console.info(`   Environment : ${env.NODE_ENV}`);
  console.info(`   Port        : ${env.PORT}`);
  console.info(`   Provider    : ${env.LARK_PROVIDER}`);
  console.info(`   Health      : http://localhost:${env.PORT}/api/health`);
  console.info(`   Status      : http://localhost:${env.PORT}/api/integration-status`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string): void {
  console.info(`\n${signal} received — shutting down gracefully…`);
  server.close(() => {
    console.info('Server closed.');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful close hangs
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  // Do not exit — log and continue
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
