// services/model-router-service.js
// ----------------------------------------------------------------
// Enhanced model routing service using the new routing system
// ----------------------------------------------------------------

const modelRouter = require('../utils/model-router');
const safetyLayer = require('../utils/safety-layer');
const { healthMonitor } = require('../utils/health-monitor');
const { generateText } = require('./gemini'); // Keep fallback to existing Gemini service

/**
 * Enhanced prompt processing with model routing, safety, and fallbacks
 * @param {string} prompt - User's input prompt  
 * @param {Object} options - Routing and processing options
 * @returns {Promise<Object>} Enhanced response with routing details
 */
async function processPrompt(prompt, options = {}) {
  const startTime = Date.now();
  
  const {
    user_id = null,
    conversation_history = [],
    safety_level = 'standard',
    latency_preference = 'balanced',
    cost_preference = 'balanced',
    max_cost_per_1k = null,
    max_latency_ms = null,
    force_serverless = false,
    debug = false
  } = options;

  const result = {
    answer: '',
    routing_info: {
      classification: null,
      selected_model: null,
      fallback_used: false,
      safety_screening: null,
      total_latency_ms: 0,
      estimated_cost: 0,
      debug_info: debug ? {} : undefined
    }
  };

  try {
    // Step 1: Safety screening of input
    console.log('🛡️  Screening input for safety violations...');
    const inputSafety = await safetyLayer.screenInput(prompt, safety_level);
    result.routing_info.safety_screening = {
      input: inputSafety
    };

    if (!inputSafety.safe) {
      return {
        ...result,
        answer: inputSafety.action === 'block' 
          ? "⚠️ Your request cannot be processed due to safety policy violations."
          : "⚠️ Your request has been flagged for review.",
        routing_info: {
          ...result.routing_info,
          blocked_by_safety: true
        }
      };
    }

    // Step 2: Request classification  
    console.log('🎯 Classifying request for optimal routing...');
    const classification = modelRouter.classifyRequest(prompt, {
      history: conversation_history,
      latency_preference,
      cost_preference,
      safety_level
    });
    result.routing_info.classification = classification;

    if (debug) {
      result.routing_info.debug_info.classification_details = classification;
    }

    // Step 3: Model selection with constraints
    console.log('🔍 Selecting optimal model...');
    const selectionOptions = {
      force_serverless,
      max_cost: max_cost_per_1k,
      max_latency: max_latency_ms,
      exclude_models: [] // Could add user blacklist
    };

    const selection = modelRouter.selectModel(classification, selectionOptions);
    result.routing_info.selected_model = selection.primary;

    if (debug) {
      result.routing_info.debug_info.selection_details = {
        total_candidates: selection.total_candidates,
        fallbacks: selection.fallbacks.map(f => ({ id: f.id, repo_id: f.repo_id, score: f.score }))
      };
    }

    // Step 4: Check model availability
    console.log('⚡ Checking model availability...');
    const availabilityStatus = healthMonitor.isModelAvailable(selection.primary.id.toString());
    
    if (!availabilityStatus.available) {
      console.log(`⚠️  Primary model ${selection.primary.repo_id} unavailable: ${availabilityStatus.reason}`);
      result.routing_info.fallback_used = true;
      
      // Try fallback models
      let selectedFallback = null;
      for (const fallback of selection.fallbacks) {
        const fallbackStatus = healthMonitor.isModelAvailable(fallback.id.toString());
        if (fallbackStatus.available) {
          selectedFallback = fallback;
          result.routing_info.selected_model = fallback;
          console.log(`🔄 Using fallback model: ${fallback.repo_id}`);
          break;
        }
      }
      
      if (!selectedFallback) {
        throw new Error('No available models found for request');
      }
    }

    // Step 5: Generate response (simplified - use existing Gemini service)
    console.log(`🤖 Generating response with model: ${result.routing_info.selected_model.repo_id}`);
    
    const generationStart = Date.now();
    let response;
    
    try {
      // For now, route everything through existing Gemini service
      // In production, this would route to appropriate model endpoints
      response = await generateText(prompt, {
        model: mapToGeminiModel(result.routing_info.selected_model),
        temperature: 0.7,
        maxOutputTokens: 1024
      });
      
      const generationLatency = Date.now() - generationStart;
      healthMonitor.recordSuccess(result.routing_info.selected_model.id.toString(), generationLatency);
      
    } catch (generationError) {
      const generationLatency = Date.now() - generationStart;
      healthMonitor.recordFailure(result.routing_info.selected_model.id.toString(), generationError.message);
      
      console.log(`❌ Generation failed with ${result.routing_info.selected_model.repo_id}: ${generationError.message}`);
      
      // Try fallback if not already using one
      if (!result.routing_info.fallback_used && selection.fallbacks.length > 0) {
        console.log('🔄 Attempting fallback due to generation failure...');
        const fallback = selection.fallbacks[0];
        result.routing_info.selected_model = fallback;
        result.routing_info.fallback_used = true;
        
        response = await generateText(prompt, {
          model: mapToGeminiModel(fallback),
          temperature: 0.7,
          maxOutputTokens: 1024
        });
      } else {
        throw generationError;
      }
    }

    // Step 6: Safety screening of output
    console.log('🛡️  Screening output for safety violations...');
    const outputSafety = await safetyLayer.screenOutput(response, safety_level);
    result.routing_info.safety_screening.output = outputSafety;
    
    result.answer = outputSafety.content;

    // Step 7: Calculate costs and metrics
    const totalLatency = Date.now() - startTime;
    result.routing_info.total_latency_ms = totalLatency;
    result.routing_info.estimated_cost = estimateCost(prompt, result.answer, result.routing_info.selected_model);

    console.log(`✅ Request completed in ${totalLatency}ms with model ${result.routing_info.selected_model.repo_id}`);

    if (debug) {
      result.routing_info.debug_info.performance = {
        total_latency_ms: totalLatency,
        model_health: healthMonitor.getModelHealth(result.routing_info.selected_model.id.toString())
      };
    }

  } catch (error) {
    console.error('❌ Prompt processing error:', error);
    
    // Record failure for selected model if available
    if (result.routing_info.selected_model) {
      healthMonitor.recordFailure(result.routing_info.selected_model.id.toString(), error.message);
    }
    
    // Ultimate fallback to original Gemini service
    console.log('🔄 Using ultimate fallback to Gemini...');
    try {
      result.answer = await generateText(prompt);
      result.routing_info.fallback_used = true;
      result.routing_info.ultimate_fallback = true;
    } catch (fallbackError) {
      result.answer = '❌ Unable to process your request at this time. Please try again later.';
      result.routing_info.error = {
        primary: error.message,
        fallback: fallbackError.message
      };
    }
    
    result.routing_info.total_latency_ms = Date.now() - startTime;
  }

  return result;
}

