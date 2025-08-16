// utils/model-router.js
// ----------------------------------------------------------------
// Dynamic AI Model Routing System with fallback and scoring
// ----------------------------------------------------------------

const modelCatalog = require('./model-catalog');

/**
 * Classify request to determine optimal task types and requirements
 * @param {string} prompt - The user's input prompt
 * @param {Object} context - Additional context (history, user prefs, etc.)
 * @returns {Object} Classification results
 */
function classifyRequest(prompt, context = {}) {
  const classification = {
    primary_tasks: [],
    secondary_tasks: [],
    context_length_required: estimateContextLength(prompt, context),
    latency_preference: context.latency_preference || 'balanced', // 'fast', 'balanced', 'quality'
    cost_preference: context.cost_preference || 'balanced', // 'cheap', 'balanced', 'premium'
    multilingual: detectMultilingual(prompt),
    safety_level: context.safety_level || 'standard', // 'minimal', 'standard', 'strict'
    specialized_domain: detectSpecializedDomain(prompt)
  };

  // Task classification based on prompt patterns
  if (isCodeRelated(prompt)) {
    classification.primary_tasks.push('code-gen', 'code-analysis');
  }
  
  if (isMathRelated(prompt)) {
    classification.primary_tasks.push('math-reasoning', 'step-by-step');
  }
  
  if (isTranslationRelated(prompt)) {
    classification.primary_tasks.push('translation');
    classification.multilingual = true;
  }
  
  if (isCreativeWriting(prompt)) {
    classification.primary_tasks.push('creative', 'chat');
  }
  
  if (isLongFormAnalysis(prompt)) {
    classification.primary_tasks.push('longform', 'analysis', 'summary');
    classification.context_length_required = Math.max(classification.context_length_required, 8192);
  }
  
  // Default to general chat/reasoning if no specific task detected
  if (classification.primary_tasks.length === 0) {
    classification.primary_tasks.push('chat', 'reasoning');
  }

  return classification;
}

/**
 * Score and rank models based on request classification
 * @param {Array} models - Array of models to score
 * @param {Object} classification - Request classification
 * @returns {Array} Scored and sorted models
 */
