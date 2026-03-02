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

export function canTrackThing(
  thing: ThingToTrack,
  earlyWindowHours: number,
  lastTrackedISO?: string
): boolean {
  return canTrackNow(thing.reminderTime, thing.intervalDays, earlyWindowHours, lastTrackedISO);
}

export function canTrackGroup(
  group: ThingToTrackGroup,
  earlyWindowHours: number,
  lastTrackedISO?: string
): boolean {
  return canTrackNow(group.reminderTime, group.intervalDays, earlyWindowHours, lastTrackedISO);
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
