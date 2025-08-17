// services/workflows/ExpressionEngine.js
// PURPOSE: Expression and template rendering engine
// Minimal variable resolution: {{ steps.NodeName.output.field }}

class ExpressionEngine {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Render a template with context
   * @param {string} template - Template string with expressions
   * @param {Object} context - Execution context
   * @returns {*} Rendered value
   */
  render(template, context) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    // Check cache
    const cacheKey = `${template}:${JSON.stringify(context)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = template.replace(/{{\s*([^}]+)\s*}}/g, (match, expr) => {
      try {
        const value = this._evaluateExpression(expr.trim(), context);
        return value !== undefined ? String(value) : '';
      } catch (error) {
        console.error(`Expression evaluation error for "${expr}":`, error);
        return '';
      }
    });

    // Cache result
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Render an object recursively
   * @param {*} obj - Object to render
   * @param {Object} context - Execution context  
   * @returns {*} Rendered object
   */
  renderObject(obj, context) {
    if (typeof obj === 'string') {
      return this.render(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.renderObject(item, context));
    }
    
    if (obj && typeof obj === 'object') {
      const rendered = {};
      for (const [key, value] of Object.entries(obj)) {
        rendered[key] = this.renderObject(value, context);
      }
      return rendered;
    }
    
    return obj;
  }

  /**
   * Evaluate a single expression
   * @private
   */
  _evaluateExpression(expr, context) {
    // Handle steps.NodeId.output.field
    if (expr.startsWith('steps.')) {
      return this._getStepsValue(expr, context);
    }

    // Handle trigger.field
    if (expr.startsWith('trigger.')) {
      return this._getTriggerValue(expr, context);
    }

    // Handle workflow context
    if (expr.startsWith('workflow.')) {
      return this._getWorkflowValue(expr, context);
    }

    // Handle date/time functions
    if (expr.startsWith('now()')) {
      return new Date().toISOString();
    }

    if (expr.startsWith('timestamp()')) {
      return Date.now();
    }

    // Handle literals
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr.slice(1, -1); // Remove quotes
    }

    if (expr.startsWith("'") && expr.endsWith("'")) {
      return expr.slice(1, -1); // Remove quotes
    }

    // Handle numbers
    if (/^\d+(\.\d+)?$/.test(expr)) {
      return Number(expr);
    }

    // Handle booleans
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;

    return undefined;
  }

  /**
   * Get value from steps context
   * @private
   */
  _getStepsValue(expr, context) {
    const parts = expr.split('.');
    if (parts.length < 3) return undefined;

    const nodeId = parts[1];
    const path = parts.slice(2); // Skip 'steps' and nodeId

    const stepData = context.steps?.get(nodeId);
    if (!stepData) return undefined;

    return this._getNestedValue(stepData, path);
  }

  /**
   * Get value from trigger context
   * @private
   */
  _getTriggerValue(expr, context) {
    const parts = expr.split('.').slice(1); // Skip 'trigger'
    return this._getNestedValue(context.triggerContext, parts);
  }

  /**
   * Get workflow metadata
   * @private  
   */
  _getWorkflowValue(expr, context) {
    const parts = expr.split('.').slice(1); // Skip 'workflow'
    
    const workflowData = {
      id: context.workflow?.id,
      name: context.workflow?.name,
      runId: context.runId
    };

    return this._getNestedValue(workflowData, parts);
  }

  /**
   * Get nested value from object using path
   * @private
   */
  _getNestedValue(obj, path) {
    let current = obj;
    
    for (const segment of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      // Handle array access
      if (Array.isArray(current) && /^\d+$/.test(segment)) {
        current = current[Number(segment)];
      } else {
        current = current[segment];
      }
    }
    
    return current;
  }

  /**
   * Clear expression cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Validate expression syntax
   * @param {string} expr - Expression to validate
   * @returns {Object} Validation result
   */
  validateExpression(expr) {
    const issues = [];

    try {
      // Check for balanced brackets
      const openBrackets = (expr.match(/{{\s*/g) || []).length;
      const closeBrackets = (expr.match(/\s*}}/g) || []).length;
      
      if (openBrackets !== closeBrackets) {
        issues.push('Unbalanced expression brackets');
      }

      // Check for valid expression patterns
      const expressions = expr.match(/{{\s*([^}]+)\s*}}/g) || [];
      
      for (const fullExpr of expressions) {
        const innerExpr = fullExpr.replace(/{{\s*|\s*}}/g, '');
        
        if (!this._isValidExpressionPattern(innerExpr)) {
          issues.push(`Invalid expression pattern: ${innerExpr}`);
        }
      }

    } catch (error) {
      issues.push(`Expression parsing error: ${error.message}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Check if expression pattern is valid
   * @private
   */
  _isValidExpressionPattern(expr) {
    // Allow steps.*, trigger.*, workflow.*, functions, and literals
    const validPatterns = [
      /^steps\.\w+(\.\w+)*$/, // steps.NodeId.output.field
      /^trigger(\.\w+)*$/, // trigger.field
      /^workflow(\.\w+)*$/, // workflow.id
      /^now\(\)$/, // now()
      /^timestamp\(\)$/, // timestamp()
      /^".*"$/, // "string literal"
      /^'.*'$/, // 'string literal'
      /^\d+(\.\d+)?$/, // numbers
      /^(true|false|null)$/ // booleans and null
    ];

    return validPatterns.some(pattern => pattern.test(expr));
  }
}

// Export singleton instance
const expressionEngine = new ExpressionEngine();
module.exports = { expressionEngine };