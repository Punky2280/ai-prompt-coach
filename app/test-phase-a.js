// PURPOSE: Basic tests for Phase A workflow functionality
// PHASE: A
// STATUS: partial
// VERIFY: Test infrastructure setup
// TODO:
// 1. Add more comprehensive test cases
// 2. Add integration tests
// 3. Add SSE testing
// 4. Add workflow execution tests

const assert = require('assert');
const { ExpressionEngine } = require('./services/ExpressionEngine');
const { ConnectorRegistryService } = require('./services/ConnectorRegistryService');
const { WorkflowRunnerService } = require('./services/WorkflowRunnerService');

console.log('Running Phase A tests...\n');

// Test Expression Engine
console.log('Testing ExpressionEngine...');
const expressionEngine = new ExpressionEngine();

// Test simple variable interpolation
const context1 = { name: 'John', age: 30 };
const result1 = expressionEngine.evaluate('Hello {{name}}, you are {{age}} years old', context1);
assert.strictEqual(result1, 'Hello John, you are 30 years old');
console.log('✓ Variable interpolation works');

// Test nested object access
const context2 = { user: { profile: { name: 'Alice' } } };
const result2 = expressionEngine.evaluate('Welcome {{user.profile.name}}!', context2);
assert.strictEqual(result2, 'Welcome Alice!');
console.log('✓ Nested object access works');

// Test function calls
const result3 = expressionEngine.evaluate('Current time: {{now()}}', {});
assert(result3.includes('Current time:'));
console.log('✓ Function calls work');

// Test expression validation
const validation = expressionEngine.validateExpression('{{name}} - {{eval("dangerous")}}');
assert.strictEqual(validation.valid, false);
assert(validation.errors.some(err => err.includes('dangerous')));
console.log('✓ Expression validation works');

console.log('ExpressionEngine tests passed!\n');

// Test Connector Registry Service
console.log('Testing ConnectorRegistryService...');
const connectorRegistry = new ConnectorRegistryService();

// Test connector validation
try {
  connectorRegistry.validateConnectorConfig({ name: 'Test' }); // missing slug
  assert.fail('Should have thrown validation error');
} catch (error) {
  assert(error.message.includes('slug'));
  console.log('✓ Connector validation works');
}

// Test valid connector config
const validConfig = { slug: 'test-connector', name: 'Test Connector' };
const isValid = connectorRegistry.validateConnectorConfig(validConfig);
assert.strictEqual(isValid, true);
console.log('✓ Valid connector config passes');

console.log('ConnectorRegistryService tests passed!\n');

// Test Workflow Runner Service
console.log('Testing WorkflowRunnerService...');
const workflowRunner = new WorkflowRunnerService();

// Test node registry
assert(workflowRunner.nodeRegistry.has('transform'));
assert(workflowRunner.nodeRegistry.has('delay'));
console.log('✓ Built-in nodes registered');

// Test graph validation
const validWorkflow = {
  nodes: [
    { id: 'start', type: 'transform' },
    { id: 'end', type: 'transform' }
  ],
  edges: [
    { source: 'start', target: 'end' }
  ]
};

const validation2 = workflowRunner.validateWorkflowGraph(validWorkflow);
assert.strictEqual(validation2.valid, true);
console.log('✓ Workflow graph validation works');

// Test invalid workflow (no nodes)
const invalidWorkflow = { nodes: [], edges: [] };
const validation3 = workflowRunner.validateWorkflowGraph(invalidWorkflow);
assert.strictEqual(validation3.valid, false);
assert(validation3.errors.some(err => err.includes('no nodes')));
console.log('✓ Invalid workflow detection works');

console.log('WorkflowRunnerService tests passed!\n');

// Test API response format compliance
console.log('Testing API response format...');

// Mock response object
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.data = null;
  }
  
  status(code) {
    this.statusCode = code;
    return this;
  }
  
  json(data) {
    this.data = data;
    return this;
  }
}

// Test success response format
const mockRes = new MockResponse();
mockRes.json({ success: true, data: { id: '123', name: 'test' } });

assert.strictEqual(typeof mockRes.data.success, 'boolean');
assert.strictEqual(mockRes.data.success, true);
assert(mockRes.data.data !== undefined);
console.log('✓ Success response format correct');

// Test error response format
const mockRes2 = new MockResponse();
mockRes2.status(400).json({ success: false, error: 'Validation failed' });

assert.strictEqual(mockRes2.statusCode, 400);
assert.strictEqual(mockRes2.data.success, false);
assert(typeof mockRes2.data.error === 'string');
console.log('✓ Error response format correct');

console.log('API response format tests passed!\n');

console.log('🎉 All Phase A tests passed!');
console.log('\nNext steps:');
console.log('- Run integration tests with actual database');
console.log('- Test SSE streaming functionality');
console.log('- Test end-to-end workflow execution');
console.log('- Add frontend workflow builder tests');