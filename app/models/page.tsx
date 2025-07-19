// src/app/models/page.tsx
import React from 'react';
import ModelSelector from '@/components/ModelSelector';

export default function ModelsPage() {
  return (
    <main className="container py-10">
      <h1 className="mb-8 text-3xl font-bold">Choose a Model</h1>
      <ModelSelector />
    </main>
  );
}
