// PURPOSE: Expression engine for safe variable interpolation and templating  
// PHASE: A
// STATUS: partial
// VERIFY: No direct eval usage, sandbox security
// TODO:
// 1. Add JSON path helper functions
// 2. Implement AST caching for performance  
// 3. Add safe function library
// 4. Add expression validation

/**
 * Safe Expression Engine for Cartrita Workflows
 * 
 * Features:
 * - Variable interpolation: {{ variable }}
 * - JSON path access: {{ data.user.name }}
 * - Safe function calls: {{ upper(data.title) }}
 * - No eval() - uses controlled parsing
 */
class ExpressionEngine {
  constructor() {
    this.variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    this.safeFunctions = this.createSafeFunctionLibrary();
    this.cache = new Map(); // TODO: Implement AST caching
  }

  /**
   * Evaluate an expression string with provided context
   * @param {string} expression - Expression to evaluate (e.g., "Hello {{ name }}")
   * @param {Object} context - Variables available for interpolation
   * @returns {string} Evaluated expression
   */
  evaluate(expression, context = {}) {
    if (typeof expression !== 'string') {
      return expression;
    }

    try {
      return expression.replace(this.variableRegex, (match, variablePath) => {
        const trimmed = variablePath.trim();
        return this.evaluateVariablePath(trimmed, context);
      });
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return `{{ ERROR: ${error.message} }}`;
    }
  }

  /**
   * Evaluate a single variable path (e.g., "data.user.name" or "upper(title)")
   * @param {string} variablePath - Variable path to evaluate
   * @param {Object} context - Available context variables
   * @returns {string} Resolved value
   */
  evaluateVariablePath(variablePath, context) {
    // Check for function calls (e.g., "upper(data.title)")
    const functionMatch = variablePath.match(/^(\w+)\(([^)]*)\)$/);
    
    if (functionMatch) {
      return this.evaluateFunction(functionMatch[1], functionMatch[2], context);
    }

    // Regular variable path (e.g., "data.user.name")
    return this.resolvePath(variablePath, context);
  }

  /**
   * Resolve a dot-notation path in the context
   * @param {string} path - Dot notation path (e.g., "data.user.name")
   * @param {Object} context - Context object
   * @returns {any} Resolved value
   */
  resolvePath(path, context) {
    const parts = path.split('.');
    let current = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return '';
      }

      // Handle array access (basic support)
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        current = current[arrayName];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return '';
        }
      } else {
        current = current[part];
      }
    }

    // Convert to string representation
    if (current === null || current === undefined) {
      return '';
    }
    
    if (typeof current === 'object') {
      return JSON.stringify(current);
    }

    return String(current);
  }

  /**
   * Evaluate a safe function call
   * @param {string} functionName - Name of function to call
   * @param {string} argsString - Arguments as string
   * @param {Object} context - Available context
   * @returns {string} Function result
   */
  evaluateFunction(functionName, argsString, context) {
    const func = this.safeFunctions[functionName];
    
    if (!func) {
      throw new Error(`Unknown function: ${functionName}`);
    }

    // Parse arguments (basic implementation)
    const args = this.parseArguments(argsString, context);
    
    try {
      return String(func(...args));
    } catch (error) {
      throw new Error(`Function ${functionName} error: ${error.message}`);
    }
  }

  /**
   * Parse function arguments from string
   * @param {string} argsString - Arguments string
   * @param {Object} context - Available context
   * @returns {Array} Parsed arguments
   */
  parseArguments(argsString, context) {
    if (!argsString.trim()) {
      return [];
    }

    // Basic argument parsing - split by comma, resolve each
    return argsString.split(',').map(arg => {
      const trimmed = arg.trim();
      
      // String literal
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1);
      }
      
      // Number literal
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return parseFloat(trimmed);
      }
      
      // Variable reference
      return this.resolvePath(trimmed, context);
    });
  }

  /**
   * Create safe function library (no system access)
   * @returns {Object} Safe functions
   */
  createSafeFunctionLibrary() {
    return {
      // String functions
      upper: (str) => String(str).toUpperCase(),
      lower: (str) => String(str).toLowerCase(),
      trim: (str) => String(str).trim(),
      length: (str) => String(str).length,
      substr: (str, start, len) => String(str).substr(start, len),
      replace: (str, search, replace) => String(str).replace(search, replace),
      
      // Number functions  
      add: (a, b) => Number(a) + Number(b),
      subtract: (a, b) => Number(a) - Number(b),
      multiply: (a, b) => Number(a) * Number(b),
      divide: (a, b) => Number(a) / Number(b),
      round: (num) => Math.round(Number(num)),
      
      // Date functions
      now: () => new Date().toISOString(),
      formatDate: (dateStr, format = 'ISO') => {
        const date = new Date(dateStr);
        return format === 'ISO' ? date.toISOString() : date.toString();
      },
      
      // Utility functions
      default: (value, defaultValue) => value || defaultValue,
      isEmpty: (value) => !value || value === '' || value === null || value === undefined,
      isNumber: (value) => !isNaN(Number(value)),
      
      // JSON functions
      jsonParse: (str) => {
        try {
          return JSON.parse(str);
        } catch {
          return null;
        }
      },
      jsonStringify: (obj) => JSON.stringify(obj)
    };
  }

  /**
   * Validate an expression for security and syntax
   * @param {string} expression - Expression to validate
   * @returns {Object} Validation result
   */
  validateExpression(expression) {
    // TODO: Implement comprehensive expression validation
    const errors = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /constructor/i,
      /__proto__/i,
      /prototype/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        errors.push(`Dangerous pattern detected: ${pattern.source}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear expression cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
const expressionEngine = new ExpressionEngine();

module.exports = { ExpressionEngine, expressionEngine };