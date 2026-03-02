import React, { useState } from 'react';
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

export default function NewTrackerPhoto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addPhotoToThing, things } = useThingsStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [saving, setSaving] = useState(false);

  const thing = things.find((t) => t.id === id);

  const handleCapture = async (photo: CameraCapturedPicture) => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await savePhoto(photo.uri, id);
      addPhotoToThing(id, saved);
      router.push({
        pathname: '/draw-overlay/[id]',
        params: { id, fromNewTracker: 'true' },
      });
    } catch (e) {
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
        <Text style={styles.permDesc}>
          Cuticle Tracker needs camera access to photograph your fingernails.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraWithOverlay onCapture={handleCapture} overlay={thing?.overlay} />

      {/* Header overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.stepInfo}>
            <Text style={styles.stepText}>Step 2 of 3</Text>
            <Text style={styles.stepSubtext}>Take initial photo</Text>
          </View>
          <View style={styles.backBtn} />
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    minWidth: 70,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  stepInfo: {
    alignItems: 'center',
  },
  stepText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  stepSubtext: {
    color: '#ccc',
    fontSize: 12,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  permContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permTitle: {
    color: '#e2e2e8',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  permDesc: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  permBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
