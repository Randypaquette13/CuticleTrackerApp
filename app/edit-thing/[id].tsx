import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThingsStore } from '../../src/store/thingsStore';
import { isDefaultFinger } from '../../src/data/defaultFingers';
import OverlayView from '../../src/components/OverlayView';
import TimePickerField from '../../src/components/TimePickerField';
import { rescheduleAllNotifications } from '../../src/utils/notifications';
import { deletePhoto } from '../../src/utils/photos';

export default function EditThingScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  const router = useRouter();
  const { things, groups, updateThing, deleteThing, clearLastTracked, lastTracked } = useThingsStore();

  const thing = things.find((t) => t.id === id);
  const showOverlaySection = !isDefaultFinger(id);

  const [name, setName] = useState(thing?.displayName ?? '');
  const [reminderTime, setReminderTime] = useState(thing?.reminderTime ?? '20:00');
  const [intervalDays, setIntervalDays] = useState(String(thing?.intervalDays ?? 1));

  if (!thing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Tracker not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(reminderTime)) {
      Alert.alert('Invalid time', 'Enter time as HH:MM (24-hour), e.g. 20:00');
      return;
    }
    const interval = parseInt(intervalDays, 10);
    if (isNaN(interval) || interval < 1) {
      Alert.alert('Invalid interval', 'Interval must be at least 1 day.');
      return;
    }

    updateThing(id, {
      displayName: name.trim(),
      reminderTime,
      intervalDays: interval,
    });

    rescheduleAllNotifications(
      useThingsStore.getState().things,
      groups,
      lastTracked
    );
    router.back();
  };

  const handleDeleteAllPhotos = () => {
    if (thing.photographs.length === 0) return;
    Alert.alert(
      'Delete All Pictures',
      `Remove all ${thing.photographs.length} photo(s) from "${thing.displayName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            for (const photo of thing.photographs) {
              await deletePhoto(photo.uri);
            }
            updateThing(id, { photographs: [] });
            clearLastTracked(id);
            rescheduleAllNotifications(
              useThingsStore.getState().things,
              groups,
              useThingsStore.getState().lastTracked
            );
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Tracker',
      `Delete "${thing.displayName}" and all its photos?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteThing(id);
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Tracker</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* Overlay preview (hidden for default 10 fingers — they use a fixed overlay) */}
        {showOverlaySection && (
          <View style={styles.overlaySection}>
            <Text style={styles.label}>Overlay Preview</Text>
            <View style={styles.overlayPreviewWrapper}>
              {thing.overlay ? (() => {
                const PREVIEW = 280;
                const photoUri = thing.photographs.at(-1)?.uri;
                return (
                  <View style={[styles.overlayPreview, { width: PREVIEW, height: PREVIEW }]}>
                    {photoUri ? (
                      <Image
                        source={{ uri: photoUri }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.overlayPreviewBg]} />
                    )}
                    <OverlayView
                      overlay={thing.overlay}
                      width={PREVIEW}
                      height={PREVIEW}
                      opacity={0.8}
                      centerCrop
                    />
                  </View>
                );
              })() : (
                <View style={[styles.overlayPreview, styles.overlayPreviewEmpty]}>
                  <Text style={styles.noOverlayText}>No overlay drawn</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.editOverlayBtn}
              onPress={() =>
                router.push({
                  pathname: '/draw-overlay/[id]',
                  params: { id },
                })
              }
            >
              <Text style={styles.editOverlayBtnText}>
                {thing.overlay ? '✏️ Edit Overlay' : '✏️ Draw Overlay'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Photo count info */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Photos taken</Text>
          <Text style={styles.infoValue}>{thing.photographs.length}</Text>
        </View>
        {thing.photographs.length > 0 && (
          <TouchableOpacity style={styles.deletePhotosBtn} onPress={handleDeleteAllPhotos}>
            <Text style={styles.deletePhotosBtnText}>🗑  Delete all pictures</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Left Index Finger"
          placeholderTextColor="#555"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <TimePickerField
          label="Reminder Time"
          value={reminderTime}
          onValueChange={setReminderTime}
          inputStyle={styles.input}
        />

        <Text style={styles.label}>Interval (days)</Text>
        <TextInput
          style={styles.input}
          value={intervalDays}
          onChangeText={setIntervalDays}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor="#555"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          selectTextOnFocus
        />

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>🗑  Delete Tracker</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  cancelText: { color: '#aaa', fontSize: 16 },
  headerTitle: { color: '#e2e2e8', fontSize: 17, fontWeight: '700' },
  saveText: { color: '#7c3aed', fontSize: 16, fontWeight: '700' },
  form: { padding: 20, gap: 8 },
  label: { color: '#ccc', fontSize: 14, fontWeight: '500', marginTop: 12 },
  input: {
    backgroundColor: '#1e1e2e',
    color: '#e2e2e8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    marginTop: 4,
  },
  overlaySection: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
    marginBottom: 8,
  },
  overlayPreviewWrapper: {
    alignItems: 'center',
  },
  overlayPreview: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  overlayPreviewEmpty: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayPreviewBg: {
    backgroundColor: '#1e1e2e',
  },
  noOverlayText: { color: '#444', fontSize: 13 },
  editOverlayBtn: {
    backgroundColor: '#2a2a3a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  editOverlayBtnText: { color: '#e2e2e8', fontSize: 15, fontWeight: '500' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  infoLabel: { color: '#aaa', fontSize: 14 },
  infoValue: { color: '#7c3aed', fontSize: 14, fontWeight: '600' },
  deletePhotosBtn: {
    backgroundColor: '#2a1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a2a2a',
  },
  deletePhotosBtnText: { color: '#ff8a80', fontSize: 14, fontWeight: '600' },
  deleteBtn: {
    marginTop: 32,
    backgroundColor: '#3a1a1a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5a2a2a',
  },
  deleteBtnText: { color: '#ff6b6b', fontSize: 15, fontWeight: '600' },
  errorText: { color: '#ccc', fontSize: 16, textAlign: 'center', padding: 32 },
  linkText: { color: '#7c3aed', fontSize: 16, textAlign: 'center' },
});
