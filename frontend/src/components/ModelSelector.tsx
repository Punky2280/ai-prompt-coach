// src/components/ModelSelector.tsx
import React from 'react';
import { modelCards } from '@/data/modelCards';
import { useModelStore } from '@/store/models';
import ModelCard from './ModelCard';

const ModelSelector: React.FC = () => {
  const { selectedModelId, setSelectedModel } = useModelStore();

  const families = [...new Set(modelCards.map(c => c.family))];

  return (
    <div className="space-y-8">
      {families.map(fam => (
        <section key={fam}>
          <h2 className="mb-4 text-xl font-bold">{fam}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modelCards
              .filter(c => c.family === fam)
              .map(c => (
                <ModelCard
                  key={c.id}
                  card={c}
                  selected={c.id === selectedModelId}
                  onSelect={setSelectedModel}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ModelSelector;
