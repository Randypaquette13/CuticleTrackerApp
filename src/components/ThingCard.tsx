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
import { ThingToTrack } from '../types';
import OverlayView from './OverlayView';
import { daysUntilNext, canTrackThing } from '../utils/tracking';
import { useThingsStore } from '../store/thingsStore';
import { useSettingsStore } from '../store/settingsStore';

const CARD_SIZE = 150;

interface Props {
  thing: ThingToTrack;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function ThingCard({
  thing,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: Props) {
  const router = useRouter();
  const { lastTracked } = useThingsStore();
  const { earlyTrackingWindowHours } = useSettingsStore();

  const last = lastTracked[thing.id];
  const daysLeft = daysUntilNext(thing.reminderTime, thing.intervalDays, last);
  const canTrack = canTrackThing(thing, earlyTrackingWindowHours, last);

  const handlePress = () => {
    if (isSelectMode) {
      onToggleSelect?.(thing.id);
      return;
    }

    const options = ['Track', 'View Slideshow', 'Edit', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 3,
          title: thing.displayName,
        },
        (idx) => {
          if (idx === 0 && canTrack)
            router.push(`/track-thing/${thing.id}`);
          else if (idx === 0)
            Alert.alert(
              'Not yet',
              `You can track ${thing.displayName} in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
            );
          else if (idx === 1)
            router.push(`/slideshow/${thing.id}`);
          else if (idx === 2)
            router.push(`/edit-thing/${thing.id}`);
        }
      );
    } else {
      Alert.alert(thing.displayName, undefined, [
        {
          text: 'Track',
          onPress: () => {
            if (canTrack) router.push(`/track-thing/${thing.id}`);
            else
              Alert.alert(
                'Not yet',
                `You can track in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`
              );
          },
        },
        {
          text: 'View Slideshow',
          onPress: () => router.push(`/slideshow/${thing.id}`),
        },
        { text: 'Edit', onPress: () => router.push(`/edit-thing/${thing.id}`) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelectMode && styles.cardSelectMode,
        isSelected && styles.cardSelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* Overlay preview centered in card */}
      <View style={styles.overlayArea}>
        {thing.overlay ? (
          <OverlayView
            overlay={thing.overlay}
            width={CARD_SIZE - 24}
            height={CARD_SIZE - 56}
            opacity={0.7}
          />
        ) : (
          <View style={styles.noOverlay}>
            <Text style={styles.noOverlayText}>No overlay</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {thing.displayName}
      </Text>

      {/* "Next in X Days" badge */}
      {thing.intervalDays > 1 && daysLeft > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Next in {daysLeft}d</Text>
        </View>
      )}

      {/* Select mode checkbox */}
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
    justifyContent: 'flex-end',
    padding: 8,
  },
  cardSelectMode: {
    borderColor: '#4a4a6a',
  },
  cardSelected: {
    borderColor: '#7c3aed',
    borderWidth: 2,
    backgroundColor: '#1e1636',
  },
  overlayArea: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    bottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noOverlayText: {
    color: '#555',
    fontSize: 11,
  },
  name: {
    color: '#e2e2e8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
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
