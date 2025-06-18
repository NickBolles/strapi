/**
 * Core orchestrator for MCP Conductor
 * Manages the lifecycle and coordination of multiple MCP servers
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { 
  ConductorCore, 
  ConductorConfig, 
  MCPServerInfo, 
  WorkflowContext, 
  SecurityContext,
  ConductorEvents 
} from './interfaces';
import { MCPServerManager } from './mcp-server-manager';
import { ConfigLoader } from '@/config/config-loader';
import { SecurityManager } from '@/security/auth-manager';
import { WorkflowEngine } from '@/orchestration/workflow-engine';
import { PluginManager } from '@/plugins/plugin-manager';
import { createLogger } from '@/utils/logger';

/**
 * Main orchestrator class that coordinates all MCP Conductor components
 */
export class Orchestrator extends EventEmitter implements ConductorCore {
  private readonly logger: Logger;
  private readonly configLoader: ConfigLoader;
  private readonly securityManager: SecurityManager;
  private readonly serverManager: MCPServerManager;
  private readonly workflowEngine: WorkflowEngine;
  private readonly pluginManager: PluginManager;
  
  private config: ConductorConfig | null = null;
  private isRunning = false;

  constructor() {
    super();
    
    this.logger = createLogger('Orchestrator');
    this.configLoader = new ConfigLoader();
    this.securityManager = new SecurityManager();
    this.serverManager = new MCPServerManager();
    this.workflowEngine = new WorkflowEngine();
    this.pluginManager = new PluginManager();

    this.setupEventHandlers();
  }

  /**
   * Initialize the orchestrator with configuration
   */
  async initialize(configPath?: string): Promise<void> {
    try {
      this.logger.info('Initializing MCP Conductor...');

      // Load configuration
      this.config = await this.configLoader.load(configPath);
      this.logger.info(`Loaded configuration with ${this.config.servers.length} servers`);

      // Initialize security manager
      await this.securityManager.initialize(this.config);

      // Initialize server manager
      await this.serverManager.initialize(this.config, this.securityManager);

      // Initialize workflow engine
      await this.workflowEngine.initialize(this.config, this);

      // Initialize plugin manager
      await this.pluginManager.initialize(this.config, this);

      this.logger.info('MCP Conductor initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MCP Conductor:', error);
      throw error;
    }
  }

  /**
   * Start the orchestrator and all configured services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Orchestrator is already running');
    }

    if (!this.config) {
      throw new Error('Orchestrator not initialized');
    }

    try {
      this.logger.info('Starting MCP Conductor...');

      // Start security manager
      await this.securityManager.start();

      // Start plugins
      await this.pluginManager.start();

      // Start MCP servers
      await this.serverManager.start();

      // Start workflow engine
      await this.workflowEngine.start();

      this.isRunning = true;
      this.logger.info('MCP Conductor started successfully');
      this.emit('conductor:started');
    } catch (error) {
      this.logger.error('Failed to start MCP Conductor:', error);
      await this.stop(); // Cleanup on failure
      throw error;
    }
  }

  /**
   * Stop the orchestrator and all services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.info('Stopping MCP Conductor...');

      // Stop workflow engine
      await this.workflowEngine.stop();

      // Stop MCP servers
      await this.serverManager.stop();

      // Stop plugins
      await this.pluginManager.stop();

      // Stop security manager
      await this.securityManager.stop();

      this.isRunning = false;
      this.logger.info('MCP Conductor stopped successfully');
      this.emit('conductor:stopped');
    } catch (error) {
      this.logger.error('Error stopping MCP Conductor:', error);
      throw error;
    }
  }

  /**
   * Reload configuration and restart services
   */
  async reload(configPath?: string): Promise<void> {
    this.logger.info('Reloading MCP Conductor configuration...');
    
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      await this.stop();
    }

    await this.initialize(configPath);

    if (wasRunning) {
      await this.start();
    }

