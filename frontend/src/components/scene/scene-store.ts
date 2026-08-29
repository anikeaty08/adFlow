'use client';

import { create } from 'zustand';
import type { StoryStage } from './scene-types';

type SceneStore = {
  selectedNodeId: string | null;
  storyStage: StoryStage;
  setSelectedNodeId: (nodeId: string | null) => void;
  setStoryStage: (stage: StoryStage) => void;
};

export const useSceneStore = create<SceneStore>((set) => ({
  selectedNodeId: null,
  storyStage: 0,
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setStoryStage: (storyStage) => set({ storyStage }),
}));
