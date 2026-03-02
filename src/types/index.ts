export interface Photo {
  id: string;
  uri: string;
  capturedAt: string; // ISO timestamp
}

export interface DrawStroke {
  id: string;
  /** SVG path data string, e.g. "M 10 20 L 50 80 L 90 20" */
  path: string;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
}

export interface DrawingOverlay {
  strokes: DrawStroke[];
  /** Reference canvas dimensions the paths were drawn in */
  canvasWidth: number;
  canvasHeight: number;
}

export interface ThingToTrack {
  id: string;
  displayName: string;
  /** Time of day in "HH:MM" 24-hour format */
  reminderTime: string;
  /** How many days between tracked sessions */
  intervalDays: number;
  overlay: DrawingOverlay | null;
  photographs: Photo[];
  /** Set when this item belongs to a group */
  groupId?: string;
}

export interface ThingToTrackGroup {
  id: string;
  displayName: string;
  reminderTime: string;
  intervalDays: number;
  thingIds: string[];
}

export interface GlobalSettings {
  earlyTrackingWindowHours: number;
  viewGroupedThingsInHome: boolean;
  showSearchBar: boolean;
  slideshowSpeedSeconds: number;
  slideshowShowDate: boolean;
}