    this.logger.info('MCP Conductor configuration reloaded');
    this.emit('conductor:reloaded');
  }

  /**
   * Get MCP server by ID
   */
  getServer(serverId: string): MCPServerInfo | undefined {
    return this.serverManager.getServer(serverId);
  }

  /**
   * Get all MCP servers
   */
  getServers(): MCPServerInfo[] {
    return this.serverManager.getServers();
  }

  /**
   * Execute a tool on a specific MCP server
   */
  async executeTool(
    serverId: string, 
    toolName: string, 
    parameters: Record<string, unknown>,
    context?: SecurityContext
  ): Promise<unknown> {
    // Security check
    if (context && !this.securityManager.hasPermission(context, 'tool:execute')) {
      throw new Error('Insufficient permissions to execute tool');
    }

    // Audit log
    this.securityManager.auditLog({
      timestamp: new Date(),
      userId: context?.userId,
      action: 'tool:execute',
      resource: `${serverId}:${toolName}`,
      details: { parameters },
      source: context?.source || 'unknown',
      success: false // Will be updated below
    });

    try {
      const result = await this.serverManager.executeTool(serverId, toolName, parameters);
      
      // Update audit log
      this.securityManager.auditLog({
        timestamp: new Date(),
        userId: context?.userId,
        action: 'tool:execute',
        resource: `${serverId}:${toolName}`,
        details: { parameters },
        source: context?.source || 'unknown',
        success: true
      });

      return result;
    } catch (error) {
      // Update audit log with error
      this.securityManager.auditLog({
        timestamp: new Date(),
        userId: context?.userId,
        action: 'tool:execute',
        resource: `${serverId}:${toolName}`,
        details: { parameters },
        source: context?.source || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Get a resource from a specific MCP server
   */
  async getResource(
    serverId: string, 
    resourceUri: string,
    context?: SecurityContext
  ): Promise<unknown> {
    // Security check
    if (context && !this.securityManager.hasPermission(context, 'resource:read')) {
      throw new Error('Insufficient permissions to read resource');
    }

    return this.serverManager.getResource(serverId, resourceUri);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string, 
    variables?: Record<string, unknown>,
    context?: SecurityContext
  ): Promise<string> {
    // Security check
    if (context && !this.securityManager.hasPermission(context, 'workflow:execute')) {
      throw new Error('Insufficient permissions to execute workflow');
    }

    return this.workflowEngine.executeWorkflow(workflowId, variables);
  }

  /**
   * Get workflow execution status
   */
  getWorkflowExecution(executionId: string): WorkflowContext | undefined {
    return this.workflowEngine.getExecution(executionId);
  }

  /**
   * Get current configuration
   */
  getConfig(): ConductorConfig | null {
    return this.config;
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    running: boolean;
    servers: { [serverId: string]: string };
    workflows: { active: number; total: number };
    plugins: { [pluginId: string]: string };
  } {
    const servers: { [serverId: string]: string } = {};
    this.getServers().forEach(server => {
      servers[server.config.id] = server.status;
    });

    const plugins: { [pluginId: string]: string } = {};
    this.pluginManager.getPlugins().forEach(plugin => {
      plugins[plugin.metadata.id] = plugin.getStatus();
    });

    return {
      running: this.isRunning,
      servers,
      workflows: {
        active: this.workflowEngine.getActiveExecutions().length,
        total: this.config?.workflows?.length || 0
      },
      plugins
    };
  }

  /**
   * Setup event handlers for component coordination
   */
  private setupEventHandlers(): void {
    // Server events
    this.serverManager.on('server:started', (serverId: string) => {
      this.logger.info(`MCP server started: ${serverId}`);
      this.emit('server:started', serverId);
    });

    this.serverManager.on('server:stopped', (serverId: string) => {
      this.logger.info(`MCP server stopped: ${serverId}`);
      this.emit('server:stopped', serverId);
    });

    this.serverManager.on('server:error', (serverId: string, error: string) => {
      this.logger.error(`MCP server error: ${serverId} - ${error}`);
      this.emit('server:error', serverId, error);
    });

    // Workflow events
    this.workflowEngine.on('workflow:started', (workflowId: string, executionId: string) => {
      this.logger.info(`Workflow started: ${workflowId} (${executionId})`);
      this.emit('workflow:started', workflowId, executionId);
    });

    this.workflowEngine.on('workflow:completed', (workflowId: string, executionId: string) => {
      this.logger.info(`Workflow completed: ${workflowId} (${executionId})`);
      this.emit('workflow:completed', workflowId, executionId);
    });

    this.workflowEngine.on('workflow:failed', (workflowId: string, executionId: string, error: string) => {
      this.logger.error(`Workflow failed: ${workflowId} (${executionId}) - ${error}`);
      this.emit('workflow:failed', workflowId, executionId, error);
    });

    // Plugin events
    this.pluginManager.on('plugin:loaded', (pluginId: string) => {
      this.logger.info(`Plugin loaded: ${pluginId}`);
      this.emit('plugin:loaded', pluginId);
    });

    this.pluginManager.on('plugin:error', (pluginId: string, error: string) => {
      this.logger.error(`Plugin error: ${pluginId} - ${error}`);
      this.emit('plugin:error', pluginId, error);
    });
  }
}