/**
 * Get routing statistics and health metrics
 * @returns {Object} System health and routing statistics
 */
function getRoutingStats() {
  const modelHealth = healthMonitor.getAllModelHealth();
  
  return {
    timestamp: new Date().toISOString(),
    total_models_tracked: modelHealth.length,
    healthy_models: modelHealth.filter(h => h.availability_score > 0.8).length,
    degraded_models: modelHealth.filter(h => h.availability_score > 0.5 && h.availability_score <= 0.8).length,
    unhealthy_models: modelHealth.filter(h => h.availability_score <= 0.5).length,
    model_health_details: modelHealth,
    system_status: modelHealth.length > 0 && modelHealth.some(h => h.availability_score > 0.5) ? 'operational' : 'degraded'
  };
}

// Helper functions
function mapToGeminiModel(selectedModel) {
  // Map our model selection to available Gemini models
  // This is a simplified mapping - in production you'd have proper provider routing
  if (selectedModel.category === 'code') {
    return 'gemini-1.5-pro'; // Use Pro for code tasks
  }
  if (selectedModel.approx_params.includes('70B') || selectedModel.approx_params.includes('180B')) {
    return 'gemini-1.5-pro'; // Use Pro for large model tasks
  }
  return 'gemini-1.5-flash'; // Default to Flash for speed
}

function estimateCost(prompt, response, model) {
  const promptTokens = Math.ceil(prompt.length / 4); // Rough estimation
  const responseTokens = Math.ceil(response.length / 4);
  const totalTokens = promptTokens + responseTokens;
  
  return (totalTokens / 1000) * (model.cost_per_1k_tokens || 0.0005);
}

module.exports = {
  processPrompt,
  getRoutingStats
};