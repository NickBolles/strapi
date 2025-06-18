# MCP Conductor Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S conductor -u 1001

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY bin/ ./bin/

# Create necessary directories
RUN mkdir -p data logs && \
    chown -R conductor:nodejs /app

# Switch to non-root user
USER conductor

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["node", "dist/index.js"]

# Labels
LABEL org.opencontainers.image.title="MCP Conductor"
LABEL org.opencontainers.image.description="Self-hosted personal assistant orchestrating multiple MCP servers"
LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.authors="MCP Conductor Team"
LABEL org.opencontainers.image.source="https://github.com/your-org/mcp-conductor"
LABEL org.opencontainers.image.licenses="MIT"

