// src/components/EnhancedApp.tsx
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ModelSelector from './ModelSelector';
import RoutingInfo from './RoutingInfo';
import { sendPrompt } from '@/api';
import { useModelStore } from '@/store/models';
import type { EnhancedPromptResponse } from '@/types';
import type { RoutingOptions } from '@/types/models';

const EnhancedApp: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<EnhancedPromptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRouting, setShowRouting] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  // Routing options
  const [routingOptions, setRoutingOptions] = useState<RoutingOptions>({
    safety_level: 'standard',
    latency_preference: 'balanced',
    cost_preference: 'balanced',
    force_serverless: false
  });

  const { selectedModelId, getSelectedCard } = useModelStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await sendPrompt(prompt.trim(), routingOptions, debugMode);
      setResponse(result);
      setShowRouting(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCard = getSelectedCard();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Prompt Coach</h1>
          <p className="text-gray-600 mt-2">Enhanced with intelligent model routing</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Model Selection & Options */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <ModelSelector />
                
                {selectedCard && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm">
                      <p className="font-medium">{selectedCard.name}</p>
                      <p className="text-gray-600 text-xs">{selectedCard.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedCard.approx_params}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {selectedCard.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Routing Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Safety Level</label>
                  <select 
                    className="w-full p-2 border rounded text-sm"
                    value={routingOptions.safety_level}
                    onChange={(e) => setRoutingOptions(prev => ({
                      ...prev,
                      safety_level: e.target.value as any
                    }))}
                  >
                    <option value="minimal">Minimal</option>
                    <option value="standard">Standard</option>
                    <option value="strict">Strict</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Latency Preference</label>
                  <select 
                    className="w-full p-2 border rounded text-sm"
                    value={routingOptions.latency_preference}
                    onChange={(e) => setRoutingOptions(prev => ({
                      ...prev,
                      latency_preference: e.target.value as any
                    }))}
                  >
                    <option value="fast">Fast</option>
                    <option value="balanced">Balanced</option>
                    <option value="quality">Quality</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cost Preference</label>
                  <select 
                    className="w-full p-2 border rounded text-sm"
                    value={routingOptions.cost_preference}
                    onChange={(e) => setRoutingOptions(prev => ({
                      ...prev,
                      cost_preference: e.target.value as any
                    }))}
                  >
                    <option value="cheap">Cheap</option>
                    <option value="balanced">Balanced</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="serverless"
                    checked={routingOptions.force_serverless}
                    onChange={(e) => setRoutingOptions(prev => ({
                      ...prev,
                      force_serverless: e.target.checked
                    }))}
                  />
                  <label htmlFor="serverless" className="text-sm">Force serverless</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="debug"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                  />
                  <label htmlFor="debug" className="text-sm">Debug mode</label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat Interface */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chat Interface</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your prompt here..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isLoading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Processing...' : 'Send Prompt'}
                  </button>
                </form>

                {error && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                {response && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Response</h3>
                      <div className="p-4 bg-gray-100 rounded-lg whitespace-pre-wrap">
                        {response.answer}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setShowRouting(!showRouting)}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        {showRouting ? 'Hide' : 'Show'} Routing Details
                      </button>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>⚡ {(response.routing_info.total_latency_ms / 1000).toFixed(2)}s</span>
                        <span>💰 ${response.routing_info.estimated_cost.toFixed(4)}</span>
                        {response.routing_info.fallback_used && (
                          <Badge variant="outline" className="text-xs">Fallback Used</Badge>
                        )}
                      </div>
                    </div>

                    {showRouting && <RoutingInfo routingInfo={response.routing_info} />}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedApp;