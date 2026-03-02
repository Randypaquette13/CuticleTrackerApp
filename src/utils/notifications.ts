import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { ThingToTrack, ThingToTrackGroup } from '../types';
import { isTrackedThisInterval } from './tracking';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Parse "HH:MM" into { hour, minute } */
function parseTime(reminderTime: string): { hour: number; minute: number } {
  const [hour, minute] = reminderTime.split(':').map(Number);
  return { hour, minute };
}

/** Cancel all previously scheduled cuticle tracker notifications, then re-schedule them. */
export async function rescheduleAllNotifications(
  things: ThingToTrack[],
  groups: ThingToTrackGroup[],
  lastTracked: Record<string, string>
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Schedule for standalone things (not in any group)
  for (const thing of things) {
    if (thing.groupId) continue; // group handles this
    if (isTrackedThisInterval(thing.intervalDays, lastTracked[thing.id])) continue;

    const { hour, minute } = parseTime(thing.reminderTime);
    await Notifications.scheduleNotificationAsync({
      identifier: `thing-${thing.id}`,
      content: {
        title: 'Cuticle Tracker',
        body: `Time to track: ${thing.displayName}`,
        data: { type: 'thing', id: thing.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });
  }

  // Schedule for groups
  for (const group of groups) {
    if (isTrackedThisInterval(group.intervalDays, lastTracked[group.id])) continue;

    const { hour, minute } = parseTime(group.reminderTime);
    await Notifications.scheduleNotificationAsync({
      identifier: `group-${group.id}`,
      content: {
        title: 'Cuticle Tracker',
        body: `Time to track: ${group.displayName}`,
        data: { type: 'group', id: group.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });
  }
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
