// src/components/ModelCard.tsx
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModelCard as MC } from '@/types/models';

interface Props {
  card: MC;
  selected?: boolean;
  onSelect: (id: string) => void;
}

const ModelCard: React.FC<Props> = ({ card, selected, onSelect }) => {
  const formatCost = (cost: number) => {
    if (cost < 0.001) return `$${(cost * 1000).toFixed(1)}‰`;
    return `$${cost.toFixed(4)}/1k`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-blue-500 hover:shadow-md ${
        selected ? 'ring-2 ring-blue-500 shadow-md' : ''
      }`}
      onClick={() => onSelect(card.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{card.name}</h3>
            <p className="text-sm text-gray-500 truncate">{card.repo_id}</p>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            <Badge variant="outline" className="text-xs">
              {card.approx_params}
            </Badge>
            {card.status && (
              <Badge className={`text-xs ${getStatusColor(card.status)}`}>
                {card.status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          <p className="text-sm text-gray-600 line-clamp-2">
            {card.description || card.notes}
          </p>
          
          <div className="flex flex-wrap gap-1">
            {card.primary_tasks.slice(0, 3).map(task => (
              <Badge key={task} variant="secondary" className="text-xs">
                {task}
              </Badge>
            ))}
            {card.primary_tasks.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{card.primary_tasks.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex justify-between text-xs text-gray-500 pt-1">
            <div className="flex items-center gap-2">
              <span>⚡ {formatLatency(card.avg_latency_ms)}</span>
              <span>💰 {formatCost(card.cost_per_1k_tokens)}</span>
            </div>
            <div className="flex items-center gap-1">
              {card.serverless_candidate && (
                <Badge variant="outline" className="text-xs">☁️</Badge>
              )}
              {card.requires_endpoint && (
                <Badge variant="outline" className="text-xs">🔌</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelCard;
