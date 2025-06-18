/**
 * Unit tests for ConfigLoader
 */

import { ConfigLoader } from '@/config/config-loader';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  const testConfigDir = join(__dirname, '../fixtures');
  const testConfigPath = join(testConfigDir, 'test-config.yaml');

  beforeEach(() => {
    configLoader = new ConfigLoader();
    
    // Ensure test directory exists
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('load', () => {
    it('should load valid YAML configuration', async () => {
      const testConfig = `
general:
  logLevel: info
  dataDir: ./data
servers:
  - id: test-server
    name: Test Server
    type: test
    connection:
      type: stdio
      command: echo
    enabled: true
`;

      writeFileSync(testConfigPath, testConfig);

      const config = await configLoader.load(testConfigPath);

      expect(config).toBeDefined();
      expect(config.general.logLevel).toBe('info');
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0]?.id).toBe('test-server');
    });

    it('should load valid JSON configuration', async () => {
      const jsonConfigPath = join(testConfigDir, 'test-config.json');
      const testConfig = {
        general: {
          logLevel: 'info',
          dataDir: './data'
        },
        servers: [
          {
            id: 'test-server',
            name: 'Test Server',
            type: 'test',
            connection: {
              type: 'stdio',
              command: 'echo'
            },
            enabled: true
          }
        ]
      };

      writeFileSync(jsonConfigPath, JSON.stringify(testConfig, null, 2));

      const config = await configLoader.load(jsonConfigPath);

      expect(config).toBeDefined();
      expect(config.general.logLevel).toBe('info');
      expect(config.servers).toHaveLength(1);

      // Clean up
      unlinkSync(jsonConfigPath);
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig = `
general:
  logLevel: invalid-level
servers: []
`;

      writeFileSync(testConfigPath, invalidConfig);

      await expect(configLoader.load(testConfigPath)).rejects.toThrow();
    });

    it('should throw error for duplicate server IDs', async () => {
      const duplicateConfig = `
general:
  logLevel: info
  dataDir: ./data
servers:
  - id: duplicate
    name: Server 1
    type: test
    connection:
      type: stdio
      command: echo
    enabled: true
  - id: duplicate
    name: Server 2
    type: test
    connection:
      type: stdio
      command: echo
    enabled: true
`;

      writeFileSync(testConfigPath, duplicateConfig);

      await expect(configLoader.load(testConfigPath)).rejects.toThrow('Duplicate server ID');
    });

    it('should use default configuration when file not found', async () => {
      const config = await configLoader.load('/non/existent/path.yaml');

      expect(config).toBeDefined();
      expect(config.general).toBeDefined();
      expect(config.servers).toBeDefined();
    });
  });
});

