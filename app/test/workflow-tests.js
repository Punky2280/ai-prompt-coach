// test/workflow-tests.js - Basic workflow automation tests
const SimpleExpressionEngine = require('../services/simple-expression-engine');
const ConnectorRegistry = require('../services/connector-registry');

// Test counter
let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (condition) {
    testsPassed++;
    console.log(`✅ ${message}`);
  } else {
    console.log(`❌ ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Running Cartrita Workflow Automation Tests');
  console.log('================================================');

  // Expression Engine Tests
  console.log('\n📊 Expression Engine Tests:');
  
  const expressionEngine = new SimpleExpressionEngine();
  
  // Test basic expression evaluation
  const result1 = expressionEngine.evaluate('2 + 3');
  assert(result1 === 5, 'Basic arithmetic expression');
  
  // Test template interpolation
  const result2 = expressionEngine.evaluate('{{name}}', { name: 'Cartrita' });
  assert(result2 === 'Cartrita', 'Template interpolation {{}}');
  
  // Test ${} expressions
  const result3 = expressionEngine.evaluate('Hello ${name}!', { name: 'World' });
  assert(result3 === 'Hello World!', 'Template expression ${}');
  
  // Test context evaluation
  const result4 = expressionEngine.evaluate('user.age >= 18', { user: { age: 25 } });
  assert(result4 === true, 'Context-based conditional evaluation');
  
  // Test array operations
  const result5 = expressionEngine.evaluate('items.length', { items: [1, 2, 3, 4, 5] });
  assert(result5 === 5, 'Array property access');
  
  // Test Math functions
  const result6 = expressionEngine.evaluate('Math.max(10, 20, 5)');
  assert(result6 === 20, 'Math function evaluation');

  // Connector Registry Tests
  console.log('\n🔌 Connector Registry Tests:');
  
  const connectorRegistry = new ConnectorRegistry();
  
  // Test connector listing
  const connectors = connectorRegistry.getConnectors();
  assert(connectors.length >= 3, 'Built-in connectors loaded (http, transform, util)');
  
  // Test HTTP connector action existence
  const httpConnector = connectors.find(c => c.name === 'http');
  assert(httpConnector && httpConnector.actions.includes('get'), 'HTTP connector has GET action');
  
  // Test transform connector
  const transformConnector = connectors.find(c => c.name === 'transform');
  assert(transformConnector && transformConnector.actions.includes('map'), 'Transform connector has map action');
  
  // Test utility connector
  const utilConnector = connectors.find(c => c.name === 'util');
  assert(utilConnector && utilConnector.actions.includes('delay'), 'Utility connector has delay action');
  
  // Test data transformation
  try {
    const mapResult = await connectorRegistry.executeAction('transform', 'map', {
      data: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
      mapping: 'name'
    }, {});
    assert(Array.isArray(mapResult) && mapResult[0] === 'John', 'Transform map action works');
  } catch (error) {
    assert(false, `Transform map action failed: ${error.message}`);
  }
  
  // Test filter transformation
  try {
    const filterResult = await connectorRegistry.executeAction('transform', 'filter', {
      data: [{ active: true, name: 'John' }, { active: false, name: 'Jane' }],
      condition: 'active'
    }, {});
    assert(Array.isArray(filterResult) && filterResult.length === 1, 'Transform filter action works');
  } catch (error) {
    assert(false, `Transform filter action failed: ${error.message}`);
  }
  
  // Security Tests
  console.log('\n🔒 Security Tests:');
  
  try {
    expressionEngine.evaluate('require("fs")');
    assert(false, 'Security: require() should be blocked');
  } catch (error) {
    assert(true, 'Security: require() is properly blocked');
  }
  
  try {
    expressionEngine.evaluate('process.exit(1)');
    assert(false, 'Security: process access should be blocked');
  } catch (error) {
    assert(true, 'Security: process access is properly blocked');
  }
  
  try {
    expressionEngine.evaluate('constructor');
    assert(false, 'Security: constructor access should be blocked');  
  } catch (error) {
    assert(true, 'Security: constructor access is properly blocked');
  }

  // Phase B Features Tests
  console.log('\n🚀 Phase B Features Tests:');
  
  // Test branching logic
  const branchResult1 = expressionEngine.evaluate('user.age >= 18 ? "adult" : "minor"', { user: { age: 25 } });
  assert(branchResult1 === 'adult', 'Branching: adult condition');
  
  const branchResult2 = expressionEngine.evaluate('user.age >= 18 ? "adult" : "minor"', { user: { age: 16 } });
  assert(branchResult2 === 'minor', 'Branching: minor condition');
  
  // Test loop data processing
  const users = [{ age: 25, name: 'John' }, { age: 16, name: 'Jane' }, { age: 30, name: 'Bob' }];
  const adults = users.filter(user => expressionEngine.evaluate('user.age >= 18', { user }));
  assert(adults.length === 2, 'Loop processing: filter adults');
  
  // Test validation utility
  try {
    const validationResult = await connectorRegistry.executeAction('util', 'validate', {
      data: { name: 'John', email: 'john@example.com' },
      schema: {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'string' }
      }
    }, {});
    assert(validationResult.valid === true, 'Utility validation works');
  } catch (error) {
    assert(false, `Validation utility failed: ${error.message}`);
  }

  // Test delay utility (dry run)
  try {
    const delayResult = await connectorRegistry.executeAction('util', 'delay', {
      duration: 100
    }, {});
    assert(delayResult.delayed === 100, 'Utility delay works');
  } catch (error) {
    assert(false, `Delay utility failed: ${error.message}`);
  }

  // Cleanup
  expressionEngine.dispose();

  // Test Results
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsTotal - testsPassed}`);
  console.log(`📊 Total tests: ${testsTotal}`);
  console.log(`🎯 Success rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! Cartrita Workflow Platform is ready!');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };