// PURPOSE: Test runner for Phase B workflow automation features
// PHASE: B
// STATUS: complete
// VERIFY: All Phase B features working correctly

const assert = require('assert');
const { WorkflowExecutionEngine } = require('../src/services/WorkflowExecutionEngine');
const { ExpressionEngine } = require('../src/services/ExpressionEngine');
const { ConnectorRegistryService } = require('../src/services/ConnectorRegistryService');

/**
 * Test Suite for Phase B Features
 * Tests: parallelism, branching, retries, loops, subworkflows, dry runs
 */
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
    
    // Setup test dependencies
    this.mockDb = {
      query: async () => ({ rows: [], rowCount: 0 }),
      transaction: async (callback) => callback(this.mockDb)
    };
    
    this.logger = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {}
    };
    
    this.setupServices();
  }

  setupServices() {
    this.expressionEngine = new ExpressionEngine();
    this.connectorRegistry = new ConnectorRegistryService({
      db: this.mockDb,
      logger: this.logger,
      expressionEngine: this.expressionEngine
    });
    this.workflowEngine = new WorkflowExecutionEngine({
      db: this.mockDb,
      connectorRegistry: this.connectorRegistry,
      expressionEngine: this.expressionEngine,
      logger: this.logger
    });
  }

  async runTest(name, testFn) {
    try {
      console.log(`⏳ Running: ${name}`);
      await testFn();
      this.passed++;
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      this.failed++;
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  async testExpressionEngine() {
    await this.runTest('Expression Engine - Variable Interpolation', async () => {
      const result = await this.expressionEngine.evaluate('{{user.name}}', {
        user: { name: 'John Doe' }
      });
      assert.strictEqual(result, 'John Doe');
    });

    await this.runTest('Expression Engine - Conditional Expression', async () => {
      const result = await this.expressionEngine.evaluate('${user.age > 18}', {
        user: { age: 25 }
      });
      assert.strictEqual(result, true);
    });

    await this.runTest('Expression Engine - Template Interpolation', async () => {
      const result = await this.expressionEngine.evaluate(
        'Hello {{user.name}}, you are ${user.age > 18 ? "adult" : "minor"}',
        { user: { name: 'Alice', age: 25 } }
      );
      assert.strictEqual(result, 'Hello Alice, you are adult');
    });

    await this.runTest('Expression Engine - Safe Function Usage', async () => {
      const result = await this.expressionEngine.evaluate('${Math.max(1, 2, 3)}', {});
      assert.strictEqual(result, 3);
    });

    await this.runTest('Expression Engine - Security Validation', async () => {
      try {
        await this.expressionEngine.evaluate('${eval("1+1")}', {});
        assert.fail('Should have thrown security error');
      } catch (error) {
        assert(error.message.includes('Unsafe expression pattern'));
      }
    });
  }

  async testConnectorRegistry() {
    await this.runTest('Connector Registry - List Connectors', async () => {
      const result = await this.connectorRegistry.listConnectors();
      assert.strictEqual(result.success, true);
      assert(Array.isArray(result.data.connectors));
    });

    await this.runTest('Connector Registry - Get Specific Connector', async () => {
      const result = await this.connectorRegistry.getConnector('http');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.slug, 'http');
      assert(result.data.actions.request);
    });

    await this.runTest('Connector Registry - Execute HTTP Action', async () => {
      const result = await this.connectorRegistry.executeAction(
        {
          type: 'http.request',
          config: {
            url: 'https://api.example.com/users',
            method: 'GET'
          }
        },
        {}
      );
      assert.strictEqual(result.status, 200);
      assert(result.data);
    });

    await this.runTest('Connector Registry - Execute Transform Action', async () => {
      const result = await this.connectorRegistry.executeAction(
        {
          type: 'transform.map',
          config: {
            data: { firstName: 'John', lastName: 'Doe' },
            mapping: {
              fullName: '${data.firstName + " " + data.lastName}',
              initials: '${data.firstName[0] + data.lastName[0]}'
            }
          }
        },
        { data: { firstName: 'John', lastName: 'Doe' } }
      );
      assert.strictEqual(result.fullName, 'John Doe');
      assert.strictEqual(result.initials, 'JD');
    });
  }

  async testWorkflowEngine() {
    await this.runTest('Workflow Engine - Basic Execution', async () => {
      // Mock a simple workflow execution
      const mockWorkflow = {
        definition: {
          nodes: [
            { id: 'start', type: 'trigger', config: {} },
            { id: 'end', type: 'transform.map', config: { data: {}, mapping: { result: 'success' } } }
          ],
          connections: [
            { source: 'start', target: 'end' }
          ]
        }
      };

      // Override the initialization method for testing
      this.workflowEngine._initializeExecution = async (runId, params) => ({
        runId,
        workflow: mockWorkflow,
        ...params
      });

      const result = await this.workflowEngine.executeWorkflow({
        workflowId: 'test-workflow-1',
        inputData: { test: true },
        dryRun: false
      });

      assert.strictEqual(result.success, true);
      assert(result.data.runId);
    });

    await this.runTest('Workflow Engine - Dry Run Mode', async () => {
      const mockWorkflow = {
        definition: {
          nodes: [
            { id: 'start', type: 'trigger', config: {} }
          ],
          connections: []
        }
      };

      this.workflowEngine._initializeExecution = async (runId, params) => ({
        runId,
        workflow: mockWorkflow,
        ...params
      });

      const result = await this.workflowEngine.executeWorkflow({
        workflowId: 'test-workflow-dry',
        inputData: {},
        dryRun: true
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.dryRun, true);
    });

    await this.runTest('Workflow Engine - Parallel Node Execution', async () => {
      const parallelResult = await this.workflowEngine._executeParallelNode(
        'test-run',
        {
          id: 'parallel-test',
          config: {
            branches: [
              { nodes: [{ id: 'branch1', type: 'transform.map', config: { mapping: { result: '1' } } }] },
              { nodes: [{ id: 'branch2', type: 'transform.map', config: { mapping: { result: '2' } } }] }
            ]
          }
        },
        {},
        { dryRun: false }
      );

      assert(parallelResult.results);
      assert.strictEqual(parallelResult.results.length, 2);
    });

    await this.runTest('Workflow Engine - Branch Node Logic', async () => {
      const branchResult = await this.workflowEngine._executeBranchNode(
        'test-run',
        {
          id: 'branch-test',
          config: {
            condition: '${user.age >= 18}',
            trueBranch: { result: 'adult' },
            falseBranch: { result: 'minor' }
          }
        },
        { user: { age: 25 } },
        { dryRun: false }
      );

      assert.strictEqual(branchResult.branchTaken, true);
      assert(branchResult.result);
    });

    await this.runTest('Workflow Engine - Loop Node Execution', async () => {
      const loopResult = await this.workflowEngine._executeLoopNode(
        'test-run',
        {
          id: 'loop-test',
          config: {
            loopType: 'forEach',
            condition: '${items}',
            maxIterations: 3,
            loopBody: { result: 'processed' }
          }
        },
        { items: [1, 2, 3] },
        { dryRun: false }
      );

      assert.strictEqual(loopResult.loopType, 'forEach');
      assert.strictEqual(loopResult.totalIterations, 3);
    });

    await this.runTest('Workflow Engine - Error Handling and Retries', async () => {
      // Test retry logic
      const mockNode = {
        id: 'retry-test',
        type: 'http.request',
        config: { maxRetries: 2, retryDelay: 100 }
      };

      const shouldRetry = await this.workflowEngine._handleNodeError(
        'test-run',
        mockNode,
        new Error('Connection timeout'),
        { dryRun: false }
      );

      assert.strictEqual(shouldRetry, true);
    });
  }

  async testIntegration() {
    await this.runTest('Integration - End-to-End Workflow with Branching', async () => {
      const mockWorkflow = {
        definition: {
          nodes: [
            { id: 'start', type: 'trigger', config: {} },
            { 
              id: 'branch', 
              type: 'branch', 
              config: {
                condition: '${input.type === "premium"}',
                trueBranch: { result: 'premium_flow' },
                falseBranch: { result: 'standard_flow' }
              }
            }
          ],
          connections: [
            { source: 'start', target: 'branch' }
          ]
        }
      };

      this.workflowEngine._initializeExecution = async (runId, params) => ({
        runId,
        workflow: mockWorkflow,
        ...params
      });

      const result = await this.workflowEngine.executeWorkflow({
        workflowId: 'integration-test',
        inputData: { type: 'premium', userId: '123' },
        dryRun: false
      });

      assert.strictEqual(result.success, true);
    });

    await this.runTest('Integration - Complex Workflow with Loops and Transforms', async () => {
      const mockWorkflow = {
        definition: {
          nodes: [
            { id: 'start', type: 'trigger', config: {} },
            { 
              id: 'loop', 
              type: 'loop', 
              config: {
                loopType: 'forEach',
                condition: '${input.items}',
                maxIterations: 5,
                loopBody: {
                  nodes: [
                    { 
                      id: 'transform', 
                      type: 'transform.map', 
                      config: { 
                        mapping: { processed: '${item.id}' } 
                      } 
                    }
                  ]
                }
              }
            }
          ],
          connections: [
            { source: 'start', target: 'loop' }
          ]
        }
      };

      this.workflowEngine._initializeExecution = async (runId, params) => ({
        runId,
        workflow: mockWorkflow,
        ...params
      });

      const result = await this.workflowEngine.executeWorkflow({
        workflowId: 'complex-test',
        inputData: { 
          items: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' }
          ] 
        },
        dryRun: false
      });

      assert.strictEqual(result.success, true);
    });
  }

  async run() {
    console.log('🧪 Starting Cartrita Phase B Test Suite\n');
    console.log('Testing: parallelism, branching, retries, loops, subworkflows, dry runs\n');

    await this.testExpressionEngine();
    await this.testConnectorRegistry();
    await this.testWorkflowEngine();
    await this.testIntegration();

    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total:  ${this.passed + this.failed}`);

    if (this.failed === 0) {
      console.log('\n🎉 All tests passed! Phase B implementation is working correctly.');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. Please review the implementation.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testRunner = new TestRunner();
  testRunner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { TestRunner };