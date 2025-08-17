// PURPOSE: Basic integration tests for Cartrita workflow automation Phase A
// PHASE: A
// STATUS: skeleton
// VERIFY: Core services functional, API endpoints respond correctly
// TODO:
// 1. Add comprehensive workflow execution tests
// 2. Add SSE streaming tests
// 3. Add connector registry tests
// 4. Add expression engine edge cases

const { expressionEngine } = require('../services/expressionEngine');
const { connectorRegistryService } = require('../services/connectorRegistry');
const { workflowRunnerService } = require('../services/workflowRunner');

/**
 * Test Expression Engine
 */
async function testExpressionEngine() {
  console.log('\n=== Testing Expression Engine ===');

  const tests = [
    {
      name: 'Simple variable interpolation',
      expression: 'Hello {{ name }}!',
      context: { name: 'World' },
      expected: 'Hello World!'
    },
    {
      name: 'JSON path access',
      expression: 'User: {{ user.name }} ({{ user.email }})',
      context: { user: { name: 'Alice', email: 'alice@example.com' } },
      expected: 'User: Alice (alice@example.com)'
    },
    {
      name: 'Function call',
      expression: '{{ upper(greeting) }}',
      context: { greeting: 'hello world' },
      expected: 'HELLO WORLD'
    },
    {
      name: 'Multiple expressions',
      expression: '{{ name }} has {{ add(score, bonus) }} points',
      context: { name: 'Bob', score: 80, bonus: 20 },
      expected: 'Bob has 100 points'
    }
  ];

  let passed = 0;
  for (const test of tests) {
    try {
      const result = expressionEngine.evaluate(test.expression, test.context);
      if (result === test.expected) {
        console.log(`✅ ${test.name}: PASS`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAIL - Expected "${test.expected}", got "${result}"`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  console.log(`Expression Engine: ${passed}/${tests.length} tests passed`);
  return passed === tests.length;
}

/**
 * Test Connector Registry Service
 */
async function testConnectorRegistry() {
  console.log('\n=== Testing Connector Registry ===');

  try {
    // Test schema validation
    const invalidConnector = { name: 'Test' }; // missing required fields
    const validation = connectorRegistryService.validateConnectorSchema(invalidConnector);
    
    if (!validation.valid && validation.errors.length > 0) {
      console.log('✅ Schema validation: PASS');
    } else {
      console.log('❌ Schema validation: FAIL');
      return false;
    }

    // Test valid connector schema
    const validConnector = {
      slug: 'test-connector',
      name: 'Test Connector',
      category: 'test',
      description: 'Test connector for validation'
    };

    const validValidation = connectorRegistryService.validateConnectorSchema(validConnector);
    if (validValidation.valid) {
      console.log('✅ Valid schema validation: PASS');
    } else {
      console.log('❌ Valid schema validation: FAIL');
      return false;
    }

    console.log('Connector Registry: All tests passed');
    return true;

  } catch (error) {
    console.log(`❌ Connector Registry: ERROR - ${error.message}`);
    return false;
  }
}

/**
 * Test Workflow Runner Service
 */
async function testWorkflowRunner() {
  console.log('\n=== Testing Workflow Runner ===');

  try {
    // Test workflow validation
    const invalidWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      nodes: [], // Empty nodes array
      edges: []
    };

    const validation = await workflowRunnerService.validateWorkflowGraph(invalidWorkflow);
    if (!validation.valid && validation.errors.includes('Workflow must have at least one node')) {
      console.log('✅ Empty workflow validation: PASS');
    } else {
      console.log('❌ Empty workflow validation: FAIL');
      return false;
    }

    // Test valid workflow structure  
    const validWorkflow = {
      id: 'test-workflow-2',
      name: 'Valid Test Workflow',
      nodes: [
        { id: 'trigger-1', type: 'trigger', name: 'Manual Trigger' },
        { id: 'transform-1', type: 'transform', name: 'Transform Data' }
      ],
      edges: [
        { source: 'trigger-1', target: 'transform-1' }
      ]
    };

    const validValidation = await workflowRunnerService.validateWorkflowGraph(validWorkflow);
    if (validValidation.valid) {
      console.log('✅ Valid workflow validation: PASS');
    } else {
      console.log(`❌ Valid workflow validation: FAIL - ${validValidation.errors.join(', ')}`);
      return false;
    }

    console.log('Workflow Runner: All tests passed');
    return true;

  } catch (error) {
    console.log(`❌ Workflow Runner: ERROR - ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Running Cartrita Phase A Integration Tests\n');

  const results = {
    expressionEngine: await testExpressionEngine(),
    connectorRegistry: await testConnectorRegistry(),
    workflowRunner: await testWorkflowRunner()
  };

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  console.log('\n=== Test Summary ===');
  console.log(`Total: ${totalTests} test suites`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testExpressionEngine, testConnectorRegistry, testWorkflowRunner };