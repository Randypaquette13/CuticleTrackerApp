import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import CameraWithOverlay from '../../src/components/CameraWithOverlay';
import TrackingProgress from '../../src/components/TrackingProgress';
import { useThingsStore } from '../../src/store/thingsStore';
import { savePhoto } from '../../src/utils/photos';
import { rescheduleAllNotifications } from '../../src/utils/notifications';

export default function TrackGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { things, groups, addPhotoToThing, updateThing, markTracked, lastTracked } = useThingsStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const group = groups.find((g) => g.id === id);
  const members = group ? things.filter((t) => group.thingIds.includes(t.id)) : [];
  const currentThing = members[currentIndex];

  const [zoom, setZoom] = useState(currentThing?.savedZoom ?? 0);
  useEffect(() => {
    setZoom(currentThing?.savedZoom ?? 0);
  }, [currentThing?.id, currentThing?.savedZoom]);

  const handleCapture = async (photo: CameraCapturedPicture) => {
    if (saving || !currentThing) return;
    setSaving(true);
    try {
      const saved = await savePhoto(photo.uri, currentThing.id);
      addPhotoToThing(currentThing.id, saved);
      updateThing(currentThing.id, { savedZoom: zoom });
      markTracked(currentThing.id);

      if (currentIndex + 1 >= members.length) {
        // All done — mark group and return home
        markTracked(id);
        await rescheduleAllNotifications(
          useThingsStore.getState().things,
          groups,
          useThingsStore.getState().lastTracked
        );
        router.replace('/');
      } else {
        setCurrentIndex((i) => i + 1);
      }
    } catch {
      Alert.alert('Error', 'Could not save photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!group || members.length === 0) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Group not found or has no members.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraWithOverlay
        onCapture={handleCapture}
        overlay={currentThing?.overlay}
        zoom={zoom}
        onZoomChange={setZoom}
        disabled={saving}
        zoomLocked={(currentThing?.photographs.length ?? 0) > 0}
        key={currentThing?.id}
      />

      {/* Header + progress overlay */}
      <SafeAreaView style={styles.topOverlay} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{group.displayName}</Text>
          <View style={{ width: 32 }} />
        </View>
        <TrackingProgress
          current={currentIndex}
          total={members.length}
          label={currentThing?.displayName ?? ''}
        />
      </SafeAreaView>

      {/* Current item label */}
      <View style={styles.currentLabel}>
        <Text style={styles.currentLabelText}>
          {currentThing?.displayName}
        </Text>
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <Text style={styles.savingText}>Saving…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  currentLabel: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  currentLabelText: {
    color: '#ffffffcc',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: { color: '#ccc', fontSize: 16, textAlign: 'center' },
  backLink: { color: '#7c3aed', fontSize: 16 },
  permContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permTitle: { color: '#e2e2e8', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  permBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
