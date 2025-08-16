// utils/safety-layer.js
// ----------------------------------------------------------------
// Safety layering system for input/output screening and moderation
// ----------------------------------------------------------------

const modelCatalog = require('./model-catalog');

/**
 * Safety configuration levels
 */
const SAFETY_LEVELS = {
  minimal: {
    input_screening: false,
    output_screening: false,
    content_filtering: 'basic',
    pii_detection: false
  },
  standard: {
    input_screening: true,
    output_screening: true,
    content_filtering: 'moderate',
    pii_detection: true
  },
  strict: {
    input_screening: true,
    output_screening: true,
    content_filtering: 'strict',
    pii_detection: true,
    require_human_review: true
  }
};

/**
 * Content risk categories and thresholds
 */
const RISK_CATEGORIES = {
  toxicity: { threshold: 0.8, weight: 1.0 },
  hate: { threshold: 0.7, weight: 1.2 },
  violence: { threshold: 0.7, weight: 1.1 },
  self_harm: { threshold: 0.6, weight: 1.5 },
  sexual: { threshold: 0.8, weight: 1.0 },
  harassment: { threshold: 0.7, weight: 1.0 },
  pii: { threshold: 0.5, weight: 0.8 }
};

/**
 * Screen input content for safety violations
 * @param {string} content - Input content to screen
 * @param {string} safetyLevel - Safety level (minimal, standard, strict)
 * @returns {Object} Safety screening result
 */
async function screenInput(content, safetyLevel = 'standard') {
  const config = SAFETY_LEVELS[safetyLevel];
  
  if (!config.input_screening) {
    return {
      safe: true,
      risks: [],
      action: 'allow',
      confidence: 1.0
    };
  }

  const result = {
    safe: true,
    risks: [],
    action: 'allow',
    confidence: 0.0,
    screening_details: {}
  };

  try {
    // Basic pattern-based screening (in production, use ML models)
    const risks = await detectContentRisks(content);
    result.risks = risks;
    result.screening_details = { method: 'pattern-based', timestamp: new Date().toISOString() };

    // Calculate overall risk score
    const overallRisk = calculateOverallRisk(risks);
    result.confidence = 1.0 - overallRisk;

    // Determine action based on risk and safety level
    if (overallRisk > getThresholdForLevel(safetyLevel)) {
      result.safe = false;
      result.action = safetyLevel === 'strict' ? 'block' : 'flag';
    }

    // PII detection if enabled
    if (config.pii_detection) {
      const piiRisks = detectPII(content);
      if (piiRisks.length > 0) {
        result.risks.push(...piiRisks);
        if (safetyLevel === 'strict') {
          result.safe = false;
          result.action = 'redact';
        }
      }
    }

  } catch (error) {
    console.error('Safety screening error:', error);
    result.safe = false;
    result.action = 'error';
    result.risks.push({
      category: 'system_error',
      score: 1.0,
      reason: 'Safety screening system error'
    });
  }

  return result;
}

/**
 * Screen output content before delivery
 * @param {string} content - Generated content to screen
 * @param {string} safetyLevel - Safety level
 * @returns {Object} Safety screening result with potential redactions
 */
async function screenOutput(content, safetyLevel = 'standard') {
  const config = SAFETY_LEVELS[safetyLevel];
  
  if (!config.output_screening) {
    return {
      safe: true,
      content: content,
      risks: [],
      action: 'deliver',
      redacted: false
    };
  }

  const result = {
    safe: true,
    content: content,
    original_content: content,
    risks: [],
    action: 'deliver',
    redacted: false,
    redactions: []
  };

  try {
    // Screen for safety violations
    const risks = await detectContentRisks(content);
    result.risks = risks;

    const overallRisk = calculateOverallRisk(risks);

    if (overallRisk > getThresholdForLevel(safetyLevel)) {
      result.safe = false;
      
      if (safetyLevel === 'strict' || overallRisk > 0.8) {
        result.action = 'block';
        result.content = "⚠️ Content blocked due to safety policy violations.";
      } else {
        // Attempt redaction for moderate risks
        const redactionResult = redactUnsafeContent(content, risks);
        result.content = redactionResult.content;
        result.redacted = redactionResult.redacted;
        result.redactions = redactionResult.redactions;
        result.action = result.redacted ? 'redact' : 'flag';
      }
    }

    // PII redaction
    if (config.pii_detection) {
      const piiResult = redactPII(result.content);
      if (piiResult.redacted) {
        result.content = piiResult.content;
        result.redacted = true;
        result.redactions.push(...piiResult.redactions);
      }
    }

  } catch (error) {
    console.error('Output safety screening error:', error);
    result.safe = false;
    result.action = 'error';
    result.content = "⚠️ Unable to verify content safety.";
  }

  return result;
}

