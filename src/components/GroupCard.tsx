import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThingToTrackGroup, ThingToTrack } from '../types';
import OverlayView from './OverlayView';
import { daysUntilNext, canTrackGroup } from '../utils/tracking';
import { useThingsStore } from '../store/thingsStore';
import { useSettingsStore } from '../store/settingsStore';

const CARD_SIZE = 150;
const MINI_OVERLAY_SIZE = 34;

interface Props {
  group: ThingToTrackGroup;
  things: ThingToTrack[];
}

export default function GroupCard({ group, things }: Props) {
  const router = useRouter();
  const { lastTracked } = useThingsStore();
  const { earlyTrackingWindowHours } = useSettingsStore();

  const members = things.filter((t) => group.thingIds.includes(t.id));
  const last = lastTracked[group.id];
  const daysLeft = daysUntilNext(group.reminderTime, group.intervalDays, last);
  const canTrack = canTrackGroup(group, earlyTrackingWindowHours, last);

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Track Group', 'View Slideshows', 'Edit Group', 'Cancel'],
          cancelButtonIndex: 3,
          title: group.displayName,
        },
        (idx) => {
          if (idx === 0 && canTrack) router.push(`/track-group/${group.id}`);
          else if (idx === 0)
            Alert.alert(
              'Not yet',
              `You can track ${group.displayName} in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
            );
          else if (idx === 1) router.push(`/slideshow/group-${group.id}`);
          else if (idx === 2) router.push(`/edit-group/${group.id}`);
        }
      );
    } else {
      Alert.alert(group.displayName, undefined, [
        {
          text: 'Track Group',
          onPress: () => {
            if (canTrack) router.push(`/track-group/${group.id}`);
            else
              Alert.alert(
                'Not yet',
                `Next in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
              );
          },
        },
        {
          text: 'View Slideshows',
          onPress: () => router.push(`/slideshow/group-${group.id}`),
        },
        {
          text: 'Edit Group',
          onPress: () => router.push(`/edit-group/${group.id}`),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // Show up to 4 member overlays in a 2×2 mini grid
  const displayMembers = members.slice(0, 4);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* Mini overlay grid */}
      <View style={styles.miniGrid}>
        {displayMembers.map((member) => (
          <View key={member.id} style={styles.miniOverlayWrapper}>
            {member.overlay ? (
              <OverlayView
                overlay={member.overlay}
                width={MINI_OVERLAY_SIZE}
                height={MINI_OVERLAY_SIZE}
                opacity={0.65}
              />
            ) : (
              <View style={styles.miniPlaceholder} />
            )}
          </View>
        ))}
        {displayMembers.length === 0 && (
          <Text style={styles.emptyText}>No members</Text>
        )}
        {members.length > 4 && (
          <View style={styles.moreCount}>
            <Text style={styles.moreCountText}>+{members.length - 4}</Text>
          </View>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {group.displayName}
      </Text>
      <Text style={styles.count}>{members.length} fingers</Text>

      {group.intervalDays > 1 && daysLeft > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Next in {daysLeft}d</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    overflow: 'hidden',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  miniGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  miniOverlayWrapper: {
    width: MINI_OVERLAY_SIZE,
    height: MINI_OVERLAY_SIZE,
    borderRadius: 6,
    backgroundColor: '#2a2a3a',
    overflow: 'hidden',
    position: 'relative',
  },
  miniPlaceholder: {
    flex: 1,
    backgroundColor: '#2a2a3a',
  },
  emptyText: {
    color: '#555',
    fontSize: 11,
  },
  moreCount: {
    width: MINI_OVERLAY_SIZE,
    height: MINI_OVERLAY_SIZE,
    borderRadius: 6,
    backgroundColor: '#3a3a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCountText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
  },
  name: {
    color: '#e2e2e8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  count: {
    color: '#777',
    fontSize: 10,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#7c3aed88',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#d4bbff',
    fontSize: 10,
    fontWeight: '600',
  },
});
