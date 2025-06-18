# MCP Conductor Setup Guide

This guide will help you set up and configure MCP Conductor for your personal assistant needs.

## Prerequisites

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **npm or yarn**: Package manager (comes with Node.js)
- **MCP Servers**: For your desired integrations (Obsidian, Calendar, etc.)

## Installation

### Option 1: From Source (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/your-org/mcp-conductor.git
cd mcp-conductor

# Install dependencies
npm install

# Build the project
npm run build

# Create configuration
npm run init
```

### Option 2: Global Installation (Coming Soon)

```bash
# Install globally from npm
npm install -g mcp-conductor

# Create configuration
mcp-conductor init
```

## Configuration

### 1. Create Configuration File

```bash
# Generate example configuration
mcp-conductor init

# This creates config/conductor.yaml
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Required: Encryption key for credentials (32+ characters)
ENCRYPTION_KEY=your-very-secure-32-character-key-here

# Optional: Custom paths
CONFIG_PATH=./config/conductor.yaml
DATA_DIR=./data
LOG_DIR=./logs

# Optional: Web interface
WEB_PORT=3000
WEB_HOST=localhost
```

### 3. Configure MCP Servers

Edit `config/conductor.yaml` to configure your integrations:

#### Obsidian Integration

```yaml
servers:
  - id: obsidian
    name: Obsidian Notes
    type: obsidian
    connection:
      type: stdio
      command: npx
      args: ["@obsidian/mcp-server"]
      env:
        OBSIDIAN_VAULT_PATH: "/path/to/your/obsidian/vault"
    enabled: true
    autoRestart: true
```

#### Google Calendar Integration

```yaml
  - id: calendar
    name: Google Calendar
    type: calendar
    connection:
      type: stdio
      command: npx
      args: ["@google/calendar-mcp-server"]
    auth:
      type: oauth
      credentials:
        client_id: "your-google-client-id"
        client_secret: "your-google-client-secret"
    enabled: true
```

#### Todoist Integration

```yaml
  - id: todoist
    name: Todoist Tasks
    type: todoist
    connection:
      type: stdio
      command: npx
      args: ["@todoist/mcp-server"]
    auth:
      type: api_key
      credentials:
        api_token: "your-todoist-api-token"
    enabled: true
```

## Setting Up Integrations

### Obsidian

1. **Install Obsidian MCP Server**:
   ```bash
   npm install -g @obsidian/mcp-server
   ```

2. **Configure vault path** in your configuration file

3. **Ensure Obsidian vault is accessible** to the MCP Conductor process

### Google Calendar

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google Calendar API

2. **Create OAuth Credentials**:
   - Go to Credentials → Create Credentials → OAuth client ID
   - Choose "Desktop application"
   - Download credentials JSON

3. **Install Calendar MCP Server**:
   ```bash
   npm install -g @google/calendar-mcp-server
   ```

4. **Configure credentials** in your configuration file

### Todoist

1. **Get API Token**:
   - Go to Todoist Settings → Integrations
   - Copy your API token

2. **Install Todoist MCP Server**:
   ```bash
   npm install -g @todoist/mcp-server
   ```

3. **Configure API token** in your configuration file

### Home Assistant

1. **Get Long-Lived Access Token**:
   - Go to Home Assistant → Profile → Long-Lived Access Tokens
   - Create new token

2. **Install Home Assistant MCP Server**:
   ```bash
   npm install -g @homeassistant/mcp-server
   ```

3. **Configure base URL and token** in your configuration file

## Validation

Validate your configuration:

```bash
# Check configuration syntax and settings
mcp-conductor validate

# List configured servers
mcp-conductor servers
```

## Starting MCP Conductor

### Development Mode

```bash
# Start with auto-reload
npm run dev
```

### Production Mode

```bash
# Build and start
npm run build
npm start

# Or using the CLI
mcp-conductor start
```

### Background/Daemon Mode

```bash
# Start as daemon (Linux/macOS)
mcp-conductor start --daemon

# Or using process managers
pm2 start "mcp-conductor start" --name mcp-conductor
```

## Verification

1. **Check logs** for any errors:
   ```bash
   tail -f logs/conductor.log
   ```

2. **Access web interface** (if enabled):
   ```
   http://localhost:3000
   ```

3. **Test server connections**:
   ```bash
   mcp-conductor status
   ```

## Troubleshooting

### Common Issues

1. **MCP Server Not Found**:
   - Ensure the MCP server package is installed globally
   - Check the command path in configuration

2. **Authentication Errors**:
   - Verify API keys and tokens are correct
   - Check credential format in configuration

3. **Permission Errors**:
   - Ensure MCP Conductor has access to required files/directories
   - Check file permissions for vault paths, data directory

4. **Port Already in Use**:
   - Change the web interface port in configuration
   - Check for other services using the same port

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug mcp-conductor start
```

### Getting Help

- Check the [troubleshooting guide](troubleshooting.md)
- Review [configuration examples](configuration.md)
- Open an issue on [GitHub](https://github.com/your-org/mcp-conductor/issues)

## Next Steps

- [Configure workflows](workflows.md) for automation
- [Set up the web interface](web-interface.md)
- [Explore plugin development](plugins.md)
- [Deploy to production](deployment.md)

