/**
 * MCP Conductor - Main Entry Point
 * Self-hosted personal assistant orchestrating multiple MCP servers
 */

import { Orchestrator } from './core/orchestrator';
import { createLogger } from './utils/logger';
import { validateEnv } from './config/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment variables
const { error: envError, value: env } = validateEnv(process.env);
if (envError) {
  console.error('Environment validation failed:', envError.details);
  process.exit(1);
}

const logger = createLogger('Main');

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  const orchestrator = new Orchestrator();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await orchestrator.stop();
      logger.info('MCP Conductor stopped successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection:', { reason, promise });
    shutdown('unhandledRejection');
  });

  try {
    // Initialize and start the orchestrator
    logger.info('Starting MCP Conductor...');
    
    const configPath = env.CONFIG_PATH || './config/conductor.yaml';
    await orchestrator.initialize(configPath);
    await orchestrator.start();

    logger.info('MCP Conductor is running successfully');
    
    // Log status information
    const status = orchestrator.getStatus();
    logger.info('System Status:', {
      running: status.running,
      servers: Object.keys(status.servers).length,
      workflows: status.workflows.total,
      plugins: Object.keys(status.plugins).length
    });

  } catch (error) {
    logger.error('Failed to start MCP Conductor:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
export default main;

