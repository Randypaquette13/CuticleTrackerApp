import { ThingToTrack, ThingToTrackGroup } from '../types';

/** Returns the next scheduled Date for a tracker given its last tracked time. */
export function getNextTrackDate(
  reminderTime: string,
  intervalDays: number,
  lastTrackedISO?: string
): Date {
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const now = new Date();

  if (!lastTrackedISO) {
    // Never tracked — next reminder is today (or tomorrow if already past)
    const todayReminder = new Date(now);
    todayReminder.setHours(hours, minutes, 0, 0);
    if (todayReminder > now) return todayReminder;
    const tomorrow = new Date(todayReminder);
    tomorrow.setDate(tomorrow.getDate() + intervalDays);
    return tomorrow;
  }

  const lastTracked = new Date(lastTrackedISO);
  const nextDate = new Date(lastTracked);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

/** Number of full days until the next tracking date. Returns 0 if today or overdue. */
export function daysUntilNext(
  reminderTime: string,
  intervalDays: number,
  lastTrackedISO?: string
): number {
  const next = getNextTrackDate(reminderTime, intervalDays, lastTrackedISO);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** Returns true if the user is allowed to track right now.
 *  Allowed when: within earlyWindowHours before the next reminder,
 *  or the reminder is overdue and not yet tracked this interval. */
export function canTrackNow(
  reminderTime: string,
  intervalDays: number,
  earlyWindowHours: number,
  lastTrackedISO?: string
): boolean {
  const next = getNextTrackDate(reminderTime, intervalDays, lastTrackedISO);
  const now = new Date();
  const windowStart = new Date(next.getTime() - earlyWindowHours * 60 * 60 * 1000);
  return now >= windowStart;
}

/** If there are no photos, user can always track. Otherwise use interval + early window. */
export function canTrackThing(
  thing: ThingToTrack,
  earlyWindowHours: number,
  lastTrackedISO?: string
): boolean {
  if (thing.photographs.length === 0) return true;
  return canTrackNow(thing.reminderTime, thing.intervalDays, earlyWindowHours, lastTrackedISO);
}

/** If all members have no photos, user can always track the group. Otherwise use interval + early window. */
export function canTrackGroup(
  group: ThingToTrackGroup,
  earlyWindowHours: number,
  lastTrackedISO: string | undefined,
  memberThings: ThingToTrack[]
): boolean {
  const hasNoPhotos = memberThings.every((t) => t.photographs.length === 0);
  if (hasNoPhotos) return true;
  return canTrackNow(group.reminderTime, group.intervalDays, earlyWindowHours, lastTrackedISO);
}

/** Human-readable next track date/time, e.g. "Mar 5 at 8:00 PM". */
export function formatNextTrackDate(
  reminderTime: string,
  intervalDays: number,
  lastTrackedISO?: string
): string {
  const d = getNextTrackDate(reminderTime, intervalDays, lastTrackedISO);
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const timeStr = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
  const dateStr = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  return isToday ? `Today at ${timeStr}` : `${dateStr} at ${timeStr}`;
}

/** Whether a tracker has been tracked within its current interval. */
export function isTrackedThisInterval(
  intervalDays: number,
  lastTrackedISO?: string
): boolean {
  if (!lastTrackedISO) return false;
  const lastTracked = new Date(lastTrackedISO);
  const now = new Date();
  const diffMs = now.getTime() - lastTracked.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < intervalDays;
}
