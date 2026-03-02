import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThingsStore } from '../../src/store/thingsStore';
import { rescheduleAllNotifications } from '../../src/utils/notifications';

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { groups, things, updateGroup, deleteGroup, lastTracked } = useThingsStore();

  const group = groups.find((g) => g.id === id);

  const [name, setName] = useState(group?.displayName ?? '');
  const [reminderTime, setReminderTime] = useState(group?.reminderTime ?? '20:00');
  const [intervalDays, setIntervalDays] = useState(String(group?.intervalDays ?? 1));
  const [selectedIds, setSelectedIds] = useState<string[]>(group?.thingIds ?? []);

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Group not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const toggleMember = (thingId: string) => {
    setSelectedIds((prev) =>
      prev.includes(thingId)
        ? prev.filter((x) => x !== thingId)
        : [...prev, thingId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a group name.');
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(reminderTime)) {
      Alert.alert('Invalid time', 'Enter time as HH:MM (24-hour).');
      return;
    }
    const interval = parseInt(intervalDays, 10);
    if (isNaN(interval) || interval < 1) {
      Alert.alert('Invalid interval', 'Interval must be at least 1 day.');
      return;
    }
    updateGroup(id, {
      displayName: name.trim(),
      reminderTime,
      intervalDays: interval,
      thingIds: selectedIds,
    });
    rescheduleAllNotifications(
      useThingsStore.getState().things,
      useThingsStore.getState().groups,
      lastTracked
    );
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Group',
      `Delete the group "${group.displayName}"? The individual trackers won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGroup(id);
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
        <Text style={styles.headerTitle}>Edit Group</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. All Fingers"
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Reminder Time (HH:MM)</Text>
        <TextInput
          style={styles.input}
          value={reminderTime}
          onChangeText={setReminderTime}
          placeholder="20:00"
          placeholderTextColor="#555"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Interval (days)</Text>
        <TextInput
          style={styles.input}
          value={intervalDays}
          onChangeText={setIntervalDays}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor="#555"
        />

        {/* Members */}
        <Text style={[styles.label, { marginTop: 20 }]}>Members</Text>
        <Text style={styles.hint}>Select the trackers in this group.</Text>

        {things.map((thing) => {
          const isInAnotherGroup =
            thing.groupId && thing.groupId !== id && !selectedIds.includes(thing.id);
          const isMember = selectedIds.includes(thing.id);
          return (
            <TouchableOpacity
              key={thing.id}
              style={[
                styles.memberRow,
                isMember && styles.memberRowSelected,
                !!isInAnotherGroup && styles.memberRowDisabled,
              ]}
              onPress={() => !isInAnotherGroup && toggleMember(thing.id)}
              activeOpacity={isInAnotherGroup ? 1 : 0.7}
            >
              <View style={[styles.checkbox, isMember && styles.checkboxSelected]}>
                {isMember && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.memberName, !!isInAnotherGroup && styles.memberNameDisabled]}>
                {thing.displayName}
              </Text>
              {!!isInAnotherGroup && (
                <Text style={styles.inGroupLabel}>in another group</Text>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>🗑  Delete Group</Text>
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
  label: { color: '#ccc', fontSize: 14, fontWeight: '500', marginTop: 8 },
  hint: { color: '#555', fontSize: 12, marginBottom: 4 },
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  memberRowSelected: {
    backgroundColor: '#1e1636',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  memberRowDisabled: { opacity: 0.4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#555',
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  memberName: { color: '#e2e2e8', fontSize: 15, flex: 1 },
  memberNameDisabled: { color: '#888' },
  inGroupLabel: { color: '#666', fontSize: 12 },
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
