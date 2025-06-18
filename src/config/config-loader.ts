/**
 * Configuration loader for MCP Conductor
 * Handles loading and parsing of YAML/JSON configuration files
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import YAML from 'yaml';
import { Logger } from 'winston';
import { ConductorConfig } from '@/core/interfaces';
import { validateConfig, defaultConfig } from './schema';
import { createLogger } from '@/utils/logger';

/**
 * Configuration loader class
 */
export class ConfigLoader {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger('ConfigLoader');
  }

  /**
   * Load configuration from file
   */
  async load(configPath?: string): Promise<ConductorConfig> {
    const path = this.resolveConfigPath(configPath);
    
    this.logger.info(`Loading configuration from: ${path}`);

    if (!existsSync(path)) {
      this.logger.warn(`Configuration file not found: ${path}`);
      this.logger.info('Using default configuration');
      return this.validateAndReturn(defaultConfig);
    }

    try {
      const content = readFileSync(path, 'utf8');
      const config = this.parseConfig(content, path);
      
      return this.validateAndReturn(config);
    } catch (error) {
      this.logger.error(`Failed to load configuration from ${path}:`, error);
      throw new Error(`Configuration loading failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Resolve configuration file path
   */
  private resolveConfigPath(configPath?: string): string {
    if (configPath) {
      return resolve(configPath);
    }

    // Try common configuration file locations
    const candidates = [
      './config/conductor.yaml',
      './config/conductor.yml',
      './config/conductor.json',
      './conductor.yaml',
      './conductor.yml',
      './conductor.json'
    ];

    for (const candidate of candidates) {
      const fullPath = resolve(candidate);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Return default path if none found
    return resolve('./config/conductor.yaml');
  }

  /**
   * Parse configuration content based on file extension
   */
  private parseConfig(content: string, filePath: string): unknown {
    const ext = filePath.toLowerCase().split('.').pop();

    switch (ext) {
      case 'yaml':
      case 'yml':
        return YAML.parse(content);
      
      case 'json':
        return JSON.parse(content);
      
      default:
        // Try YAML first, then JSON
        try {
          return YAML.parse(content);
        } catch {
          return JSON.parse(content);
        }
    }
  }

  /**
   * Validate configuration and return typed result
   */
  private validateAndReturn(config: unknown): ConductorConfig {
    const { error, value } = validateConfig(config);

    if (error) {
      const errorDetails = error.details.map(detail => detail.message).join(', ');
      throw new Error(`Configuration validation failed: ${errorDetails}`);
    }

    // Perform additional validation
    this.performAdditionalValidation(value);

    this.logger.info('Configuration loaded and validated successfully');
    return value as ConductorConfig;
  }

  /**
   * Perform additional validation beyond schema
   */
  private performAdditionalValidation(config: ConductorConfig): void {
    // Check for duplicate server IDs
    const serverIds = new Set<string>();
    for (const server of config.servers) {
      if (serverIds.has(server.id)) {
        throw new Error(`Duplicate server ID found: ${server.id}`);
      }
      serverIds.add(server.id);
    }

    // Check for duplicate workflow IDs
    if (config.workflows) {
      const workflowIds = new Set<string>();
      for (const workflow of config.workflows) {
        if (workflowIds.has(workflow.id)) {
          throw new Error(`Duplicate workflow ID found: ${workflow.id}`);
        }
        workflowIds.add(workflow.id);
      }

      // Validate workflow step server references
      for (const workflow of config.workflows) {
        for (const step of workflow.steps) {
          if (!serverIds.has(step.serverId)) {
            throw new Error(`Workflow ${workflow.id} step ${step.id} references unknown server: ${step.serverId}`);
          }
        }
      }
    }

    // Check for duplicate plugin IDs
    if (config.plugins) {
      const pluginIds = new Set<string>();
      for (const plugin of config.plugins) {
        if (pluginIds.has(plugin.id)) {
          throw new Error(`Duplicate plugin ID found: ${plugin.id}`);
        }
        pluginIds.add(plugin.id);
      }
    }

    // Validate data directory
    if (!config.general.dataDir) {
      throw new Error('Data directory must be specified');
    }

    this.logger.debug('Additional validation completed successfully');
  }

  /**
   * Watch configuration file for changes
   */
  async watch(configPath: string, callback: (config: ConductorConfig) => void): Promise<void> {
    // TODO: Implement file watching for hot reload
    this.logger.info('Configuration watching not yet implemented');
  }

  /**
   * Save configuration to file
   */
  async save(config: ConductorConfig, configPath: string): Promise<void> {
    // TODO: Implement configuration saving
    this.logger.info('Configuration saving not yet implemented');
  }
}

