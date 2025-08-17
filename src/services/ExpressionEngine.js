// PURPOSE: Expression and template engine for workflow automation
// PHASE: B
// STATUS: complete
// VERIFY: Secure evaluation sandbox implementation

/**
 * ExpressionEngine - Safe expression evaluation for workflow automation
 * Provides variable interpolation and controlled expression evaluation
 */
class ExpressionEngine {
  constructor() {
    // Safe function whitelist for expressions
    this.safeFunctions = {
      // String functions
      length: (str) => String(str).length,
      toUpperCase: (str) => String(str).toUpperCase(),
      toLowerCase: (str) => String(str).toLowerCase(),
      trim: (str) => String(str).trim(),
      substring: (str, start, end) => String(str).substring(start, end),
      split: (str, delimiter) => String(str).split(delimiter),
      replace: (str, search, replace) => String(str).replace(search, replace),
      includes: (str, search) => String(str).includes(search),
      startsWith: (str, prefix) => String(str).startsWith(prefix),
      endsWith: (str, suffix) => String(str).endsWith(suffix),

      // Number functions
      parseInt: (str, radix = 10) => parseInt(str, radix),
      parseFloat: (str) => parseFloat(str),
      isNaN: (value) => isNaN(value),
      Math: {
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        max: Math.max,
        min: Math.min,
        random: Math.random,
        pow: Math.pow,
        sqrt: Math.sqrt
      },

      // Array functions
      isArray: Array.isArray,
      join: (arr, separator) => Array.isArray(arr) ? arr.join(separator) : '',
      slice: (arr, start, end) => Array.isArray(arr) ? arr.slice(start, end) : [],
      map: (arr, fn) => Array.isArray(arr) ? arr.map(fn) : [],
      filter: (arr, fn) => Array.isArray(arr) ? arr.filter(fn) : [],
      find: (arr, fn) => Array.isArray(arr) ? arr.find(fn) : undefined,
      some: (arr, fn) => Array.isArray(arr) ? arr.some(fn) : false,
      every: (arr, fn) => Array.isArray(arr) ? arr.every(fn) : false,

      // Date functions
      now: () => new Date(),
      dateString: (date) => new Date(date).toISOString(),
      timestamp: (date) => new Date(date).getTime(),

      // Utility functions
      typeOf: (value) => typeof value,
      isEmpty: (value) => {
        if (value == null) return true;
        if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
      },
      hasProperty: (obj, prop) => obj && typeof obj === 'object' && prop in obj,
      keys: (obj) => obj && typeof obj === 'object' ? Object.keys(obj) : [],
      values: (obj) => obj && typeof obj === 'object' ? Object.values(obj) : []
    };

    // Regex patterns for template interpolation
    this.variablePattern = /\{\{\s*([^}]+)\s*\}\}/g;
    this.expressionPattern = /\$\{([^}]+)\}/g;
  }

  /**
   * Evaluate an expression safely within a context
   * @param {string} expression - Expression to evaluate
   * @param {Object} context - Variable context
   * @returns {any} Evaluation result
   */
  async evaluate(expression, context = {}) {
    if (typeof expression !== 'string') {
      return expression;
    }

    try {
      // Simple variable interpolation first
      if (expression.startsWith('{{') && expression.endsWith('}}')) {
        const variablePath = expression.slice(2, -2).trim();
        return this._getValueByPath(context, variablePath);
      }

      // Expression evaluation
      if (expression.startsWith('${') && expression.endsWith('}')) {
        const expressionCode = expression.slice(2, -1).trim();
        return this._evaluateExpression(expressionCode, context);
      }

      // Template string with interpolation
      if (this.variablePattern.test(expression) || this.expressionPattern.test(expression)) {
        return this._interpolateTemplate(expression, context);
      }

      // Return as literal value
      return expression;

    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  /**
   * Interpolate templates with variable and expression substitution
   * @param {string} template - Template string
   * @param {Object} context - Variable context
   * @returns {string} Interpolated result
   */
  async _interpolateTemplate(template, context) {
    let result = template;

    // Replace variable interpolations {{variable}}
    result = result.replace(this.variablePattern, (match, variablePath) => {
      const value = this._getValueByPath(context, variablePath.trim());
      return value != null ? String(value) : '';
    });

    // Replace expression interpolations ${expression}
    result = result.replace(this.expressionPattern, (match, expressionCode) => {
      try {
        const value = this._evaluateExpression(expressionCode.trim(), context);
        return value != null ? String(value) : '';
      } catch (error) {
        return `[ERROR: ${error.message}]`;
      }
    });

    return result;
  }

  /**
   * Safely evaluate a JavaScript-like expression
   * @param {string} expression - Expression code
   * @param {Object} context - Variable context
   * @returns {any} Evaluation result
   */
  _evaluateExpression(expression, context) {
    // Validate expression for dangerous patterns
    this._validateExpression(expression);

    try {
      // Create safe evaluation context
      const safeContext = {
        // Context variables first
        ...context,
        // Then safe functions
        Math: this.safeFunctions.Math,
        parseInt: this.safeFunctions.parseInt,
        parseFloat: this.safeFunctions.parseFloat,
        isNaN: this.safeFunctions.isNaN,
        isArray: this.safeFunctions.isArray,
        length: this.safeFunctions.length,
        toUpperCase: this.safeFunctions.toUpperCase,
        toLowerCase: this.safeFunctions.toLowerCase,
        trim: this.safeFunctions.trim,
        substring: this.safeFunctions.substring,
        split: this.safeFunctions.split,
        replace: this.safeFunctions.replace,
        includes: this.safeFunctions.includes,
        startsWith: this.safeFunctions.startsWith,
        endsWith: this.safeFunctions.endsWith,
        join: this.safeFunctions.join,
        slice: this.safeFunctions.slice,
        map: this.safeFunctions.map,
        filter: this.safeFunctions.filter,
        find: this.safeFunctions.find,
        some: this.safeFunctions.some,
        every: this.safeFunctions.every,
        now: this.safeFunctions.now,
        dateString: this.safeFunctions.dateString,
        timestamp: this.safeFunctions.timestamp,
        typeOf: this.safeFunctions.typeOf,
        isEmpty: this.safeFunctions.isEmpty,
        hasProperty: this.safeFunctions.hasProperty,
        keys: this.safeFunctions.keys,
        values: this.safeFunctions.values
      };

      // Create function with safe context
      const contextKeys = Object.keys(safeContext);
      const contextValues = Object.values(safeContext);
      
      const evalFunction = new Function(...contextKeys, `
        "use strict";
        return (${expression});
      `);

      return evalFunction(...contextValues);

    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  /**
   * Validate expression for security issues
   * @param {string} expression - Expression to validate
   */
  _validateExpression(expression) {
    // Block dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /constructor/,
      /prototype/,
      /__proto__/,
      /import\s+/,
      /require\s*\(/,
      /process\s*\./,
      /global\s*\./,
      /window\s*\./,
      /document\s*\./,
      /location\s*\./,
      /console\s*\./,
      /setTimeout/,
      /setInterval/,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /\.\s*constructor/,
      /while\s*\(/,
      /for\s*\(/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        throw new Error(`Unsafe expression pattern detected: ${pattern.source}`);
      }
    }

    // Check for excessive length
    if (expression.length > 1000) {
      throw new Error('Expression too long');
    }
  }

  /**
   * Get value from object using dot notation path
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot notation path
   * @returns {any} Value at path
   */
  _getValueByPath(obj, path) {
    if (!path || typeof path !== 'string') {
      return undefined;
    }

    // Handle array access notation
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const keys = normalizedPath.split('.');
    
    let current = obj;
    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }

  /**
   * Set value in object using dot notation path
   * @param {Object} obj - Object to modify
   * @param {string} path - Dot notation path
   * @param {any} value - Value to set
   */
  _setValueByPath(obj, path, value) {
    if (!path || typeof path !== 'string') {
      return;
    }

    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const keys = normalizedPath.split('.');
    const lastKey = keys.pop();
    
    let current = obj;
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
  }

  /**
   * Batch evaluate multiple expressions
   * @param {Object} expressions - Key-value pairs of expressions
   * @param {Object} context - Variable context
   * @returns {Object} Evaluated results
   */
  async evaluateBatch(expressions, context = {}) {
    const results = {};
    
    for (const [key, expression] of Object.entries(expressions)) {
      try {
        results[key] = await this.evaluate(expression, context);
      } catch (error) {
        results[key] = { error: error.message };
      }
    }
    
    return results;
  }

  /**
   * Test if an expression is valid
   * @param {string} expression - Expression to test
   * @param {Object} context - Test context
   * @returns {Object} Validation result
   */
  async validateExpression(expression, context = {}) {
    try {
      await this.evaluate(expression, context);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Create a safe execution sandbox for expressions
   * @param {Object} additionalFunctions - Additional safe functions to include
   * @returns {ExpressionEngine} New engine instance with extended functions
   */
  createSandbox(additionalFunctions = {}) {
    const sandbox = new ExpressionEngine();
    sandbox.safeFunctions = {
      ...this.safeFunctions,
      ...additionalFunctions
    };
    return sandbox;
  }
}

module.exports = { ExpressionEngine };