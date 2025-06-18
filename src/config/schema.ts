/**
 * Configuration schema validation for MCP Conductor
 * Defines Joi schemas for validating configuration files
 */

import Joi from 'joi';

/**
 * Schema for MCP server connection configuration
 */
const connectionSchema = Joi.object({
  type: Joi.string().valid('stdio', 'http', 'websocket').required(),
  command: Joi.string().when('type', {
    is: 'stdio',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  args: Joi.array().items(Joi.string()).optional(),
  url: Joi.string().uri().when('type', {
    is: Joi.valid('http', 'websocket'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  env: Joi.object().pattern(Joi.string(), Joi.string()).optional()
});

/**
 * Schema for authentication configuration
 */
const authSchema = Joi.object({
  type: Joi.string().valid('none', 'api_key', 'oauth', 'basic').required(),
  credentials: Joi.object().pattern(Joi.string(), Joi.string()).optional()
});

/**
 * Schema for health check configuration
 */
const healthCheckSchema = Joi.object({
  enabled: Joi.boolean().required(),
  interval: Joi.number().integer().min(10).default(60), // seconds
  timeout: Joi.number().integer().min(1).default(30), // seconds
  retries: Joi.number().integer().min(1).default(3)
});

/**
 * Schema for MCP server configuration
 */
const mcpServerSchema = Joi.object({
  id: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).required(),
  name: Joi.string().required(),
  type: Joi.string().required(),
  connection: connectionSchema.required(),
  auth: authSchema.optional(),
  config: Joi.object().optional(),
  enabled: Joi.boolean().default(true),
  autoRestart: Joi.boolean().default(false),
  healthCheck: healthCheckSchema.optional()
});

/**
 * Schema for workflow step configuration
 */
const workflowStepSchema = Joi.object({
  id: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).required(),
  name: Joi.string().required(),
  serverId: Joi.string().required(),
  tool: Joi.string().required(),
  parameters: Joi.object().required(),
  condition: Joi.string().optional(),
  onError: Joi.string().valid('stop', 'continue', 'retry').default('stop'),
  retry: Joi.object({
    attempts: Joi.number().integer().min(1).default(3),
    delay: Joi.number().integer().min(0).default(1) // seconds
  }).optional()
});

/**
 * Schema for workflow trigger configuration
 */
const workflowTriggerSchema = Joi.object({
  type: Joi.string().valid('manual', 'schedule', 'event', 'webhook').required(),
  config: Joi.object().required()
});

/**
 * Schema for workflow definition
 */
const workflowSchema = Joi.object({
  id: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).required(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  trigger: workflowTriggerSchema.required(),
  steps: Joi.array().items(workflowStepSchema).min(1).required(),
  enabled: Joi.boolean().default(true)
});

/**
 * Schema for plugin configuration
 */
const pluginSchema = Joi.object({
  id: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).required(),
  name: Joi.string().required(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
  config: Joi.object().optional(),
  enabled: Joi.boolean().default(true)
});

/**
 * Schema for web interface configuration
 */
const webConfigSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  port: Joi.number().integer().min(1).max(65535).default(3000),
  host: Joi.string().default('localhost'),
  auth: Joi.object({
    enabled: Joi.boolean().default(false),
    username: Joi.string().when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    password: Joi.string().when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }).optional()
});

/**
 * Schema for general configuration
 */
const generalConfigSchema = Joi.object({
  logLevel: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  dataDir: Joi.string().default('./data'),
  web: webConfigSchema.optional()
});

/**
 * Main configuration schema
 */
export const conductorConfigSchema = Joi.object({
  general: generalConfigSchema.required(),
  servers: Joi.array().items(mcpServerSchema).min(1).required(),
  workflows: Joi.array().items(workflowSchema).optional(),
  plugins: Joi.array().items(pluginSchema).optional()
});

/**
 * Validate configuration object
 */
export function validateConfig(config: unknown): {
  error?: Joi.ValidationError;
  value?: any;
} {
  return conductorConfigSchema.validate(config, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });
}

/**
 * Schema for environment variables
 */
export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  LOG_DIR: Joi.string().default('./logs'),
  CONFIG_PATH: Joi.string().optional(),
  DATA_DIR: Joi.string().default('./data'),
  WEB_PORT: Joi.number().integer().min(1).max(65535).optional(),
  WEB_HOST: Joi.string().optional(),
  ENCRYPTION_KEY: Joi.string().min(32).optional() // For encrypting credentials
});

/**
 * Validate environment variables
 */
export function validateEnv(env: NodeJS.ProcessEnv): {
  error?: Joi.ValidationError;
  value?: any;
} {
  return envSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  });
}

/**
 * Default configuration template
 */
export const defaultConfig = {
  general: {
    logLevel: 'info',
    dataDir: './data',
    web: {
      enabled: true,
      port: 3000,
      host: 'localhost',
      auth: {
        enabled: false
      }
    }
  },
  servers: [],
  workflows: [],
  plugins: []
};

/**
 * Example configuration for documentation
 */
export const exampleConfig = {
  general: {
    logLevel: 'info',
    dataDir: './data',
    web: {
      enabled: true,
      port: 3000,
      host: 'localhost',
      auth: {
        enabled: true,
        username: 'admin',
        password: 'your-secure-password'
      }
    }
  },
  servers: [
    {
      id: 'obsidian',
      name: 'Obsidian Notes',
      type: 'obsidian',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@obsidian/mcp-server'],
        env: {
          OBSIDIAN_VAULT_PATH: '/path/to/your/vault'
        }
      },
      enabled: true,
      autoRestart: true,
      healthCheck: {
        enabled: true,
        interval: 60,
        timeout: 30,
        retries: 3
      }
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      type: 'calendar',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@google/calendar-mcp-server']
      },
      auth: {
        type: 'oauth',
        credentials: {
          client_id: 'your-client-id',
          client_secret: 'your-client-secret'
        }
      },
      enabled: true,
      autoRestart: true
    },
    {
      id: 'todoist',
      name: 'Todoist Tasks',
      type: 'todoist',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@todoist/mcp-server']
      },
      auth: {
        type: 'api_key',
        credentials: {
          api_token: 'your-todoist-api-token'
        }
      },
      enabled: true
    }
  ],
  workflows: [
    {
      id: 'daily-planning',
      name: 'Daily Planning Workflow',
      description: 'Create daily notes and sync with calendar',
      trigger: {
        type: 'schedule',
        config: {
          cron: '0 9 * * *' // Every day at 9 AM
        }
      },
      steps: [
        {
          id: 'create-daily-note',
          name: 'Create Daily Note',
          serverId: 'obsidian',
          tool: 'create_note',
          parameters: {
            title: 'Daily Note - {{date}}',
            content: '# Daily Note for {{date}}\n\n## Tasks\n\n## Notes\n\n'
          }
        },
        {
          id: 'get-calendar-events',
          name: 'Get Today\'s Events',
          serverId: 'calendar',
          tool: 'list_events',
          parameters: {
            date: '{{date}}'
          }
        }
      ],
      enabled: true
    }
  ],
  plugins: []
};

