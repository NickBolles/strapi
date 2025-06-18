/**
 * MCP Server Manager
 * Handles lifecycle management of multiple MCP servers
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { Logger } from 'winston';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { 
  MCPServerConfig, 
  MCPServerInfo, 
  ConductorConfig 
} from './interfaces';
import { SecurityManager } from '@/security/auth-manager';
import { createLogger } from '@/utils/logger';

/**
 * Manages multiple MCP servers and their lifecycle
 */
export class MCPServerManager extends EventEmitter {
  private readonly logger: Logger;
  private readonly servers = new Map<string, MCPServerInfo>();
  private readonly clients = new Map<string, Client>();
  private readonly processes = new Map<string, ChildProcess>();
  private readonly healthCheckIntervals = new Map<string, NodeJS.Timeout>();
  
  private securityManager: SecurityManager | null = null;
  private config: ConductorConfig | null = null;

  constructor() {
    super();
    this.logger = createLogger('MCPServerManager');
  }

  /**
   * Initialize the server manager
   */
  async initialize(config: ConductorConfig, securityManager: SecurityManager): Promise<void> {
    this.config = config;
    this.securityManager = securityManager;

    // Initialize server info objects
    for (const serverConfig of config.servers) {
      if (!serverConfig.enabled) {
        continue;
      }

      const serverInfo: MCPServerInfo = {
        config: serverConfig,
        status: 'stopped',
        tools: [],
        resources: [],
        prompts: [],
        capabilities: {}
      };

      this.servers.set(serverConfig.id, serverInfo);
    }

    this.logger.info(`Initialized ${this.servers.size} MCP servers`);
  }

  /**
   * Start all configured MCP servers
   */
  async start(): Promise<void> {
    const startPromises = Array.from(this.servers.keys()).map(serverId => 
      this.startServer(serverId)
    );

    await Promise.allSettled(startPromises);
    this.logger.info('All MCP servers start attempts completed');
  }

  /**
   * Stop all MCP servers
   */
  async stop(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(serverId => 
      this.stopServer(serverId)
    );

    await Promise.allSettled(stopPromises);
    this.logger.info('All MCP servers stopped');
  }

  /**
   * Start a specific MCP server
   */
  async startServer(serverId: string): Promise<void> {
    const serverInfo = this.servers.get(serverId);
    if (!serverInfo) {
      throw new Error(`Server not found: ${serverId}`);
    }

    if (serverInfo.status === 'running') {
      this.logger.warn(`Server ${serverId} is already running`);
      return;
    }

    try {
      serverInfo.status = 'starting';
      this.logger.info(`Starting MCP server: ${serverId}`);

      await this.connectToServer(serverInfo);
      
      serverInfo.status = 'running';
      serverInfo.lastHealthCheck = new Date();
      
      // Start health checks if configured
      if (serverInfo.config.healthCheck?.enabled) {
        this.startHealthCheck(serverId);
      }

      this.emit('server:started', serverId);
      this.logger.info(`MCP server started successfully: ${serverId}`);
    } catch (error) {
      serverInfo.status = 'error';
      serverInfo.error = error instanceof Error ? error.message : String(error);
      
      this.emit('server:error', serverId, serverInfo.error);
      this.logger.error(`Failed to start MCP server ${serverId}:`, error);
      
      // Auto-restart if configured
      if (serverInfo.config.autoRestart) {
        this.logger.info(`Auto-restarting server ${serverId} in 5 seconds...`);
        setTimeout(() => this.startServer(serverId), 5000);
      }
    }
  }

