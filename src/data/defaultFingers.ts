import { ThingToTrack, DrawingOverlay } from '../types';

/** Arch curve representing the cuticle/nail bed line from a top-down self-portrait angle.
 *  Path drawn in a 100×100 coordinate space. The "n-shape" is a smooth inverted arch
 *  that traces the cuticle line, with short vertical sides completing the nail bed outline. */
function makeNailOverlay(): DrawingOverlay {
  return {
    canvasWidth: 100,
    canvasHeight: 100,
    strokes: [
      {
        id: 'default-arch',
        // Starts at bottom-left, up left side, arch across cuticle, down right side
        path: 'M 30 80 L 30 52 Q 50 18 70 52 L 70 80',
        color: '#FFFFFF',
        strokeWidth: 3,
        isEraser: false,
      },
    ],
  };
}

const FINGER_NAMES: { id: string; displayName: string }[] = [
  { id: 'finger-left-pinky', displayName: 'Left Pinky' },
  { id: 'finger-left-ring', displayName: 'Left Ring' },
  { id: 'finger-left-middle', displayName: 'Left Middle' },
  { id: 'finger-left-index', displayName: 'Left Index' },
  { id: 'finger-left-thumb', displayName: 'Left Thumb' },
  { id: 'finger-right-thumb', displayName: 'Right Thumb' },
  { id: 'finger-right-index', displayName: 'Right Index' },
  { id: 'finger-right-middle', displayName: 'Right Middle' },
  { id: 'finger-right-ring', displayName: 'Right Ring' },
  { id: 'finger-right-pinky', displayName: 'Right Pinky' },
];

export const DEFAULT_FINGER_IDS = new Set(FINGER_NAMES.map((f) => f.id));

export function isDefaultFinger(thingId: string): boolean {
  return DEFAULT_FINGER_IDS.has(thingId);
}

export const defaultFingers: ThingToTrack[] = FINGER_NAMES.map(({ id, displayName }) => ({
  id,
  displayName,
  reminderTime: '20:00', // 8 PM default
  intervalDays: 1,
  overlay: makeNailOverlay(),
  photographs: [],
}));
