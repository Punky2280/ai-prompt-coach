// services/expression-engine.js - Safe Expression Evaluation Engine
const ivm = require('isolated-vm');

class ExpressionEngine {
  constructor() {
    this.isolate = new ivm.Isolate({ memoryLimit: 32 }); // 32MB memory limit
    this.context = null;
    this.whitelistedFunctions = {
      // Math functions
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
      // String functions
      String: {
        fromCharCode: String.fromCharCode
      },
      // Array functions
      Array: {
        isArray: Array.isArray
      },
      // Date functions  
      Date: {
        now: Date.now
      },
      // Utility functions
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,
      // JSON functions (safe subset)
      JSON: {
        stringify: JSON.stringify,
        parse: JSON.parse
      }
    };
    
    this.initializeContext();
  }

  async initializeContext() {
    try {
      this.context = await this.isolate.createContext();
      
      // Set up safe global environment
      await this.context.eval(`
        // Remove dangerous globals
        delete this.constructor;
        delete this.eval;
        delete this.Function;
        delete this.require;
        delete this.process;
        delete this.global;
        delete this.globalThis;
        
        // Safe console for debugging
        const console = {
          log: (...args) => { /* no-op in sandbox */ }
        };
      `);

      // Add whitelisted functions one by one to avoid transferability issues
      const jail = this.context.global;
      
      // Math functions
      await jail.set('Math', {
        abs: new ivm.Reference(Math.abs),
        ceil: new ivm.Reference(Math.ceil), 
        floor: new ivm.Reference(Math.floor),
        round: new ivm.Reference(Math.round),
        max: new ivm.Reference(Math.max),
        min: new ivm.Reference(Math.min),
        pow: new ivm.Reference(Math.pow),
        sqrt: new ivm.Reference(Math.sqrt),
        random: new ivm.Reference(Math.random)
      });

      // Basic functions
      await jail.set('parseInt', new ivm.Reference(parseInt));
      await jail.set('parseFloat', new ivm.Reference(parseFloat));
      await jail.set('isNaN', new ivm.Reference(isNaN));
      await jail.set('isFinite', new ivm.Reference(isFinite));

    } catch (error) {
      console.error('Failed to initialize expression context:', error);
      throw new Error('Expression engine initialization failed');
    }
  }

  // Evaluate a JavaScript expression safely
  evaluate(expression, context = {}) {
    try {
      // Validate expression
      this.validateExpression(expression);
      
      // Handle template interpolation
      const processedExpression = this.processTemplateInterpolation(expression, context);
      
      // If it's just a template interpolation result, return it directly
      if (processedExpression !== expression && typeof processedExpression !== 'string') {
        return processedExpression;
      }

      // Handle ${...} expressions
      if (typeof processedExpression === 'string' && processedExpression.includes('${')) {
        return this.evaluateTemplateExpression(processedExpression, context);
      }

      // Evaluate as JavaScript expression
      return this.evaluateJavaScript(processedExpression, context);

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

  // Evaluate JavaScript expression in isolated context
  evaluateJavaScript(expression, context) {
    try {
      // Create a safe evaluation context
      const safeContext = this.createSafeContext(context);
      
      // Build the evaluation code
      const code = `
        ${this.buildContextVariables(safeContext)}
        (${expression})
      `;

      // Execute in isolated VM
      const script = this.isolate.compileScriptSync(code);
      const result = script.runSync(this.context, { timeout: 5000 }); // 5 second timeout
      
      return result;

    } catch (error) {
      throw new Error(`JavaScript evaluation failed: ${error.message}`);
    }
  }

  // Build context variables for evaluation
  buildContextVariables(context) {
    const assignments = [];
    
    for (const [key, value] of Object.entries(context)) {
      if (this.isValidVariableName(key)) {
        assignments.push(`const ${key} = ${JSON.stringify(value)};`);
      }
    }
    
    return assignments.join('\n');
  }

  // Create safe context (sanitize dangerous values)
  createSafeContext(context) {
    const safe = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (this.isSafeValue(value)) {
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
      // Check for dangerous properties
      if (value.constructor !== Object) return false;
      if ('__proto__' in value) return false;
      if ('constructor' in value) return false;
      
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

  // Clean up resources
  dispose() {
    if (this.context) {
      this.context.release();
    }
    if (this.isolate) {
      this.isolate.dispose();
    }
  }
}

module.exports = ExpressionEngine;