// src/types/models.ts
export interface ModelCard {
  id: string;
  repo_id: string;
  name: string;
  family: string;
  category: string;
  approx_params: string;
  primary_tasks: string[];
  serverless_candidate: boolean;
  requires_endpoint: boolean;
  provider: string;
  cost_per_1k_tokens: number;
  avg_latency_ms: number;
  context_length: number;
  notes: string;
  description?: string;
  status?: 'healthy' | 'degraded' | 'unavailable';
}

export interface RoutingOptions {
  safety_level?: 'minimal' | 'standard' | 'strict';
  latency_preference?: 'fast' | 'balanced' | 'quality';
  cost_preference?: 'cheap' | 'balanced' | 'premium';
  max_cost_per_1k?: number;
  max_latency_ms?: number;
  force_serverless?: boolean;
  debug?: boolean;
}

export interface RoutingInfo {
  classification: {
    primary_tasks: string[];
    specialized_domain: string;
    context_length_required: number;
    latency_preference: string;
    cost_preference: string;
    multilingual: boolean;
    safety_level: string;
  };
  selected_model: ModelCard & {
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
}

export interface EnhancedResponse {
  answer: string;
  routing_info: RoutingInfo;
}