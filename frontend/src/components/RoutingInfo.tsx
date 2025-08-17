// src/components/RoutingInfo.tsx
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EnhancedPromptResponse } from '@/types';

interface Props {
  routingInfo: EnhancedPromptResponse['routing_info'];
}

const RoutingInfo: React.FC<Props> = ({ routingInfo }) => {
  const formatCost = (cost: number) => {
    if (cost < 0.001) return `$${(cost * 1000).toFixed(1)}‰`;
    return `$${cost.toFixed(4)}`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Routing Information</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Selected Model */}
          <div>
            <h4 className="font-medium mb-2">Selected Model</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Model:</span>
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  {routingInfo.selected_model.repo_id}
                </code>
                {routingInfo.fallback_used && (
                  <Badge variant="outline" className="text-xs">Fallback</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Score:</span>
                <span className="font-mono text-xs">
                  {(routingInfo.selected_model.score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Category:</span>
                <Badge variant="secondary" className="text-xs">
                  {routingInfo.selected_model.category}
                </Badge>
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <h4 className="font-medium mb-2">Request Classification</h4>
            <div className="space-y-1">
              <div>
                <span className="text-gray-600">Tasks:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {routingInfo.classification.primary_tasks.map(task => (
                    <Badge key={task} variant="outline" className="text-xs">
                      {task}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Domain:</span>
                <Badge variant="secondary" className="text-xs">
                  {routingInfo.classification.specialized_domain}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Multilingual:</span>
                <span className="text-xs">
                  {routingInfo.classification.multilingual ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <h4 className="font-medium mb-2">Performance</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Latency:</span>
                <span className="font-mono text-xs">
                  {formatLatency(routingInfo.total_latency_ms)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Est. Cost:</span>
                <span className="font-mono text-xs">
                  {formatCost(routingInfo.estimated_cost)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Context:</span>
                <span className="text-xs">
                  {routingInfo.classification.context_length_required} tokens
                </span>
              </div>
            </div>
          </div>

          {/* Safety */}
          <div>
            <h4 className="font-medium mb-2">Safety</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Input:</span>
                <Badge 
                  variant={routingInfo.safety_screening.input.safe ? "default" : "destructive"}
                  className="text-xs"
                >
                  {routingInfo.safety_screening.input.safe ? 'Safe' : 'Flagged'}
                </Badge>
              </div>
              {routingInfo.safety_screening.output && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Output:</span>
                  <Badge 
                    variant={routingInfo.safety_screening.output.safe ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {routingInfo.safety_screening.output.safe ? 'Safe' : 'Flagged'}
                  </Badge>
                  {routingInfo.safety_screening.output.redacted && (
                    <Badge variant="outline" className="text-xs">Redacted</Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Level:</span>
                <Badge variant="outline" className="text-xs">
                  {routingInfo.classification.safety_level}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Score Factors (collapsible details) */}
        {routingInfo.debug_info && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600">
              Debug Information
            </summary>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(routingInfo.debug_info, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

export default RoutingInfo;