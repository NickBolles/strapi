#!/usr/bin/env node

/**
 * MCP Conductor CLI
 * Command-line interface for managing the MCP Conductor
 */

import { Command } from 'commander';
import { Orchestrator } from '@/core/orchestrator';
import { createLogger } from '@/utils/logger';
import { validateEnv } from '@/config/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = createLogger('CLI');
const program = new Command();

program
  .name('mcp-conductor')
  .description('MCP Conductor - Self-hosted personal assistant orchestrating multiple MCP servers')
  .version('0.1.0');

/**
 * Start command
 */
program
  .command('start')
  .description('Start the MCP Conductor')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-d, --daemon', 'Run as daemon')
  .action(async (options) => {
    try {
      logger.info('Starting MCP Conductor...');
      
      const orchestrator = new Orchestrator();
      
      // Setup graceful shutdown
      const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down...`);
        await orchestrator.stop();
        process.exit(0);
      };
      
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
      
      await orchestrator.initialize(options.config);
      await orchestrator.start();
      
      logger.info('MCP Conductor started successfully');
      
      if (!options.daemon) {
        // Keep the process running
        process.stdin.resume();
      }
    } catch (error) {
      logger.error('Failed to start MCP Conductor:', error);
      process.exit(1);
    }
  });

/**
 * Status command
 */
program
  .command('status')
  .description('Show MCP Conductor status')
  .option('-c, --config <path>', 'Configuration file path')
  .action(async (options) => {
    try {
      // TODO: Implement status checking (could connect to running instance via API)
      console.log('Status checking not yet implemented');
      console.log('This would show:');
      console.log('- Running status');
      console.log('- Server statuses');
      console.log('- Active workflows');
      console.log('- Plugin statuses');
    } catch (error) {
      logger.error('Failed to get status:', error);
      process.exit(1);
    }
  });

/**
 * Stop command
 */
program
  .command('stop')
  .description('Stop the MCP Conductor')
  .action(async () => {
    try {
      // TODO: Implement graceful stop (could send signal to running process)
      console.log('Stop command not yet implemented');
      console.log('For now, use Ctrl+C to stop the running process');
    } catch (error) {
      logger.error('Failed to stop MCP Conductor:', error);
      process.exit(1);
    }
  });

/**
 * Config validation command
 */
program
  .command('validate')
  .description('Validate configuration file')
  .option('-c, --config <path>', 'Configuration file path')
  .action(async (options) => {
    try {
      const { ConfigLoader } = await import('@/config/config-loader');
      const configLoader = new ConfigLoader();
      
      const config = await configLoader.load(options.config);
      
      console.log('✅ Configuration is valid');
      console.log(`📊 Servers: ${config.servers.length}`);
      console.log(`🔄 Workflows: ${config.workflows?.length || 0}`);
      console.log(`🔌 Plugins: ${config.plugins?.length || 0}`);
      
      // Show enabled servers
      const enabledServers = config.servers.filter(s => s.enabled);
      if (enabledServers.length > 0) {
        console.log('\n🟢 Enabled servers:');
        enabledServers.forEach(server => {
          console.log(`  - ${server.name} (${server.id})`);
        });
      }
      
      // Show enabled workflows
      const enabledWorkflows = config.workflows?.filter(w => w.enabled) || [];
      if (enabledWorkflows.length > 0) {
        console.log('\n🔄 Enabled workflows:');
        enabledWorkflows.forEach(workflow => {
          console.log(`  - ${workflow.name} (${workflow.id})`);
        });
      }
      
    } catch (error) {
      console.error('❌ Configuration validation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Execute workflow command
 */
program
  .command('workflow')
  .description('Execute a workflow')
  .argument('<workflow-id>', 'Workflow ID to execute')
  .option('-c, --config <path>', 'Configuration file path')
  .option('-v, --variables <json>', 'Workflow variables as JSON')
  .action(async (workflowId, options) => {
    try {
      console.log('Workflow execution via CLI not yet implemented');
      console.log(`Would execute workflow: ${workflowId}`);
      if (options.variables) {
        console.log(`With variables: ${options.variables}`);
      }
    } catch (error) {
      logger.error('Failed to execute workflow:', error);
      process.exit(1);
    }
  });

/**
 * List servers command
 */
program
  .command('servers')
  .description('List configured MCP servers')
  .option('-c, --config <path>', 'Configuration file path')
  .action(async (options) => {
    try {
      const { ConfigLoader } = await import('@/config/config-loader');
      const configLoader = new ConfigLoader();
      
      const config = await configLoader.load(options.config);
      
      console.log('📊 Configured MCP Servers:\n');
      
      config.servers.forEach(server => {
        const status = server.enabled ? '🟢 Enabled' : '🔴 Disabled';
        console.log(`${server.name} (${server.id})`);
        console.log(`  Status: ${status}`);
        console.log(`  Type: ${server.type}`);
        console.log(`  Connection: ${server.connection.type}`);
        if (server.auth) {
          console.log(`  Auth: ${server.auth.type}`);
        }
        console.log('');
      });
    } catch (error) {
      logger.error('Failed to list servers:', error);
      process.exit(1);
    }
  });

/**
 * Generate config command
 */
program
  .command('init')
  .description('Generate example configuration file')
  .option('-o, --output <path>', 'Output file path', './config/conductor.yaml')
  .action(async (options) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Ensure config directory exists
      const configDir = path.dirname(options.output);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Copy example config
      const exampleConfigPath = path.resolve(__dirname, '../../config/example.yaml');
      if (fs.existsSync(exampleConfigPath)) {
        fs.copyFileSync(exampleConfigPath, options.output);
        console.log(`✅ Configuration file created: ${options.output}`);
        console.log('📝 Please edit the file to customize your setup');
      } else {
        console.log('❌ Example configuration file not found');
        process.exit(1);
      }
    } catch (error) {
      logger.error('Failed to generate configuration:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

