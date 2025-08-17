// src/components/SimpleEnhancedApp.tsx
import React, { useState } from 'react';

const SimpleEnhancedApp: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock routing result for demonstration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    
    // Simulate the enhanced routing system
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response showing the routing system
    const mockResponse = {
      answer: `Based on your request "${prompt}", I can help you with that. This response was generated using our intelligent model routing system.`,
      routing_info: {
        classification: {
          primary_tasks: prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('python') || prompt.toLowerCase().includes('function') ? ['code-gen', 'code-analysis'] : 
                        prompt.includes('x²') || prompt.includes('solve') || prompt.toLowerCase().includes('math') ? ['math-reasoning'] :
                        ['chat', 'reasoning'],
          specialized_domain: prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('python') || prompt.toLowerCase().includes('function') ? 'code' :
                             prompt.includes('x²') || prompt.includes('solve') || prompt.toLowerCase().includes('math') ? 'math' : 'general',
          latency_preference: 'balanced',
          cost_preference: 'balanced',
          multilingual: false,
          safety_level: 'standard'
        },
        selected_model: {
          id: 1,
          repo_id: prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('python') || prompt.toLowerCase().includes('function') ? 'codellama/CodeLlama-7b-Instruct-hf' :
                   prompt.includes('x²') || prompt.includes('solve') || prompt.toLowerCase().includes('math') ? 'meta-math/MetaMath-7B-V1.0' :
                   'meta-llama/Meta-Llama-3-8B-Instruct',
          category: prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('python') || prompt.toLowerCase().includes('function') ? 'code' :
                   prompt.includes('x²') || prompt.includes('solve') || prompt.toLowerCase().includes('math') ? 'math' : 'general',
          score: 0.87
        },
        fallback_used: false,
        safety_screening: {
          input: { safe: true, risks: [], action: 'allow', confidence: 0.95 }
        },
        total_latency_ms: 850,
        estimated_cost: 0.0023
      }
    };
    
    setResult(mockResponse);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Prompt Coach</h1>
          <p className="text-gray-600 mt-2">Enhanced with intelligent model routing</p>
        </div>

        {/* Main Interface */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Prompt</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Try asking about code, math, or general topics to see intelligent routing in action..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Try examples like: "How do I write a Python function?", "Solve x² + 5x - 6 = 0", or "Explain quantum computing"
              </p>
            </div>
            
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing with AI Routing...' : 'Send Prompt'}
            </button>
          </form>

          {result && (
            <div className="mt-6 space-y-4">
              {/* Response */}
              <div>
                <h3 className="text-lg font-medium mb-2">Response</h3>
                <div className="p-4 bg-gray-100 rounded-lg">
                  {result.answer}
                </div>
              </div>

              {/* Routing Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3">🎯 Intelligent Routing Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Selected Model</h4>
                    <div className="space-y-1">
                      <p><span className="text-gray-600">Model:</span> <code className="text-xs bg-white px-2 py-1 rounded">{result.routing_info.selected_model.repo_id}</code></p>
                      <p><span className="text-gray-600">Category:</span> <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{result.routing_info.selected_model.category}</span></p>
                      <p><span className="text-gray-600">Score:</span> <span className="font-mono text-xs">{(result.routing_info.selected_model.score * 100).toFixed(1)}%</span></p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Request Classification</h4>
                    <div className="space-y-1">
                      <p><span className="text-gray-600">Primary Tasks:</span></p>
                      <div className="flex flex-wrap gap-1">
                        {result.routing_info.classification.primary_tasks.map((task: string, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {task}
                          </span>
                        ))}
                      </div>
                      <p><span className="text-gray-600">Domain:</span> <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{result.routing_info.classification.specialized_domain}</span></p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Performance</h4>
                    <div className="space-y-1">
                      <p><span className="text-gray-600">Latency:</span> <span className="font-mono text-xs">{result.routing_info.total_latency_ms}ms</span></p>
                      <p><span className="text-gray-600">Est. Cost:</span> <span className="font-mono text-xs">${result.routing_info.estimated_cost.toFixed(4)}</span></p>
                      <p><span className="text-gray-600">Safety:</span> <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Safe</span></p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">System Status</h4>
                    <div className="space-y-1">
                      <p><span className="text-gray-600">Fallback Used:</span> <span className="text-green-600">{result.routing_info.fallback_used ? '✓' : '✗'}</span></p>
                      <p><span className="text-gray-600">Safety Level:</span> <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{result.routing_info.classification.safety_level}</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clear button */}
              <button
                onClick={() => {setResult(null); setPrompt('');}}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear and try another prompt
              </button>
            </div>
          )}
        </div>
        
        {/* System Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🚀 AI Model Routing System Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-medium">Intelligent Classification</h3>
              <p className="text-sm text-gray-600">Automatically detects request type (code, math, general) and routes to specialized models</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">🛡️</div>
              <h3 className="font-medium">Safety Screening</h3>
              <p className="text-sm text-gray-600">Input/output safety validation with PII detection and content moderation</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-medium">Performance Optimization</h3>
              <p className="text-sm text-gray-600">Cost and latency optimization with health monitoring and fallback systems</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleEnhancedApp;