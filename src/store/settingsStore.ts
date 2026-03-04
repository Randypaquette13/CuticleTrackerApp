import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalSettings } from '../types';

interface SettingsState extends GlobalSettings {
  update: (updates: Partial<GlobalSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      earlyTrackingWindowHours: 2,
      viewGroupedThingsInHome: false,
      showSearchBar: true,
      slideshowSpeedSeconds: 0.4,
      slideshowShowDate: true,
      update: (updates) => set((state) => ({ ...state, ...updates })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
