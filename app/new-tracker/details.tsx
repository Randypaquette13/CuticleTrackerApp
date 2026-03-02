import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThingsStore } from '../../src/store/thingsStore';
import { ThingToTrack } from '../../src/types';

export default function NewTrackerDetails() {
  const router = useRouter();
  const { addThing } = useThingsStore();

  const [name, setName] = useState('');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [intervalDays, setIntervalDays] = useState('1');

  const handleNext = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }

    // Validate time format HH:MM
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

    const newThing: ThingToTrack = {
      id: `thing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      displayName: name.trim(),
      reminderTime,
      intervalDays: interval,
      overlay: null,
      photographs: [],
    };

    addThing(newThing);
    // Pass the new ID to the photo step
    router.push({ pathname: '/new-tracker/photo', params: { id: newThing.id } });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Tracker</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Step indicator */}
      <StepIndicator current={1} total={3} />

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.stepTitle}>Step 1: Details</Text>
        <Text style={styles.stepDesc}>
          Give your tracker a name and set your preferred reminder schedule.
        </Text>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Left Index Finger"
          placeholderTextColor="#555"
          autoFocus
          returnKeyType="next"
        />

        <Text style={styles.label}>Reminder Time (24-hr HH:MM)</Text>
        <TextInput
          style={styles.input}
          value={reminderTime}
          onChangeText={setReminderTime}
          placeholder="20:00"
          placeholderTextColor="#555"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Tracking Interval (days)</Text>
        <TextInput
          style={styles.input}
          value={intervalDays}
          onChangeText={setIntervalDays}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor="#555"
        />
        <Text style={styles.hint}>
          How many days between tracking sessions. Use 1 for daily.
        </Text>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Next: Take Photo →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.stepDot, i + 1 === current && styles.stepDotActive, i + 1 < current && styles.stepDotDone]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  backBtn: {
    minWidth: 60,
  },
  backText: {
    color: '#7c3aed',
    fontSize: 16,
  },
  headerTitle: {
    color: '#e2e2e8',
    fontSize: 17,
    fontWeight: '700',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2a2a3a',
    borderWidth: 1,
    borderColor: '#3a3a4a',
  },
  stepDotActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  stepDotDone: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  form: {
    padding: 20,
    gap: 8,
  },
  stepTitle: {
    color: '#e2e2e8',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDesc: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
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
  hint: {
    color: '#555',
    fontSize: 12,
    marginTop: 2,
  },
  nextBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
