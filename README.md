# MCP Conductor 🎼

A self-hosted personal assistant that orchestrates multiple Model Context Protocol (MCP) servers to create a unified, intelligent automation platform.

## 🌟 Features

- **Multi-Service Integration**: Connect Obsidian, Google Calendar, Todoist, Notion, Home Assistant, and more through MCP
- **Declarative Configuration**: Define your integrations and workflows in simple YAML/JSON
- **Cross-Service Workflows**: Create powerful automations that span multiple services
- **Plugin Architecture**: Easily extend functionality with custom plugins
- **Self-Hosted & Secure**: Keep your data private with local deployment
- **Web Dashboard**: Monitor and manage your assistant through a clean web interface
- **TypeScript First**: Built with type safety and modern development practices

## 🏗️ Architecture

MCP Conductor acts as an orchestration layer that manages multiple MCP servers:

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Conductor Core                        │
├─────────────────────────────────────────────────────────────┤
│  🎯 Orchestration Engine  │  ⚙️ Configuration Engine        │
│  🔐 Security Manager      │  🔌 Plugin Registry             │
│  📊 MCP Server Manager    │  🌐 Web Interface               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │Obsidian │          │Calendar │          │Todoist  │
   │MCP      │          │MCP      │          │MCP      │
   │Server   │          │Server   │          │Server   │
   └─────────┘          └─────────┘          └─────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MCP servers for your desired integrations

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/mcp-conductor.git
   cd mcp-conductor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create configuration**
   ```bash
   cp config/example.yaml config/conductor.yaml
   # Edit config/conductor.yaml with your settings
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the conductor**
   ```bash
   npm start
   ```

### Configuration Example

```yaml
general:
  logLevel: info
  dataDir: ./data
  web:
    enabled: true
    port: 3000
    host: localhost

servers:
  - id: obsidian
    name: Obsidian Notes
    type: obsidian
    connection:
      type: stdio
      command: npx
      args: ["@obsidian/mcp-server"]
      env:
        OBSIDIAN_VAULT_PATH: "/path/to/your/vault"
    enabled: true
    autoRestart: true

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
        client_id: "your-client-id"
        client_secret: "your-client-secret"
    enabled: true

workflows:
  - id: daily-planning
    name: Daily Planning Workflow
    trigger:
      type: schedule
      config:
        cron: "0 9 * * *"  # Every day at 9 AM
    steps:
      - id: create-daily-note
        name: Create Daily Note
        serverId: obsidian
        tool: create_note
        parameters:
          title: "Daily Note - {{date}}"
          content: "# Daily Note for {{date}}\\n\\n## Tasks\\n\\n## Notes\\n\\n"
    enabled: true
```

## 📚 Documentation

- [Configuration Guide](docs/configuration.md)
- [Workflow Creation](docs/workflows.md)
- [Plugin Development](docs/plugins.md)
- [API Reference](docs/api-reference.md)
- [Deployment Guide](docs/deployment.md)

## 🔌 Supported Integrations

### Available MCP Servers
- **Obsidian**: Note management and knowledge base
- **Google Calendar**: Event scheduling and management
- **Todoist**: Task and project management
- **Notion**: Database and content management
- **Home Assistant**: Smart home automation
- **Linear**: Issue and project tracking

### Coming Soon
- **GitHub**: Repository and issue management
- **Slack**: Team communication
- **Trello**: Board and card management
- **Spotify**: Music control and playlists

## 🛠️ Development

### Setup Development Environment

```bash
# Clone and install
git clone https://github.com/your-org/mcp-conductor.git
cd mcp-conductor
npm install

# Start in development mode
npm run dev

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Project Structure

```
src/
├── core/           # Core orchestration logic
├── mcp/            # MCP client implementations
├── config/         # Configuration management
├── security/       # Authentication and security
├── orchestration/  # Workflow engine
├── plugins/        # Plugin system
├── web/            # Web interface
├── cli/            # Command-line interface
└── utils/          # Shared utilities
```

## 🔒 Security

- **Encrypted Credentials**: All API keys and tokens are encrypted at rest
- **Audit Logging**: Complete audit trail of all operations
- **Permission System**: Fine-grained access control
- **Secure Communication**: All MCP connections use secure protocols

## 🐳 Deployment

### Docker

```bash
# Build image
docker build -t mcp-conductor .

# Run container
docker run -d \\
  --name mcp-conductor \\
  -p 3000:3000 \\
  -v ./config:/app/config \\
  -v ./data:/app/data \\
  mcp-conductor
```

### Docker Compose

```yaml
version: '3.8'
services:
  mcp-conductor:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- The amazing MCP community and server developers
- All contributors and users of MCP Conductor

## 📞 Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/your-org/mcp-conductor/issues)
- 💬 [Discussions](https://github.com/your-org/mcp-conductor/discussions)
- 📧 [Email Support](mailto:support@mcp-conductor.dev)

---

**MCP Conductor** - Orchestrating your digital life, one protocol at a time. 🎼✨

