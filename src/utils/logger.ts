/**
 * Logging utility for MCP Conductor
 * Provides structured logging with different levels and formats
 */

import winston from 'winston';
import path from 'path';

/**
 * Create a logger instance with the specified name
 */
export function createLogger(name: string): winston.Logger {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const logDir = process.env.LOG_DIR || './logs';

  // Custom format for console output
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${name}] ${level}: ${message} ${metaStr}`;
    })
  );

  // Custom format for file output
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Create transports
  const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
      level: logLevel,
      format: consoleFormat
    })
  ];

  // Add file transports if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    transports.push(
      // General log file
      new winston.transports.File({
        filename: path.join(logDir, 'conductor.log'),
        level: logLevel,
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      }),
      
      // Error log file
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
    // Handle uncaught exceptions
    exceptionHandlers: process.env.NODE_ENV !== 'test' ? [
      new winston.transports.File({
        filename: path.join(logDir, 'exceptions.log'),
        format: fileFormat
      })
    ] : [],
    // Handle unhandled promise rejections
    rejectionHandlers: process.env.NODE_ENV !== 'test' ? [
      new winston.transports.File({
        filename: path.join(logDir, 'rejections.log'),
        format: fileFormat
      })
    ] : []
  });
}

/**
 * Default logger instance
 */
export const logger = createLogger('MCP-Conductor');

/**
 * Log levels for reference
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
} as const;

/**
 * Utility function to log performance metrics
 */
export function logPerformance(
  logger: winston.Logger,
  operation: string,
  startTime: number,
  metadata?: Record<string, unknown>
): void {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation} completed in ${duration}ms`, {
    operation,
    duration,
    ...metadata
  });
}

/**
 * Utility function to create a child logger with additional context
 */
export function createChildLogger(
  parentLogger: winston.Logger,
  context: Record<string, unknown>
): winston.Logger {
  return parentLogger.child(context);
}

/**
 * Utility function to safely stringify objects for logging
 */
export function safeStringify(obj: unknown, maxDepth = 3): string {
  const seen = new WeakSet();
  
  function replacer(key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    
    // Hide sensitive information
    if (typeof key === 'string' && /password|secret|token|key|auth/i.test(key)) {
      return '[REDACTED]';
    }
    
    return value;
  }
  
  try {
    return JSON.stringify(obj, replacer, 2);
  } catch (error) {
    return `[Stringify Error: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Middleware for Express to log HTTP requests
 */
export function createHttpLogger(logger: winston.Logger) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Log request
    logger.http(`${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.http(`${req.method} ${req.url} - ${res.statusCode}`, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('Content-Length')
      });
    });
    
    next();
  };
}

