import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Dimensions,
  Animated,
  PanResponder,
  Easing,
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isPlaying || photos.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % photos.length);
    }, slideshowSpeedSeconds * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, photos.length, slideshowSpeedSeconds]);

  const goNext = () => setCurrentIdx((p) => (p + 1) % photos.length);
  const goPrev = () => setCurrentIdx((p) => (p - 1 + photos.length) % photos.length);
  const goFirst = () => setCurrentIdx(0);
  const goLast = () => setCurrentIdx(Math.max(0, photos.length - 1));

  const memberIndex = activeThing ? groupMembers.findIndex((m) => m.id === activeThing.id) : -1;
  const hasPrevMember = isGroup && groupMembers.length > 1 && memberIndex > 0;
  const hasNextMember = isGroup && groupMembers.length > 1 && memberIndex >= 0 && memberIndex < groupMembers.length - 1;
  const goPrevMember = useCallback(() => {
    if (!hasPrevMember) return;
    setSelectedMember(groupMembers[memberIndex - 1]);
    setCurrentIdx(0);
    setIsPlaying(false);
  }, [hasPrevMember, groupMembers, memberIndex]);
  const goNextMember = useCallback(() => {
    if (!hasNextMember) return;
    setSelectedMember(groupMembers[memberIndex + 1]);
    setCurrentIdx(0);
    setIsPlaying(false);
  }, [hasNextMember, groupMembers, memberIndex]);

  const FADE_DELAY_MS = 500;

  const dotOpacity = useRef(new Animated.Value(1)).current;
  const dotFadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleDotFade = useCallback(() => {
    if (dotFadeTimeout.current) clearTimeout(dotFadeTimeout.current);
    dotOpacity.setValue(1);
    dotFadeTimeout.current = setTimeout(() => {
      Animated.timing(dotOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      dotFadeTimeout.current = null;
    }, FADE_DELAY_MS);
  }, [dotOpacity]);

  const playHintOpacity = useRef(new Animated.Value(1)).current;
  const playHintFadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePlayHintFade = useCallback(() => {
    if (playHintFadeTimeout.current) clearTimeout(playHintFadeTimeout.current);
    playHintOpacity.setValue(1);
    playHintFadeTimeout.current = setTimeout(() => {
      Animated.timing(playHintOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      playHintFadeTimeout.current = null;
    }, FADE_DELAY_MS);
  }, [playHintOpacity]);

  useEffect(() => {
    return () => {
      if (dotFadeTimeout.current) clearTimeout(dotFadeTimeout.current);
      if (playHintFadeTimeout.current) clearTimeout(playHintFadeTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (isGroup && groupMembers.length > 1) scheduleDotFade();
  }, [isGroup, groupMembers.length, memberIndex, scheduleDotFade]);

  useEffect(() => {
    if (photos.length === 0) return;
    schedulePlayHintFade();
  }, [memberIndex, photos.length, schedulePlayHintFade]);

  const dragX = useRef(new Animated.Value(0)).current;

  // Overlay transition: the incoming member's photo is rendered on top of the carousel
  // and slides in from off-screen. We call transitionX.setValue() BEFORE calling
  // setPendingTransition so the native thread has the off-screen position ready when the
  // overlay view is first created — this is the only reliable way to avoid a one-frame flash
  // with useNativeDriver:true (setValue crosses the JS→native bridge asynchronously, but a
  // newly-mounted native view reads the Animated.Value's current JS state at creation time).
  const transitionX = useRef(new Animated.Value(SCREEN_W)).current;
  const transitionActiveRef = useRef(false);
  const [pendingTransition, setPendingTransition] = useState<{
    dir: 'prev' | 'next';
    photo: Photo | null;
  } | null>(null);

  // Declare before swipePan so we can close over prevPhoto/nextPhoto in the release handler.
  const currentPhoto = photos[currentIdx];
  const prevMember = hasPrevMember ? groupMembers[memberIndex - 1] : null;
  const nextMember = hasNextMember ? groupMembers[memberIndex + 1] : null;
  const prevPhoto = prevMember?.photographs?.[0] ?? null;
  const nextPhoto = nextMember?.photographs?.[0] ?? null;

  // Start the slide-in animation once the overlay has mounted. useEffect fires after paint,
  // so by the time it runs the overlay is already sitting off-screen and invisible to the user.
  useEffect(() => {
    if (!pendingTransition) return;
    const startX = pendingTransition.dir === 'next' ? SCREEN_W : -SCREEN_W;
    transitionX.setValue(startX);
    Animated.timing(transitionX, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (pendingTransition.dir === 'next') goNextMember();
      else goPrevMember();
      dragX.setValue(0);
      transitionActiveRef.current = false;
      setPendingTransition(null);
      scheduleDotFade();
    });
  }, [pendingTransition, goNextMember, goPrevMember, dragX, transitionX, scheduleDotFade]);

  const swipePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          isGroup && groupMembers.length > 1 && Math.abs(g.dx) > 20 && !transitionActiveRef.current,
        onPanResponderMove: (_, g) => {
          if (!isGroup || groupMembers.length <= 1) return;
          let dx = g.dx;
          const maxDrag = SCREEN_W * 0.5;
          if (!hasPrevMember) dx = Math.min(0, Math.max(-maxDrag, dx));
          else if (!hasNextMember) dx = Math.max(0, Math.min(maxDrag, dx));
          else dx = Math.max(-maxDrag, Math.min(maxDrag, dx));
          dragX.setValue(dx);
        },
        onPanResponderRelease: (_, g) => {
          if (!isGroup || groupMembers.length <= 1) return;
          const { dx } = g;
          const threshold = 50;
          if (dx > threshold && hasPrevMember) {
            // Set off-screen position BEFORE setPendingTransition mounts the overlay.
            // The native view will be created with this value already applied.
            transitionX.setValue(-SCREEN_W);
            dragX.setValue(0);
            transitionActiveRef.current = true;
            setPendingTransition({ dir: 'prev', photo: prevPhoto });
          } else if (dx < -threshold && hasNextMember) {
            transitionX.setValue(SCREEN_W);
            dragX.setValue(0);
            transitionActiveRef.current = true;
            setPendingTransition({ dir: 'next', photo: nextPhoto });
          } else {
            Animated.spring(dragX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 14,
            }).start();
          }
        },
      }),
    [isGroup, groupMembers.length, hasPrevMember, hasNextMember, goPrevMember, goNextMember, scheduleDotFade, dragX, transitionX, prevPhoto, nextPhoto]
  );

  // If more than one photo was taken on the same calendar date, show time too
  const dateOnly = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const countOnSameDate = currentPhoto
    ? photos.filter((p) => dateOnly(p.capturedAt) === dateOnly(currentPhoto.capturedAt)).length
    : 0;
  const showTime = countOnSameDate > 1;
  const formattedDate = currentPhoto
    ? new Date(currentPhoto.capturedAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(showTime ? { hour: 'numeric', minute: '2-digit' } : {}),
      })
    : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {activeThing?.displayName ?? group?.displayName ?? 'Slideshow'}
        </Text>
        {isGroup && (
          <TouchableOpacity
            onPress={() => setMemberPickerVisible(true)}
            style={styles.headerSwitchBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>Switch</Text>
          </TouchableOpacity>
        )}
        {!isGroup && <View style={styles.headerSpacer} />}
      </View>

      {/* Photo area */}
      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos yet.</Text>
          <Text style={styles.emptyHint}>Start tracking to build your slideshow!</Text>
        </View>
      ) : (
        <>
          <View style={styles.photoAreaWrapper} {...(isGroup && groupMembers.length > 1 ? swipePan.panHandlers : {})}>
            {isGroup && groupMembers.length > 1 ? (
              <View style={styles.carouselClip}>
                <Animated.View
                  style={[
                    styles.carouselRow,
                    { width: SCREEN_W * 3, transform: [{ translateX: Animated.add(-SCREEN_W, dragX) }] },
                  ]}
                >
                  {/* Left: previous member's first photo */}
                  <View style={[styles.carouselPanel, { width: SCREEN_W }]}>
                    <Image
                      source={{ uri: (prevPhoto ?? currentPhoto)?.uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="contain"
                    />
                  </View>
                  {/* Center: current member's current photo */}
                  <TouchableOpacity
                    style={[styles.carouselPanel, styles.photoArea, { width: SCREEN_W }]}
                    onPress={() => setIsPlaying((p) => !p)}
                    activeOpacity={1}
                  >
                    <View style={StyleSheet.absoluteFill}>
                      <Image
                        source={{ uri: currentPhoto?.uri }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="contain"
                      />
                    </View>
                    {slideshowShowDate && currentPhoto && (
                      <View style={styles.dateOverlay}>
                        <Text style={styles.dateText}>{formattedDate}</Text>
                      </View>
                    )}
                    {!isPlaying && (
                      <Animated.View style={[styles.playHint, { opacity: playHintOpacity }]} pointerEvents="none">
                        <Text style={styles.playHintText}>▶ Tap to Play</Text>
                      </Animated.View>
                    )}
                  </TouchableOpacity>
                  {/* Right: next member's first photo */}
                  <View style={[styles.carouselPanel, { width: SCREEN_W }]}>
                    <Image
                      source={{ uri: (nextPhoto ?? currentPhoto)?.uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="contain"
                    />
                  </View>
                </Animated.View>
                {/* Group member dot indicator — fades after 0.5s */}
                <Animated.View style={[styles.memberDots, { opacity: dotOpacity }]} pointerEvents="none">
                  {groupMembers.map((m, i) => (
                    <View
                      key={m.id}
                      style={[styles.memberDot, i === memberIndex && styles.memberDotActive]}
                    />
                  ))}
                </Animated.View>
                {/* Transition overlay: incoming member's photo slides in on top of the carousel.
                    transitionX is set off-screen before this mounts, so the native view is created
                    at the correct off-screen position — zero chance of flashing the old image. */}
                {pendingTransition && (
                  <Animated.View
                    style={[StyleSheet.absoluteFill, { transform: [{ translateX: transitionX }] }]}
                    pointerEvents="none"
                  >
                    <Image
                      source={{ uri: pendingTransition.photo?.uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="contain"
                    />
                  </Animated.View>
                )}
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.photoArea}
                  onPress={() => setIsPlaying((p) => !p)}
                  activeOpacity={1}
                >
                  <View style={StyleSheet.absoluteFill}>
                    <Image
                      source={{ uri: currentPhoto?.uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="contain"
                    />
                  </View>
                  {slideshowShowDate && currentPhoto && (
                    <View style={styles.dateOverlay}>
                      <Text style={styles.dateText}>{formattedDate}</Text>
                    </View>
                  )}
                  {!isPlaying && (
                    <Animated.View style={[styles.playHint, { opacity: playHintOpacity }]} pointerEvents="none">
                      <Text style={styles.playHintText}>▶ Tap to Play</Text>
                    </Animated.View>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlBtn, styles.sideControlBtn, photos.length <= 1 && styles.controlBtnDisabled]}
              onPress={goFirst}
              disabled={photos.length <= 1}
            >
              <Text style={styles.controlDoubleArrow}>|◀</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, photos.length <= 1 && styles.controlBtnDisabled]}
              onPress={goPrev}
              disabled={photos.length <= 1}
            >
              <Text style={styles.controlArrow}>‹</Text>
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
              style={[styles.controlBtn, photos.length <= 1 && styles.controlBtnDisabled]}
              onPress={goNext}
              disabled={photos.length <= 1}
            >
              <Text style={styles.controlArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, styles.sideControlBtn, photos.length <= 1 && styles.controlBtnDisabled]}
              onPress={goLast}
              disabled={photos.length <= 1}
            >
              <Text style={styles.controlDoubleArrow}>▶|</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#0f0f1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  headerBackBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  headerSwitchBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginRight: 8,
  },
  headerSpacer: { width: 44, marginRight: 8 },
  backText: { color: '#aaa', fontSize: 20 },
  title: { color: '#e2e2e8', fontSize: 16, fontWeight: '600' },
  switchText: { color: '#7c3aed', fontSize: 14, fontWeight: '600' },
  photoAreaWrapper: { flex: 1 },
  carouselClip: {
    flex: 1,
    overflow: 'hidden',
  },
  carouselRow: {
    flexDirection: 'row',
    height: '100%',
  },
  carouselPanel: {
    height: '100%',
    backgroundColor: '#0a0a14',
  },
  photoArea: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  memberDots: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  memberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  memberDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
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
  sideControlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    paddingVertical: 2,
  },
  controlBtnDisabled: { opacity: 0.4 },
  controlText: { color: '#fff', fontSize: 20, lineHeight: 24 },
  controlArrow: { color: '#fff', fontSize: 28, lineHeight: 32 },
  controlDoubleArrow: { color: '#fff', fontSize: 18, lineHeight: 22 },
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
