// src/store/models.ts
import { create } from 'zustand';
import { ModelCard } from '@/types/models';
import { modelCards } from '@/data/modelCards';

interface ModelState {
  selectedModelId?: string;
  setSelectedModel: (id: string) => void;
  getSelectedCard: () => ModelCard | undefined;
}

export const useModelStore = create<ModelState>()((set, get) => ({
  selectedModelId: undefined,
  setSelectedModel: (id) => set({ selectedModelId: id }),
  getSelectedCard: () =>
    modelCards.find((c) => c.id === get().selectedModelId),
}));
