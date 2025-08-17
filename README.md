# Cartrita Unified Workflow Automation Platform

A modern workflow automation platform implementing Phase B capabilities including parallelism, branching, retries, loops, subworkflows, and dry runs.

## 🚀 Phase B Features Implemented

- ✅ **Parallelism**: Execute multiple workflow branches concurrently
- ✅ **Branching**: Conditional execution paths based on expression evaluation  
- ✅ **Retries**: Exponential backoff retry logic for failed nodes
- ✅ **Loops**: Support for `while` and `forEach` loop constructs
- ✅ **Subworkflows**: Nested workflow execution with depth limits
- ✅ **Dry Runs**: Test workflow execution without side effects

## 🏗️ Architecture

### Core Services

#### WorkflowExecutionEngine
- Main execution orchestrator
- Dependency graph resolution
- Parallel node execution management
- Event emission for monitoring

#### ExpressionEngine  
- Safe JavaScript expression evaluation
- Template interpolation with `{{variables}}` and `${expressions}`
- Security validation to prevent code injection
- Built-in utility functions (Math, String, Array operations)

#### ConnectorRegistryService
- Dynamic connector loading and management
- Action execution through connector handlers
- Built-in connectors: HTTP, Transform, Condition, Utility

### Database Schema

Complete PostgreSQL schema supporting:
- Workflows and versions
- Execution runs and node tracking
- Detailed logging and tracing
- Connector registry with versioning

## 🛠️ Installation & Usage

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server  
npm start

# Run test suite
npm test

# Enable legacy AI prompt mode
npm run legacy
```

## 📡 API Endpoints

### Core Workflow Operations

```bash
# Execute workflow
POST /api/v1/workflows/execute
{
  "workflowId": "my-workflow",
  "inputData": {...},
  "dryRun": false
}

# Test workflow (dry run)
POST /api/v1/workflows/:id/test
{
  "inputData": {...}
}

# Get execution history
GET /api/v1/workflows/:id/runs?page=1&limit=20

# Get run details
GET /api/v1/workflows/runs/:runId
```

### Connector Management

```bash
# List available connectors
GET /api/v1/workflows/connectors

# Get connector details
GET /api/v1/workflows/connectors/:slug

# Register new connector
POST /api/v1/workflows/connectors
{
  "slug": "my-connector",
  "name": "My Connector", 
  "definition": {...}
}
```

### Monitoring

```bash
# Health check
GET /api/v1/workflows/health

# Real-time event stream (SSE)
GET /api/v1/events/stream
```

## 🔧 Configuration

Environment variables:

```bash
# Server configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...

# Execution limits
MAX_PARALLEL_NODES=10
MAX_RETRY_ATTEMPTS=3
MAX_SUBWORKFLOW_DEPTH=5

# Security
CORS_ORIGIN=*
LOG_LEVEL=info

# Legacy mode
LEGACY_MODE=true
```

## 🧪 Testing

Comprehensive test suite covering:

- Expression engine safety and functionality
- Connector registry operations  
- Workflow execution engine capabilities
- Integration scenarios
- Security validation

```bash
npm test
```

## 📊 Workflow Definition Example

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "trigger",
      "config": {}
    },
    {
      "id": "branch",
      "type": "branch", 
      "config": {
        "condition": "${input.type === 'premium'}",
        "trueBranch": {...},
        "falseBranch": {...}
      }
    },
    {
      "id": "loop",
      "type": "loop",
      "config": {
        "loopType": "forEach",
        "condition": "${input.items}",
        "maxIterations": 100,
        "loopBody": {...}
      }
    },
    {
      "id": "parallel",
      "type": "parallel",
      "config": {
        "branches": [
          {...},
          {...}
        ]
      }
    },
    {
      "id": "http",
      "type": "http.request",
      "config": {
        "url": "https://api.example.com/users",
        "method": "POST",
        "body": "${JSON.stringify(userData)}"
      }
    }
  ],
  "connections": [
    {"source": "start", "target": "branch"},
    {"source": "branch", "target": "loop"},
    {"source": "loop", "target": "parallel"},
    {"source": "parallel", "target": "http"}
  ]
}
```

## 🔒 Security Features

- Expression sandboxing with whitelisted functions
- Input validation and sanitization
- Protection against code injection attacks
- Configurable execution limits and timeouts
- Structured logging with sensitive data redaction

## 📈 Performance & Monitoring

- Real-time execution monitoring via SSE
- Detailed step-by-step logging
- Performance metrics and tracing
- Configurable concurrency limits
- Exponential backoff retry strategies

## 🎯 Future Roadmap

Phase B provides the foundation for:

- **Phase C**: RAG (Retrieval Augmented Generation) capabilities
- **Phase D**: MCP (Model Context Protocol) integration  
- **Phase E**: Advanced governance and policy engines
- **Phase F**: Marketplace and performance optimizations

## 🤝 Contributing

This implementation follows the master prompt specifications for additive-only, spec-first development. All changes should maintain backward compatibility and include comprehensive testing.

## 📄 License

[License details to be determined]

---

**Status**: Phase B Complete ✅  
**Next Phase**: C (RAG Integration)  
**Last Updated**: 2025-08-17
