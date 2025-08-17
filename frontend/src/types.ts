// src/types.ts
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: string;                 // uuid or timestamp string
  title: string;              // first 40 chars of first prompt
  messages: Message[];
  starred: boolean;
  updatedAt: number;          // unix ms
}

// Legacy response format for backward compatibility
export interface PromptResponse {
  answer: string;
}

// New enhanced response format
export interface EnhancedPromptResponse {
  answer: string;
  routing_info: {
    classification: {
      primary_tasks: string[];
      specialized_domain: string;
      context_length_required: number;
      latency_preference: string;
      cost_preference: string;
      multilingual: boolean;
      safety_level: string;
    };
    selected_model: {
      id: number;
      repo_id: string;
      category: string;
      score: number;
      score_factors: {
        task_match: number;
        latency: number;
        cost: number;
        context_fit: number;
        availability: number;
        specialization: number;
      };
    };
    fallback_used: boolean;
    safety_screening: {
      input: {
        safe: boolean;
        risks: any[];
        action: string;
        confidence: number;
      };
      output?: {
        safe: boolean;
        content: string;
        risks: any[];
        action: string;
        redacted: boolean;
      };
    };
    total_latency_ms: number;
    estimated_cost: number;
    debug_info?: any;
  };
}

export interface HistoryItem {
  id: string;
  prompt: string;
  answer?: string;
  routing_info?: any;
  createdAt?: string;
}

export interface ModelHealth {
  model_id: string;
  total_requests: number;
  success_rate: number;
  recent_success_rate: number;
  avg_latency_ms: number;
  consecutive_failures: number;
  availability_score: number;
  circuit_state: 'closed' | 'open' | 'half_open';
  last_success: string | null;
  last_failure: string | null;
  uptime_percentage: number;
}

export interface SystemStats {
  timestamp: string;
  total_models_tracked: number;
  healthy_models: number;
  degraded_models: number;
  unhealthy_models: number;
  model_health_details: ModelHealth[];
  system_status: 'operational' | 'degraded';
}
