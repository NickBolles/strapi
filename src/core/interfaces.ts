/**
 * Core interfaces for MCP Conductor
 * Defines the fundamental types and contracts for the orchestration system
 */

import { Tool, Resource, Prompt } from '@modelcontextprotocol/sdk';

/**
 * Configuration for an individual MCP server
 */
export interface MCPServerConfig {
  /** Unique identifier for this server instance */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of MCP server (obsidian, calendar, todoist, etc.) */
  type: string;
  /** Server connection configuration */
  connection: {
    /** Connection type: stdio, http, or websocket */
    type: 'stdio' | 'http' | 'websocket';
    /** Command to start the server (for stdio) */
    command?: string;
    /** Arguments for the server command */
    args?: string[];
    /** URL for HTTP/WebSocket connections */
    url?: string;
    /** Environment variables for the server */
    env?: Record<string, string>;
  };
  /** Authentication configuration */
  auth?: {
    /** Authentication type */
    type: 'none' | 'api_key' | 'oauth' | 'basic';
    /** Credentials (will be encrypted) */
    credentials?: Record<string, string>;
  };
  /** Server-specific configuration */
  config?: Record<string, unknown>;
  /** Whether this server is enabled */
  enabled: boolean;
  /** Auto-restart on failure */
  autoRestart?: boolean;
  /** Health check configuration */
  healthCheck?: {
    enabled: boolean;
    interval: number; // seconds
    timeout: number; // seconds
    retries: number;
  };
}

/**
 * Main configuration for MCP Conductor
 */
export interface ConductorConfig {
  /** General settings */
  general: {
    /** Log level */
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    /** Data directory for storing state */
    dataDir: string;
    /** Web interface configuration */
    web?: {
      enabled: boolean;
      port: number;
      host: string;
      auth?: {
        enabled: boolean;
        username: string;
        password: string;
      };
    };
  };
  /** MCP server configurations */
  servers: MCPServerConfig[];
  /** Workflow definitions */
  workflows?: WorkflowDefinition[];
  /** Plugin configurations */
  plugins?: PluginConfig[];
}

/**
 * Workflow definition for cross-service automation
 */
export interface WorkflowDefinition {
  /** Unique workflow identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Workflow description */
  description?: string;
  /** Trigger configuration */
  trigger: {
    /** Trigger type */
    type: 'manual' | 'schedule' | 'event' | 'webhook';
    /** Trigger-specific configuration */
    config: Record<string, unknown>;
  };
  /** Workflow steps */
  steps: WorkflowStep[];
  /** Whether this workflow is enabled */
  enabled: boolean;
}

/**
 * Individual step in a workflow
 */
export interface WorkflowStep {
  /** Step identifier */
  id: string;
  /** Step name */
  name: string;
  /** Target MCP server ID */
  serverId: string;
  /** Tool to execute */
  tool: string;
  /** Tool parameters (can include template variables) */
  parameters: Record<string, unknown>;
  /** Conditions for step execution */
  condition?: string;
  /** Error handling strategy */
  onError?: 'stop' | 'continue' | 'retry';
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number; // seconds
  };
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin-specific configuration */
  config?: Record<string, unknown>;
  /** Whether this plugin is enabled */
  enabled: boolean;
}

/**
 * Runtime information about an MCP server
 */
export interface MCPServerInfo {
  /** Server configuration */
  config: MCPServerConfig;
  /** Current status */
  status: 'starting' | 'running' | 'stopped' | 'error';
  /** Process ID (for stdio servers) */
  pid?: number;
  /** Last health check result */
  lastHealthCheck?: Date;
  /** Available tools */
  tools: Tool[];
  /** Available resources */
  resources: Resource[];
  /** Available prompts */
  prompts: Prompt[];
  /** Error information if status is 'error' */
  error?: string;
  /** Server capabilities */
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    sampling?: boolean;
  };
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  /** Workflow ID */
  workflowId: string;
  /** Execution ID */
  executionId: string;
  /** Execution start time */
  startTime: Date;
  /** Current step index */
  currentStep: number;
  /** Execution variables */
  variables: Record<string, unknown>;
  /** Step results */
  stepResults: Record<string, unknown>;
  /** Execution status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  /** Error information */
  error?: string;
}

/**
 * Plugin interface
 */
export interface Plugin {
  /** Plugin metadata */
  readonly metadata: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
  };

  /** Initialize the plugin */
  initialize(config: PluginConfig, conductor: ConductorCore): Promise<void>;

  /** Start the plugin */
  start(): Promise<void>;

  /** Stop the plugin */
  stop(): Promise<void>;

  /** Get plugin status */
  getStatus(): 'initialized' | 'running' | 'stopped' | 'error';
}

/**
 * Core conductor interface
 */
export interface ConductorCore {
  /** Get MCP server by ID */
  getServer(serverId: string): MCPServerInfo | undefined;

  /** Get all MCP servers */
  getServers(): MCPServerInfo[];

  /** Execute a tool on a specific server */
  executeTool(serverId: string, toolName: string, parameters: Record<string, unknown>): Promise<unknown>;

  /** Get a resource from a specific server */
  getResource(serverId: string, resourceUri: string): Promise<unknown>;

  /** Execute a workflow */
  executeWorkflow(workflowId: string, variables?: Record<string, unknown>): Promise<string>;

  /** Get workflow execution status */
  getWorkflowExecution(executionId: string): WorkflowContext | undefined;

  /** Register an event listener */
  on(event: string, listener: (...args: unknown[]) => void): void;

  /** Emit an event */
  emit(event: string, ...args: unknown[]): void;
}

/**
 * Events emitted by the conductor
 */
export interface ConductorEvents {
  'server:started': (serverId: string) => void;
  'server:stopped': (serverId: string) => void;
  'server:error': (serverId: string, error: string) => void;
  'workflow:started': (workflowId: string, executionId: string) => void;
  'workflow:completed': (workflowId: string, executionId: string) => void;
  'workflow:failed': (workflowId: string, executionId: string, error: string) => void;
  'plugin:loaded': (pluginId: string) => void;
  'plugin:error': (pluginId: string, error: string) => void;
}

/**
 * Security context for operations
 */
export interface SecurityContext {
  /** User ID (if applicable) */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Permissions */
  permissions: string[];
  /** Request source */
  source: 'web' | 'cli' | 'api' | 'workflow';
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Timestamp */
  timestamp: Date;
  /** User ID */
  userId?: string;
  /** Action performed */
  action: string;
  /** Resource affected */
  resource: string;
  /** Additional details */
  details?: Record<string, unknown>;
  /** Request source */
  source: string;
  /** Success/failure */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

