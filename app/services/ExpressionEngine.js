// PURPOSE: Basic expression engine for variable interpolation and templating
// PHASE: A
// STATUS: partial
// VERIFY: Security sandbox requirements
// TODO:
// 1. Add AST caching for performance
// 2. Implement safe function library
// 3. Add JSON path helpers
// 4. Add expression validation
// 5. Add error context reporting

/**
 * ExpressionEngine
 * MVP variable interpolation with controlled JSON path helpers
 * Avoids direct eval for security
 */
class ExpressionEngine {
  constructor() {
    this.variablePattern = /\{\{\s*([^}]+)\s*\}\}/g;
    this.pathCache = new Map();
    this.allowedFunctions = {
      // Date functions
      now: () => new Date().toISOString(),
      timestamp: () => Date.now(),
      
      // String functions
      upper: (str) => String(str).toUpperCase(),
      lower: (str) => String(str).toLowerCase(),
      trim: (str) => String(str).trim(),
      
      // Math functions
      random: () => Math.random(),
      round: (num) => Math.round(Number(num)),
      
      // Utility functions
      typeof: (value) => typeof value,
      length: (value) => Array.isArray(value) || typeof value === 'string' ? value.length : 0
    };
  }

  /**
   * Evaluate an expression with given context
   */
  evaluate(expression, context = {}) {
    try {
      if (typeof expression !== 'string') {
        return expression;
      }

      return expression.replace(this.variablePattern, (match, expr) => {
        return this.evaluateExpression(expr.trim(), context);
      });
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return expression; // Return original on error
    }
  }

  /**
   * Evaluate a single expression
   */
  evaluateExpression(expr, context) {
    try {
      // Check if it's a simple variable reference
      if (this.isSimpleVariable(expr)) {
        return this.getValueByPath(context, expr);
      }

      // Check if it's a function call
      if (this.isFunctionCall(expr)) {
        return this.evaluateFunction(expr, context);
      }

      // Check if it's a literal value
      const literal = this.parseLiteral(expr);
      if (literal !== null) {
        return literal;
      }

      // Default to path lookup
      return this.getValueByPath(context, expr);
    } catch (error) {
      console.error(`Error evaluating expression '${expr}':`, error);
      return `{{${expr}}}`; // Return original expression on error
    }
  }

  /**
   * Check if expression is a simple variable (letters, numbers, dots, underscores)
   */
  isSimpleVariable(expr) {
    return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(expr);
  }

  /**
   * Check if expression is a function call
   */
  isFunctionCall(expr) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)$/.test(expr);
  }

  /**
   * Parse literal values (strings, numbers, booleans)
   */
  parseLiteral(expr) {
    // String literals
    if ((expr.startsWith('"') && expr.endsWith('"')) || 
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Number literals
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return Number(expr);
    }

    // Boolean literals
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    return null;
  }

  /**
   * Get value by dot notation path
   */
  getValueByPath(obj, path) {
    if (!path) return obj;

    // Use cache for performance
    const cacheKey = `${typeof obj}_${path}`;
    if (this.pathCache.has(cacheKey)) {
      const cachedPath = this.pathCache.get(cacheKey);
      return this.traversePath(obj, cachedPath);
    }

    const pathParts = path.split('.');
    this.pathCache.set(cacheKey, pathParts);
    
    return this.traversePath(obj, pathParts);
  }

  /**
   * Traverse object path safely
   */
  traversePath(obj, pathParts) {
    let current = obj;
    
    for (const part of pathParts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      // Handle array indices
      if (Array.isArray(current) && /^\d+$/.test(part)) {
        current = current[parseInt(part, 10)];
      } else if (typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Evaluate function calls safely
   */
  evaluateFunction(expr, context) {
    const match = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)$/);
    if (!match) {
      throw new Error(`Invalid function call: ${expr}`);
    }

    const [, functionName, argsStr] = match;
    
    if (!this.allowedFunctions[functionName]) {
      throw new Error(`Function '${functionName}' is not allowed`);
    }

    // Parse arguments
    const args = this.parseArguments(argsStr, context);
    
    // Execute function
    return this.allowedFunctions[functionName](...args);
  }

  /**
   * Parse function arguments
   */
  parseArguments(argsStr, context) {
    if (!argsStr.trim()) {
      return [];
    }

    // Simple argument parsing (no nested function calls for MVP)
    const args = argsStr.split(',').map(arg => {
      const trimmed = arg.trim();
      
      // Check if it's a literal
      const literal = this.parseLiteral(trimmed);
      if (literal !== null) {
        return literal;
      }
      
      // Otherwise treat as variable reference
      return this.getValueByPath(context, trimmed);
    });

    return args;
  }

  /**
   * Validate expression syntax
   */
  validateExpression(expression) {
    try {
      if (typeof expression !== 'string') {
        return { valid: true };
      }

      const errors = [];
      
      // Find all expressions
      const matches = [...expression.matchAll(this.variablePattern)];
      
      for (const match of matches) {
        const expr = match[1].trim();
        
        // Basic syntax validation
        if (expr.includes('{{') || expr.includes('}}')) {
          errors.push(`Nested expressions not allowed: ${expr}`);
        }
        
        // Check for dangerous patterns
        if (expr.includes('eval') || expr.includes('Function') || expr.includes('constructor')) {
          errors.push(`Dangerous expression detected: ${expr}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Clear path cache
   */
  clearCache() {
    this.pathCache.clear();
  }
}

// Singleton instance
const expressionEngine = new ExpressionEngine();

module.exports = { ExpressionEngine, expressionEngine };