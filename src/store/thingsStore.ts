import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThingToTrack, ThingToTrackGroup, DrawingOverlay, Photo } from '../types';
import { defaultFingers } from '../data/defaultFingers';

interface LastTrackedMap {
  [id: string]: string; // ISO timestamp of last track
}

interface ThingsState {
  things: ThingToTrack[];
  groups: ThingToTrackGroup[];
  lastTracked: LastTrackedMap;

  // ThingToTrack CRUD
  addThing: (thing: ThingToTrack) => void;
  updateThing: (id: string, updates: Partial<ThingToTrack>) => void;
  deleteThing: (id: string) => void;
  addPhotoToThing: (thingId: string, photo: Photo) => void;
  setOverlay: (thingId: string, overlay: DrawingOverlay | null) => void;

  // Group CRUD
  addGroup: (group: ThingToTrackGroup) => void;
  updateGroup: (id: string, updates: Partial<ThingToTrackGroup>) => void;
  deleteGroup: (id: string) => void;

  // Tracking
  markTracked: (id: string) => void;
  getLastTracked: (id: string) => string | undefined;
}

export const useThingsStore = create<ThingsState>()(
  persist(
    (set, get) => ({
      things: defaultFingers,
      groups: [],
      lastTracked: {},

      addThing: (thing) =>
        set((state) => ({ things: [...state.things, thing] })),

      updateThing: (id, updates) =>
        set((state) => ({
          things: state.things.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteThing: (id) =>
        set((state) => ({
          things: state.things.filter((t) => t.id !== id),
          groups: state.groups.map((g) => ({
            ...g,
            thingIds: g.thingIds.filter((tid) => tid !== id),
          })),
        })),

      addPhotoToThing: (thingId, photo) =>
        set((state) => ({
          things: state.things.map((t) =>
            t.id === thingId
              ? { ...t, photographs: [...t.photographs, photo] }
              : t
          ),
        })),

      setOverlay: (thingId, overlay) =>
        set((state) => ({
          things: state.things.map((t) =>
            t.id === thingId ? { ...t, overlay } : t
          ),
        })),

      addGroup: (group) =>
        set((state) => {
          // Assign groupId to all member things
          const updatedThings = state.things.map((t) =>
            group.thingIds.includes(t.id) ? { ...t, groupId: group.id } : t
          );
          return { groups: [...state.groups, group], things: updatedThings };
        }),

      updateGroup: (id, updates) =>
        set((state) => {
          const oldGroup = state.groups.find((g) => g.id === id);
          const newGroup = { ...oldGroup!, ...updates } as ThingToTrackGroup;

          // Reconcile groupId on things
          const removedIds = oldGroup
            ? oldGroup.thingIds.filter((tid) => !newGroup.thingIds.includes(tid))
            : [];
          const addedIds = oldGroup
            ? newGroup.thingIds.filter((tid) => !oldGroup.thingIds.includes(tid))
            : newGroup.thingIds;

          const updatedThings = state.things.map((t) => {
            if (removedIds.includes(t.id)) return { ...t, groupId: undefined };
            if (addedIds.includes(t.id)) return { ...t, groupId: id };
            return t;
          });

          return {
            groups: state.groups.map((g) => (g.id === id ? newGroup : g)),
            things: updatedThings,
          };
        }),

      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          things: state.things.map((t) =>
            t.groupId === id ? { ...t, groupId: undefined } : t
          ),
        })),

      markTracked: (id) =>
        set((state) => ({
          lastTracked: { ...state.lastTracked, [id]: new Date().toISOString() },
        })),

      getLastTracked: (id) => get().lastTracked[id],
    }),
    {
      name: 'things-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
