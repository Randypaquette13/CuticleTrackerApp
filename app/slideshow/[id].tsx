import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThingsStore } from '../../src/store/thingsStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { Photo, ThingToTrack } from '../../src/types';

const { width: SCREEN_W } = Dimensions.get('window');

export default function SlideshowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { things, groups } = useThingsStore();
  const { slideshowSpeedSeconds, slideshowShowDate } = useSettingsStore();

  // id can be a thingId OR "group-{groupId}"
  const isGroup = id?.startsWith('group-');
  const groupId = isGroup ? id.replace('group-', '') : null;
  const group = groupId ? groups.find((g) => g.id === groupId) : null;
  const groupMembers = group
    ? things.filter((t) => group.thingIds.includes(t.id))
    : [];

  const singleThing = !isGroup ? things.find((t) => t.id === id) : null;

  // For groups: which member are we viewing?
  const [selectedMember, setSelectedMember] = useState<ThingToTrack | null>(
    groupMembers[0] ?? null
  );
  const [memberPickerVisible, setMemberPickerVisible] = useState(isGroup);

  const activeThing = isGroup ? selectedMember : singleThing;
  const photos: Photo[] = activeThing?.photographs ?? [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear timer on unmount or when playing state changes
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isPlaying || photos.length <= 1) return;
    timerRef.current = setInterval(() => {
      crossFadeTo((prev) => (prev + 1) % photos.length);
    }, slideshowSpeedSeconds * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, photos.length, slideshowSpeedSeconds]);

  const crossFadeTo = (getNext: (prev: number) => number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIdx((prev) => {
        const next = getNext(prev);
        return next;
      });
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const goNext = () => crossFadeTo((p) => (p + 1) % photos.length);
  const goPrev = () => crossFadeTo((p) => (p - 1 + photos.length) % photos.length);

  const currentPhoto = photos[currentIdx];
  const formattedDate = currentPhoto
    ? new Date(currentPhoto.capturedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {activeThing?.displayName ?? group?.displayName ?? 'Slideshow'}
        </Text>
        {isGroup && (
          <TouchableOpacity onPress={() => setMemberPickerVisible(true)}>
            <Text style={styles.switchText}>Switch</Text>
          </TouchableOpacity>
        )}
        {!isGroup && <View style={{ width: 50 }} />}
      </View>

      {/* Photo area */}
      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos yet.</Text>
          <Text style={styles.emptyHint}>Start tracking to build your slideshow!</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.photoArea}
            onPress={() => setIsPlaying((p) => !p)}
            activeOpacity={1}
          >
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
              <Image
                source={{ uri: currentPhoto?.uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Date overlay */}
            {slideshowShowDate && currentPhoto && (
              <View style={styles.dateOverlay}>
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
            )}

            {/* Play/pause hint */}
            {!isPlaying && (
              <View style={styles.playHint}>
                <Text style={styles.playHintText}>▶ Tap to Play</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={goPrev}
              disabled={photos.length <= 1}
            >
              <Text style={styles.controlText}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, styles.playBtn]}
              onPress={() => setIsPlaying((p) => !p)}
            >
              <Text style={styles.playBtnText}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={goNext}
              disabled={photos.length <= 1}
            >
              <Text style={styles.controlText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Photo count */}
          <Text style={styles.photoCount}>
            {currentIdx + 1} / {photos.length}
          </Text>
        </>
      )}

      {/* Member picker for groups */}
      <Modal
        visible={memberPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (selectedMember) setMemberPickerVisible(false);
        }}
      >
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => {
            if (selectedMember) setMemberPickerVisible(false);
          }}
        >
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Select Finger</Text>
            <FlatList
              data={groupMembers}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedMember?.id === item.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedMember(item);
                    setCurrentIdx(0);
                    setIsPlaying(false);
                    setMemberPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.displayName}</Text>
                  <Text style={styles.pickerItemCount}>
                    {item.photographs.length} photo{item.photographs.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0f0f1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  backText: { color: '#aaa', fontSize: 20 },
  title: { color: '#e2e2e8', fontSize: 16, fontWeight: '600' },
  switchText: { color: '#7c3aed', fontSize: 14, fontWeight: '600' },
  photoArea: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  dateOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateText: { color: '#ffffffcc', fontSize: 13 },
  playHint: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  playHintText: { color: '#ffffffaa', fontSize: 15 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 16,
    backgroundColor: '#0f0f1a',
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  playBtn: { backgroundColor: '#7c3aed', width: 58, height: 58, borderRadius: 29 },
  playBtnText: { fontSize: 22 },
  photoCount: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    paddingBottom: 16,
    backgroundColor: '#0f0f1a',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyText: { color: '#aaa', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: '#555', fontSize: 14, textAlign: 'center' },
  // Member picker
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  pickerTitle: { color: '#e2e2e8', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  pickerItemSelected: { backgroundColor: '#1e1636' },
  pickerItemText: { color: '#e2e2e8', fontSize: 16 },
  pickerItemCount: { color: '#666', fontSize: 14 },
});