function scoreModels(models, classification) {
  return models.map(model => {
    let score = 0;
    const factors = {
      task_match: 0,
      latency: 0,
      cost: 0,
      context_fit: 0,
      availability: 0,
      specialization: 0
    };

    // Task matching (40% weight)
    const taskScore = calculateTaskMatch(model, classification.primary_tasks);
    factors.task_match = taskScore * 0.4;
    score += factors.task_match;

    // Latency scoring (20% weight)
    factors.latency = calculateLatencyScore(model, classification.latency_preference) * 0.2;
    score += factors.latency;

    // Cost scoring (20% weight)
    factors.cost = calculateCostScore(model, classification.cost_preference) * 0.2;
    score += factors.cost;

    // Context length fit (10% weight)
    factors.context_fit = calculateContextFit(model, classification.context_length_required) * 0.1;
    score += factors.context_fit;

    // Availability/reliability (5% weight)
    factors.availability = model.serverless_candidate ? 0.8 : 0.6; // Serverless = more reliable
    factors.availability *= 0.05;
    score += factors.availability;

    // Specialization bonus (5% weight)
    factors.specialization = calculateSpecializationScore(model, classification) * 0.05;
    score += factors.specialization;

    return {
      ...model,
      score,
      score_factors: factors
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Select best model with fallback chain
 * @param {Object} classification - Request classification
 * @param {Object} options - Selection options
 * @returns {Object} Selected model and fallbacks
 */
function selectModel(classification, options = {}) {
  const {
    exclude_models = [],
    force_serverless = false,
    max_cost = null,
    max_latency = null
  } = options;

  let candidateModels = modelCatalog.getAllModels();

  // Apply filters
  candidateModels = candidateModels.filter(model => 
    !exclude_models.includes(model.id)
  );

  if (force_serverless) {
    candidateModels = candidateModels.filter(model => model.serverless_candidate);
  }

  if (max_cost !== null) {
    candidateModels = candidateModels.filter(model => model.cost_per_1k_tokens <= max_cost);
  }

  if (max_latency !== null) {
    candidateModels = candidateModels.filter(model => model.avg_latency_ms <= max_latency);
  }

  // Filter by context length requirement
  candidateModels = candidateModels.filter(model => 
    model.context_length >= classification.context_length_required
  );

  if (candidateModels.length === 0) {
    throw new Error('No models match the specified criteria');
  }

  // Score and rank models
  const scoredModels = scoreModels(candidateModels, classification);
  
  // Select primary and fallback models
  const primary = scoredModels[0];
  const fallbacks = scoredModels.slice(1, 4); // Top 3 fallbacks

  return {
    primary,
    fallbacks,
    classification,
    total_candidates: candidateModels.length
  };
}

// Helper functions for classification
function estimateContextLength(prompt, context) {
  const baseLength = prompt.length * 1.2; // Rough tokens estimation
  const historyLength = context.history ? JSON.stringify(context.history).length * 0.5 : 0;
  return Math.ceil(baseLength + historyLength);
}

function detectMultilingual(prompt) {
  // Simple detection - look for non-Latin scripts or translation keywords
  const hasNonLatin = /[\u0080-\uFFFF]/.test(prompt);
  const hasTranslationWords = /\b(translate|translation|翻译|traduire|traducir|übersetzen)\b/i.test(prompt);
  return hasNonLatin || hasTranslationWords;
}

function detectSpecializedDomain(prompt) {
  if (isCodeRelated(prompt)) return 'code';
  if (isMathRelated(prompt)) return 'math';
  if (isTranslationRelated(prompt)) return 'multilingual';
  if (isCreativeWriting(prompt)) return 'creative';
  return 'general';
}

function isCodeRelated(prompt) {
  const codePatterns = [
    /\b(function|class|import|export|const|let|var|def|return|if|else|for|while)\b/i,
    /\b(python|javascript|java|cpp|html|css|sql|bash|shell)\b/i,
    /[{}();[\]]/,
    /\b(bug|debug|code|programming|algorithm|api|database|server)\b/i
  ];
  return codePatterns.some(pattern => pattern.test(prompt));
}

function isMathRelated(prompt) {
  const mathPatterns = [
    /\b(calculate|solve|equation|formula|mathematics|algebra|geometry|calculus)\b/i,
    /[+\-*/=<>∑∏∫]/,
    /\b(\d+\.?\d*\s*[+\-*/]\s*\d+\.?\d*)\b/,
    /\b(derivative|integral|limit|matrix|vector|proof)\b/i
  ];
  return mathPatterns.some(pattern => pattern.test(prompt));
}

function isTranslationRelated(prompt) {
  return /\b(translate|translation|from\s+\w+\s+to\s+\w+|in\s+\w+\s+language)\b/i.test(prompt);
}

function isCreativeWriting(prompt) {
  const creativePatterns = [
    /\b(story|poem|creative|imagine|write|draft|compose)\b/i,
    /\b(character|plot|narrative|dialogue|scene)\b/i,
    /\b(once upon a time|tell me a story|write a|create a)\b/i
  ];
  return creativePatterns.some(pattern => pattern.test(prompt));
}

function isLongFormAnalysis(prompt) {
  const longFormPatterns = [
    /\b(analyze|analysis|summarize|summary|explain|detailed|comprehensive)\b/i,
    /\b(report|essay|document|paper|article|research)\b/i,
    /\b(compare|contrast|evaluate|assess|review)\b/i
  ];
  return longFormPatterns.some(pattern => pattern.test(prompt)) || prompt.length > 500;
}

// Scoring helper functions
function calculateTaskMatch(model, tasks) {
  const matches = tasks.filter(task => model.primary_tasks.includes(task)).length;
  return matches / Math.max(tasks.length, 1);
}

function calculateLatencyScore(model, preference) {
  const latency = model.avg_latency_ms;
  switch (preference) {
    case 'fast':
      return Math.max(0, 1 - (latency / 2000)); // Prefer under 2s
    case 'balanced':
      return Math.max(0, 1 - (latency / 5000)); // Acceptable under 5s
    case 'quality':
      return latency < 10000 ? 0.8 : 0.4; // Quality over speed
    default:
      return 0.5;
  }
}

function calculateCostScore(model, preference) {
  const cost = model.cost_per_1k_tokens;
  switch (preference) {
    case 'cheap':
      return Math.max(0, 1 - (cost / 0.001)); // Prefer under $0.001/1k
    case 'balanced':
      return Math.max(0, 1 - (cost / 0.005)); // Acceptable under $0.005/1k
    case 'premium':
      return cost < 0.02 ? 0.8 : 0.4; // Quality worth cost
    default:
      return 0.5;
  }
}

function calculateContextFit(model, required) {
  if (model.context_length >= required * 2) return 1.0; // Plenty of headroom
  if (model.context_length >= required) return 0.8; // Just enough
  return 0.2; // Insufficient - should be filtered out
}

function calculateSpecializationScore(model, classification) {
  // Bonus for specialized models in their domain
  if (classification.specialized_domain === model.category) {
    return 1.0;
  }
  // Penalty for using specialized models outside their domain
  if (model.category !== 'general' && classification.specialized_domain !== model.category) {
    return 0.3;
  }
  return 0.6; // Neutral
}

module.exports = {
  classifyRequest,
  scoreModels,
  selectModel
};