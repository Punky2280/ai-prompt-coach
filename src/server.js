// PURPOSE: Main application server for Cartrita workflow automation platform
// PHASE: B
// STATUS: complete
// VERIFY: Database connection and environment configuration

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { EventEmitter } = require('events');

// Import our services
const { WorkflowExecutionEngine } = require('./services/WorkflowExecutionEngine');
const { ExpressionEngine } = require('./services/ExpressionEngine');
const { ConnectorRegistryService } = require('./services/ConnectorRegistryService');
const { createWorkflowRoutes } = require('./routes/workflows');

/**
 * Cartrita Workflow Automation Platform - Main Server
 * Phase B: Parallelism, branching, retries, loops, subworkflows, dry runs
 */
class CartritaServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.eventBus = new EventEmitter();
    this.services = new Map();
    
    // Configuration
    this.config = {
      port: process.env.PORT || 3000,
      host: process.env.HOST || '0.0.0.0',
      nodeEnv: process.env.NODE_ENV || 'development',
      dbUrl: process.env.DATABASE_URL,
      logLevel: process.env.LOG_LEVEL || 'info'
    };

    // Logger setup
    this.logger = this._createLogger();
    
    this._initializeApp();
  }

  /**
   * Initialize Express application and services
   */
  _initializeApp() {
    // Basic middleware
    this.app.use(cors({ 
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => this.logger.info(message.trim()) }
    }));

    // Initialize services
    this._initializeServices();
    
    // Setup routes
    this._setupRoutes();
    
    // Error handling
    this._setupErrorHandling();
  }

  /**
   * Initialize core services
   */
  _initializeServices() {
    try {
      // Mock database connection for now
      const mockDb = {
        query: async (sql, params) => ({ rows: [], rowCount: 0 }),
        transaction: async (callback) => callback(mockDb)
      };

      // Expression Engine
      const expressionEngine = new ExpressionEngine();
      this.services.set('expressionEngine', expressionEngine);

      // Connector Registry
      const connectorRegistry = new ConnectorRegistryService({
        db: mockDb,
        logger: this.logger,
        expressionEngine
      });
      this.services.set('connectorRegistry', connectorRegistry);

      // Workflow Execution Engine
      const workflowEngine = new WorkflowExecutionEngine({
        db: mockDb,
        connectorRegistry,
        expressionEngine,
        logger: this.logger
      });
      this.services.set('workflowEngine', workflowEngine);

      // Setup event forwarding for monitoring
      this._setupEventForwarding(workflowEngine);

      this.logger.info('Services initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize services', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup API routes
   */
  _setupRoutes() {
    // Health check
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        data: {
          name: 'Cartrita Unified Workflow Automation Platform',
          version: '1.0.0',
          phase: 'B',
          status: 'running',
          timestamp: new Date().toISOString(),
          features: [
            'parallelism',
            'branching', 
            'retries',
            'loops',
            'subworkflows',
            'dry-runs'
          ]
        }
      });
    });

    // Workflow API routes
    this.app.use('/api/v1/workflows', createWorkflowRoutes({
      workflowEngine: this.services.get('workflowEngine'),
      connectorRegistry: this.services.get('connectorRegistry'),
      logger: this.logger
    }));

    // Legacy AI prompt routes (keep existing functionality)
    if (process.env.LEGACY_MODE === 'true') {
      try {
        const promptRoutes = require('../app/routes/prompts');
        const historyRoutes = require('../app/routes/history');
        this.app.use('/api/prompts', promptRoutes);
        this.app.use('/api/history', historyRoutes);
        this.logger.info('Legacy AI prompt routes enabled');
      } catch (error) {
        this.logger.warn('Legacy routes not available', { error: error.message });
      }
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  /**
   * Setup event forwarding for monitoring
   */
  _setupEventForwarding(workflowEngine) {
    // Forward workflow events to event bus
    const eventsToForward = [
      'run_started',
      'run_completed', 
      'run_failed',
      'step_started',
      'step_completed',
      'step_error',
      'step_log'
    ];

    eventsToForward.forEach(eventName => {
      workflowEngine.on(eventName, (data) => {
        this.eventBus.emit(eventName, data);
        this.logger.info(`Workflow event: ${eventName}`, data);
      });
    });

    // Example: Setup SSE endpoint for real-time monitoring
    this.app.get('/api/v1/events/stream', (req, res) => {
      // Setup Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const sendEvent = (eventType, data) => {
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Send initial connection event
      sendEvent('connected', { timestamp: new Date().toISOString() });

      // Forward workflow events
      const eventHandler = (data) => {
        sendEvent('workflow', data);
      };

      eventsToForward.forEach(eventName => {
        this.eventBus.on(eventName, eventHandler);
      });

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        sendEvent('heartbeat', { timestamp: new Date().toISOString() });
      }, 30000);

      // Cleanup on client disconnect
      req.on('close', () => {
        clearInterval(heartbeat);
        eventsToForward.forEach(eventName => {
          this.eventBus.removeListener(eventName, eventHandler);
        });
      });
    });
  }

  /**
   * Setup error handling
   */
  _setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      this.logger.error('Unhandled error', { 
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this._gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { reason, promise });
      this._gracefulShutdown('unhandledRejection');
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => this._gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this._gracefulShutdown('SIGINT'));
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await new Promise((resolve, reject) => {
        this.server = this.app.listen(this.config.port, this.config.host, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.logger.info('Cartrita server started successfully', {
        host: this.config.host,
        port: this.config.port,
        nodeEnv: this.config.nodeEnv,
        phase: 'B'
      });

      return {
        success: true,
        data: {
          host: this.config.host,
          port: this.config.port,
          url: `http://${this.config.host}:${this.config.port}`
        }
      };

    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the server gracefully
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
      this.logger.info('Server stopped gracefully');
    }
  }

  /**
   * Graceful shutdown handler
   */
  async _gracefulShutdown(signal) {
    this.logger.info(`Received ${signal}, shutting down gracefully`);
    
    try {
      // Stop accepting new requests
      await this.stop();
      
      // Give running workflows time to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      this.logger.info('Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Create logger instance
   */
  _createLogger() {
    return {
      info: (message, meta = {}) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
      },
      error: (message, meta = {}) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta);
      },
      warn: (message, meta = {}) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
      },
      debug: (message, meta = {}) => {
        if (this.config.logLevel === 'debug') {
          console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
        }
      }
    };
  }
}

// Create and start server if this file is run directly
if (require.main === module) {
  const server = new CartritaServer();
  
  server.start()
    .then((result) => {
      console.log('✅ Cartrita Workflow Automation Platform is running');
      console.log(`🌐 Server URL: ${result.data.url}`);
      console.log(`📊 API Documentation: ${result.data.url}/api/v1/health`);
      console.log(`📡 Event Stream: ${result.data.url}/api/v1/events/stream`);
    })
    .catch((error) => {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    });
}

module.exports = { CartritaServer };