  /**
   * Stop a specific MCP server
   */
  async stopServer(serverId: string): Promise<void> {
    const serverInfo = this.servers.get(serverId);
    if (!serverInfo) {
      throw new Error(`Server not found: ${serverId}`);
    }

    if (serverInfo.status === 'stopped') {
      return;
    }

    try {
      this.logger.info(`Stopping MCP server: ${serverId}`);

      // Stop health check
      const healthCheckInterval = this.healthCheckIntervals.get(serverId);
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        this.healthCheckIntervals.delete(serverId);
      }

      // Close client connection
      const client = this.clients.get(serverId);
      if (client) {
        await client.close();
        this.clients.delete(serverId);
      }

      // Kill process if it exists
      const process = this.processes.get(serverId);
      if (process && !process.killed) {
        process.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
        
        this.processes.delete(serverId);
      }

      serverInfo.status = 'stopped';
      serverInfo.pid = undefined;
      serverInfo.error = undefined;
      
      this.emit('server:stopped', serverId);
      this.logger.info(`MCP server stopped: ${serverId}`);
    } catch (error) {
      this.logger.error(`Error stopping MCP server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Connect to an MCP server based on its configuration
   */
  private async connectToServer(serverInfo: MCPServerInfo): Promise<void> {
    const { config } = serverInfo;

    switch (config.connection.type) {
      case 'stdio':
        await this.connectStdioServer(serverInfo);
        break;
      case 'http':
        await this.connectHttpServer(serverInfo);
        break;
      case 'websocket':
        await this.connectWebSocketServer(serverInfo);
        break;
      default:
        throw new Error(`Unsupported connection type: ${config.connection.type}`);
    }
  }

  /**
   * Connect to a stdio-based MCP server
   */
  private async connectStdioServer(serverInfo: MCPServerInfo): Promise<void> {
    const { config } = serverInfo;
    
    if (!config.connection.command) {
      throw new Error('Command is required for stdio connection');
    }

    // Prepare environment variables
    const env = {
      ...process.env,
      ...config.connection.env
    };

    // Add authentication environment variables
    if (config.auth && this.securityManager) {
      const credentials = await this.securityManager.getCredentials(config.id);
      Object.assign(env, credentials);
    }

    // Spawn the server process
    const process = spawn(config.connection.command, config.connection.args || [], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverInfo.pid = process.pid;
    this.processes.set(config.id, process);

    // Handle process events
    process.on('error', (error) => {
      this.logger.error(`Process error for server ${config.id}:`, error);
      serverInfo.status = 'error';
      serverInfo.error = error.message;
      this.emit('server:error', config.id, error.message);
    });

    process.on('exit', (code, signal) => {
      this.logger.info(`Server ${config.id} process exited with code ${code}, signal ${signal}`);
      serverInfo.status = 'stopped';
      this.processes.delete(config.id);
      this.emit('server:stopped', config.id);
    });

    // Create MCP client with stdio transport
    const transport = new StdioClientTransport({
      reader: process.stdout!,
      writer: process.stdin!
    });

    const client = new Client({
      name: `mcp-conductor-${config.id}`,
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });

    await client.connect(transport);
    this.clients.set(config.id, client);

    // Discover server capabilities
    await this.discoverCapabilities(serverInfo, client);
  }

  /**
   * Connect to an HTTP-based MCP server
   */
  private async connectHttpServer(serverInfo: MCPServerInfo): Promise<void> {
    // TODO: Implement HTTP MCP client
    throw new Error('HTTP MCP servers not yet implemented');
  }

  /**
   * Connect to a WebSocket-based MCP server
   */
  private async connectWebSocketServer(serverInfo: MCPServerInfo): Promise<void> {
    // TODO: Implement WebSocket MCP client
    throw new Error('WebSocket MCP servers not yet implemented');
  }

  /**
   * Discover capabilities of an MCP server
   */
  private async discoverCapabilities(serverInfo: MCPServerInfo, client: Client): Promise<void> {
    try {
      // List available tools
      const toolsResult = await client.listTools();
      serverInfo.tools = toolsResult.tools || [];

      // List available resources
      const resourcesResult = await client.listResources();
      serverInfo.resources = resourcesResult.resources || [];

      // List available prompts
      const promptsResult = await client.listPrompts();
      serverInfo.prompts = promptsResult.prompts || [];

      // Store capabilities
      serverInfo.capabilities = {
        tools: serverInfo.tools.length > 0,
        resources: serverInfo.resources.length > 0,
        prompts: serverInfo.prompts.length > 0
      };

      this.logger.info(`Discovered capabilities for ${serverInfo.config.id}: ${serverInfo.tools.length} tools, ${serverInfo.resources.length} resources, ${serverInfo.prompts.length} prompts`);
    } catch (error) {
      this.logger.warn(`Failed to discover capabilities for ${serverInfo.config.id}:`, error);
    }
  }

  /**
   * Start health check for a server
   */
  private startHealthCheck(serverId: string): void {
    const serverInfo = this.servers.get(serverId);
    if (!serverInfo?.config.healthCheck) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        await this.performHealthCheck(serverId);
      } catch (error) {
        this.logger.error(`Health check failed for ${serverId}:`, error);
      }
    }, serverInfo.config.healthCheck.interval * 1000);

    this.healthCheckIntervals.set(serverId, interval);
  }

  /**
   * Perform health check on a server
   */
  private async performHealthCheck(serverId: string): Promise<void> {
    const serverInfo = this.servers.get(serverId);
    const client = this.clients.get(serverId);
    
    if (!serverInfo || !client) {
      return;
    }

    try {
      // Simple ping to check if server is responsive
      await client.listTools();
      serverInfo.lastHealthCheck = new Date();
    } catch (error) {
      this.logger.warn(`Health check failed for ${serverId}:`, error);
      
      // Mark as error and potentially restart
      serverInfo.status = 'error';
      serverInfo.error = 'Health check failed';
      
      if (serverInfo.config.autoRestart) {
        this.logger.info(`Restarting unhealthy server: ${serverId}`);
        await this.stopServer(serverId);
        setTimeout(() => this.startServer(serverId), 1000);
      }
    }
  }

  /**
   * Execute a tool on a specific server
   */
  async executeTool(serverId: string, toolName: string, parameters: Record<string, unknown>): Promise<unknown> {
    const client = this.clients.get(serverId);
    const serverInfo = this.servers.get(serverId);

    if (!client || !serverInfo) {
      throw new Error(`Server not found or not connected: ${serverId}`);
    }

    if (serverInfo.status !== 'running') {
      throw new Error(`Server ${serverId} is not running (status: ${serverInfo.status})`);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: parameters
      });

      return result.content;
    } catch (error) {
      this.logger.error(`Tool execution failed on ${serverId}.${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Get a resource from a specific server
   */
  async getResource(serverId: string, resourceUri: string): Promise<unknown> {
    const client = this.clients.get(serverId);
    const serverInfo = this.servers.get(serverId);

    if (!client || !serverInfo) {
      throw new Error(`Server not found or not connected: ${serverId}`);
    }

    if (serverInfo.status !== 'running') {
      throw new Error(`Server ${serverId} is not running (status: ${serverInfo.status})`);
    }

    try {
      const result = await client.readResource({
        uri: resourceUri
      });

      return result.contents;
    } catch (error) {
      this.logger.error(`Resource read failed on ${serverId} for ${resourceUri}:`, error);
      throw error;
    }
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): MCPServerInfo | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all servers
   */
  getServers(): MCPServerInfo[] {
    return Array.from(this.servers.values());
  }

  /**
   * Restart a specific server
   */
  async restartServer(serverId: string): Promise<void> {
    await this.stopServer(serverId);
    await this.startServer(serverId);
  }
}

