// services/simple-expression-engine.js - Simplified Expression Engine for initial implementation
class SimpleExpressionEngine {
  constructor() {
    this.whitelistedFunctions = {
      Math: {
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        sqrt: Math.sqrt,
        random: Math.random
      },
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,
      JSON: {
        stringify: JSON.stringify,
        parse: JSON.parse
      }
    };
  }

  // Evaluate a JavaScript expression safely
  evaluate(expression, context = {}) {
    try {
      // Validate expression
      this.validateExpression(expression);
      
      // Handle template interpolation first - if it's pure template, return result directly
      if (typeof expression === 'string' && (expression.includes('{{') || expression.includes('${}'))) {
        const processedExpression = this.processTemplateInterpolation(expression, context);
        
        // If it was completely resolved by template interpolation, return it
        if (processedExpression !== expression) {
          return processedExpression;
        }
      }

      // Handle ${...} expressions
      if (typeof expression === 'string' && expression.includes('${')) {
        return this.evaluateTemplateExpression(expression, context);
      }

      // Only evaluate as JavaScript if it's not a pure template
      if (typeof expression === 'string' && !expression.includes('{{') && !expression.includes('${')) {
        return this.evaluateJavaScript(expression, context);
      }

      // For non-string expressions, return as-is
      return expression;

    } catch (error) {
      console.error('Expression evaluation failed:', error);
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  // Process {{variable}} style interpolation
  processTemplateInterpolation(expression, context) {
    if (typeof expression !== 'string') {
      return expression;
    }

    // Handle {{variable}} interpolation
    const templateRegex = /\{\{([^}]+)\}\}/g;
    let hasTemplates = false;
    
    const result = expression.replace(templateRegex, (match, variable) => {
      hasTemplates = true;
      const trimmed = variable.trim();
      const value = this.getNestedValue(context, trimmed);
      return value !== undefined ? String(value) : '';
    });

    // If no templates found, return original
    if (!hasTemplates) {
      return expression;
    }

    // If the entire expression was a single template, try to return original type
    const singleTemplateMatch = expression.match(/^\{\{([^}]+)\}\}$/);
    if (singleTemplateMatch) {
      const variable = singleTemplateMatch[1].trim();
      return this.getNestedValue(context, variable);
    }

    return result;
  }

  // Process ${...} expressions
  evaluateTemplateExpression(expression, context) {
    const templateRegex = /\$\{([^}]+)\}/g;
    
    return expression.replace(templateRegex, (match, jsExpression) => {
      const result = this.evaluateJavaScript(jsExpression.trim(), context);
      return result !== undefined ? String(result) : '';
    });
  }

  // Evaluate JavaScript expression using restricted Function constructor
  evaluateJavaScript(expression, context) {
    try {
      // Create safe context with whitelisted functions
      const safeContext = {
        ...this.createSafeContext(context),
        ...this.whitelistedFunctions
      };

      // Create parameter names and values
      const paramNames = Object.keys(safeContext);
      const paramValues = Object.values(safeContext);
      
      // Create and execute function
      const func = new Function(...paramNames, `return (${expression});`);
      const result = func(...paramValues);
      
      return result;

    } catch (error) {
      throw new Error(`JavaScript evaluation failed: ${error.message}`);
    }
  }

  // Create safe context (sanitize dangerous values)
  createSafeContext(context) {
    const safe = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (this.isSafeValue(value) && this.isValidVariableName(key)) {
        safe[key] = value;
      }
    }
    
    return safe;
  }

  // Check if a value is safe to use in evaluation
  isSafeValue(value) {
    if (value === null || value === undefined) return true;
    
    const type = typeof value;
    if (['string', 'number', 'boolean'].includes(type)) return true;
    
    if (Array.isArray(value)) {
      return value.every(item => this.isSafeValue(item));
    }
    
    if (type === 'object') {
      // Only check for explicitly dangerous constructor patterns
      if (value.constructor !== Object && value.constructor !== Array) {
        // Allow plain objects and arrays, reject classes/constructors
        return false;
      }
      
      // Check if all values are safe (recursive)
      return Object.values(value).every(item => this.isSafeValue(item));
    }
    
    return false;
  }

  // Validate expression syntax and safety
  validateExpression(expression) {
    if (typeof expression !== 'string') {
      return; // Non-string expressions are handled differently
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
      /constructor/,
      /__proto__/,
      /prototype/,
      /process\./,
      /global\./,
      /this\./,
      /window\./,
      /document\./,
      /setTimeout/,
      /setInterval/,
      /console\.(?!log)/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        throw new Error(`Dangerous pattern detected in expression: ${pattern.source}`);
      }
    }

    // Check expression length
    if (expression.length > 10000) {
      throw new Error('Expression too long');
    }
  }

  // Get nested object value using dot notation
  getNestedValue(obj, path) {
    if (!path) return obj;
    
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  // Utility function to check if expression contains templates
  containsTemplates(expression) {
    if (typeof expression !== 'string') return false;
    return /\{\{[^}]+\}\}/.test(expression) || /\$\{[^}]+\}/.test(expression);
  }

  // Batch evaluate multiple expressions
  evaluateBatch(expressions, context = {}) {
    const results = {};
    
    for (const [key, expression] of Object.entries(expressions)) {
      try {
        results[key] = this.evaluate(expression, context);
      } catch (error) {
        results[key] = { error: error.message };
      }
    }
    
    return results;
  }

  // Clean up resources (placeholder for compatibility)
  dispose() {
    // No cleanup needed for simple implementation
  }

  // Check if variable name is valid JavaScript identifier
  isValidVariableName(name) {
    const validName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    const reservedWords = [
      'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
      'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
      'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
      'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
      'import', 'super', 'implements', 'interface', 'let', 'package',
      'private', 'protected', 'public', 'static', 'yield'
    ];
    
    return validName.test(name) && !reservedWords.includes(name);
  }
}

module.exports = SimpleExpressionEngine;