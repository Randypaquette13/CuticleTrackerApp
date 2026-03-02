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
import { useThingsStore } from '../../src/store/thingsStore';
import { savePhoto } from '../../src/utils/photos';
import { rescheduleAllNotifications } from '../../src/utils/notifications';

export default function TrackThingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { things, addPhotoToThing, updateThing, markTracked, groups, lastTracked } = useThingsStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [saving, setSaving] = useState(false);
  const thing = things.find((t) => t.id === id);
  const [zoom, setZoom] = useState(thing?.savedZoom ?? 0);

  useEffect(() => {
    setZoom(thing?.savedZoom ?? 0);
  }, [thing?.id, thing?.savedZoom]);

  const handleCapture = async (photo: CameraCapturedPicture) => {
    if (saving || !thing) return;
    setSaving(true);
    try {
      const saved = await savePhoto(photo.uri, id);
      addPhotoToThing(id, saved);
      updateThing(id, { savedZoom: zoom });
      markTracked(id);
      await rescheduleAllNotifications(
        useThingsStore.getState().things,
        groups,
        useThingsStore.getState().lastTracked
      );
      router.replace('/');
    } catch {
      Alert.alert('Error', 'Could not save photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
        overlay={thing?.overlay}
        zoom={zoom}
        onZoomChange={setZoom}
        disabled={saving}
        zoomLocked={(thing?.photographs.length ?? 0) > 0}
      />

      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{thing?.displayName ?? 'Track'}</Text>
          <View style={{ width: 32 }} />
        </View>
      </SafeAreaView>

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
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
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
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
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
