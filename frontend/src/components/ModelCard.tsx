// src/components/ModelCard.tsx
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import StageBadge from './StageBadge';
import { ModelCard as MC } from '@/types/models';

interface Props {
  card: MC;
  selected?: boolean;
  onSelect: (id: string) => void;
}

const ModelCard: React.FC<Props> = ({ card, selected, onSelect }) => (
  <Card
    className={`cursor-pointer transition hover:ring-2 hover:ring-primary ${
      selected ? 'ring-2 ring-primary' : ''
    }`}
    onClick={() => onSelect(card.id)}
  >
    <CardHeader className="flex justify-between">
      <div>
        <h3 className="font-semibold">{card.family} {card.version}</h3>
        <p className="text-sm text-muted-foreground">{card.id}</p>
      </div>
      <StageBadge stage={card.stage} />
    </CardHeader>

    <CardContent className="space-y-1 text-sm">
      <p>{card.description}</p>
      <p className="text-xs text-muted-foreground">
        {card.capabilities.filter(c => c.supported).map(c => c.label).join(' • ')}
      </p>
    </CardContent>
  </Card>
);

export default ModelCard;