/**
 * Get appropriate safety guard model for screening
 * @param {string} safetyLevel - Required safety level
 * @returns {Object|null} Safety model configuration
 */
function getSafetyGuardModel(safetyLevel = 'standard') {
  const safetyModels = modelCatalog.getModelsByCategory('safety');
  
  if (safetyModels.length === 0) {
    return null;
  }

  // Select appropriate safety model based on level
  switch (safetyLevel) {
    case 'strict':
      return safetyModels.find(m => m.repo_id.includes('Llama-Guard-2')) || safetyModels[0];
    case 'standard':
      return safetyModels.find(m => m.repo_id.includes('shieldgemma')) || safetyModels[0];
    case 'minimal':
      return safetyModels.find(m => m.repo_id.includes('toxic-roberta')) || safetyModels[0];
    default:
      return safetyModels[0];
  }
}

// Helper functions
async function detectContentRisks(content) {
  const risks = [];
  
  // Simple pattern-based detection (replace with ML models in production)
  const patterns = {
    toxicity: [
      /\b(hate|stupid|idiot|moron|shut up|kill yourself)\b/i,
      /\b(damn|hell|shit|fuck|bitch)\b/i
    ],
    violence: [
      /\b(kill|murder|violence|attack|hurt|harm|shoot|stab)\b/i,
      /\b(bomb|weapon|gun|knife|death|die|suicide)\b/i
    ],
    hate: [
      /\b(racist|sexist|homophobic|bigot|nazi|terrorist)\b/i,
      /\b(inferior|superior).*\b(race|gender|religion)\b/i
    ],
    sexual: [
      /\b(sex|sexual|nude|naked|porn|explicit)\b/i,
      /\b(adult content|nsfw|xxx)\b/i
    ]
  };

  for (const [category, categoryPatterns] of Object.entries(patterns)) {
    for (const pattern of categoryPatterns) {
      if (pattern.test(content)) {
        risks.push({
          category,
          score: 0.7 + Math.random() * 0.3, // Simulate ML confidence
          reason: `Pattern match detected`,
          matched_text: content.match(pattern)?.[0] || 'redacted'
        });
      }
    }
  }

  return risks;
}

function detectPII(content) {
  const piiPatterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
  };

  const risks = [];
  for (const [type, pattern] of Object.entries(piiPatterns)) {
    const matches = content.match(pattern);
    if (matches) {
      risks.push({
        category: 'pii',
        subcategory: type,
        score: 0.9,
        reason: `${type.toUpperCase()} detected`,
        count: matches.length
      });
    }
  }

  return risks;
}

function calculateOverallRisk(risks) {
  if (risks.length === 0) return 0;
  
  const weightedScores = risks.map(risk => {
    const categoryConfig = RISK_CATEGORIES[risk.category] || { weight: 1.0 };
    return risk.score * categoryConfig.weight;
  });
  
  return Math.min(1.0, Math.max(...weightedScores));
}

function getThresholdForLevel(safetyLevel) {
  switch (safetyLevel) {
    case 'minimal': return 0.9;
    case 'standard': return 0.7;
    case 'strict': return 0.5;
    default: return 0.7;
  }
}

function redactUnsafeContent(content, risks) {
  let redactedContent = content;
  const redactions = [];
  let hasRedactions = false;

  risks.forEach(risk => {
    if (risk.matched_text && risk.score > 0.6) {
      const redactedText = '[REDACTED]';
      const regex = new RegExp(escapeRegex(risk.matched_text), 'gi');
      if (regex.test(redactedContent)) {
        redactedContent = redactedContent.replace(regex, redactedText);
        redactions.push({
          original: risk.matched_text,
          replacement: redactedText,
          category: risk.category
        });
        hasRedactions = true;
      }
    }
  });

  return {
    content: redactedContent,
    redacted: hasRedactions,
    redactions
  };
}

function redactPII(content) {
  let redactedContent = content;
  const redactions = [];
  let hasRedactions = false;

  const piiPatterns = {
    email: { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
    phone: { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
    ssn: { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
    credit_card: { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' }
  };

  for (const [type, config] of Object.entries(piiPatterns)) {
    const matches = redactedContent.match(config.pattern);
    if (matches) {
      matches.forEach(match => {
        redactions.push({
          type,
          original: match,
          replacement: config.replacement
        });
      });
      redactedContent = redactedContent.replace(config.pattern, config.replacement);
      hasRedactions = true;
    }
  }

  return {
    content: redactedContent,
    redacted: hasRedactions,
    redactions
  };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  SAFETY_LEVELS,
  RISK_CATEGORIES,
  screenInput,
  screenOutput,
  getSafetyGuardModel
};