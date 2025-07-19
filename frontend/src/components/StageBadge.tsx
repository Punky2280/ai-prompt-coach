// src/components/StageBadge.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface Props {
  stage: 'GA' | 'Preview';
}

const StageBadge: React.FC<Props> = ({ stage }) => (
  <Badge variant={stage === 'GA' ? 'default' : 'secondary'}>
    {stage}
  </Badge>
);

export default StageBadge;

