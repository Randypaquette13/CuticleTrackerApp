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
import { daysUntilNext } from '../utils/tracking';
import { useThingsStore } from '../store/thingsStore';

const CARD_SIZE = 150;
const MINI_OVERLAY_SIZE = 34;

interface Props {
  group: ThingToTrackGroup;
  things: ThingToTrack[];
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onLongPress?: () => void;
}

export default function GroupCard({
  group,
  things,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onLongPress,
}: Props) {
  const router = useRouter();
  const { lastTracked } = useThingsStore();

  const members = things.filter((t) => group.thingIds.includes(t.id));
  const daysLeft = daysUntilNext(group.reminderTime, group.intervalDays, lastTracked[group.id]);

  const handlePress = () => {
    if (isSelectMode) {
      onToggleSelect?.(group.id);
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Track Group', 'View Slideshows', 'Edit Group', 'Cancel'],
          cancelButtonIndex: 3,
          title: group.displayName,
        },
        (idx) => {
          if (idx === 0) router.push(`/track-group/${group.id}`);
          else if (idx === 1) router.push(`/slideshow/group-${group.id}`);
          else if (idx === 2) router.push(`/edit-group/${group.id}`);
        }
      );
    } else {
      Alert.alert(group.displayName, undefined, [
        { text: 'Track Group', onPress: () => router.push(`/track-group/${group.id}`) },
        { text: 'View Slideshows', onPress: () => router.push(`/slideshow/group-${group.id}`) },
        { text: 'Edit Group', onPress: () => router.push(`/edit-group/${group.id}`) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // Show up to 4 member overlays in a 2×2 mini grid
  const displayMembers = members.slice(0, 4);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelectMode && styles.cardSelectMode,
        isSelected && styles.cardSelected,
      ]}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      {/* Mini overlay grid */}
      <View style={[styles.miniGrid]}>
        {displayMembers.map((member) => (
          <View key={member.id} style={styles.miniOverlayWrapper}>
            {member.overlay ? (
              <OverlayView
                overlay={member.overlay}
                width={MINI_OVERLAY_SIZE}
                height={MINI_OVERLAY_SIZE}
                opacity={0.65}
                centerCrop
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

      {group.intervalDays > 1 && daysLeft > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Next in {daysLeft} days</Text>
        </View>
      )}

      <Text style={styles.name} numberOfLines={1}>
        {group.displayName}
      </Text>
      <Text style={styles.count}>
        {group.displayName === 'All Fingers'
          ? `${members.length} finger${members.length === 1 ? '' : 's'}`
          : `${members.length} tracked`}
      </Text>

      {isSelectMode && (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
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
  cardSelectMode: {
    borderColor: '#4a4a6a',
  },
  cardSelected: {
    borderColor: '#7c3aed',
    borderWidth: 2,
    backgroundColor: '#1e1636',
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
    marginBottom: 2,
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
  checkbox: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#555',
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
