import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

/** Parse "HH:MM" into a Date (today at that time, local). */
function dateFromHHMM(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(isNaN(h) ? 20 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

/** Format Date to "HH:MM" 24-hour. */
function dateToHHMM(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format "HH:MM" for display (e.g. "8:00 PM"). */
function formatDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '8:00 PM';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

interface TimePickerFieldProps {
  /** Value in "HH:MM" 24-hour format. */
  value: string;
  onValueChange: (hhmm: string) => void;
  label?: string;
  style?: object;
  inputStyle?: object;
}

/**
 * Touchable that opens the native iOS alarm-style (spinner) time picker.
 * Value is stored and passed as "HH:MM" 24-hour.
 */
export default function TimePickerField({
  value,
  onValueChange,
  label,
  style,
  inputStyle,
}: TimePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(() => dateFromHHMM(value));

  const openPicker = useCallback(() => {
    setTempDate(dateFromHHMM(value));
    setShowPicker(true);
  }, [value]);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }
      if (event.type === 'set' && date) {
        const hhmm = dateToHHMM(date);
        setTempDate(date);
        onValueChange(hhmm);
        if (Platform.OS === 'ios') {
          // Keep picker open on iOS so user can scroll more; they tap Done to close
        }
      } else if (event.type === 'dismiss') {
        setShowPicker(false);
      }
    },
    [onValueChange]
  );

  const handleDone = useCallback(() => {
    setShowPicker(false);
  }, []);

  return (
    <View style={[styles.wrapper, style]}>
      {label != null && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, inputStyle]}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Text style={styles.inputText}>{formatDisplay(value)}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleDone}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleDone}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="spinner"
                onChange={handleChange}
                textColor="#e2e2e8"
                style={styles.picker}
              />
              <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="default"
            onChange={handleChange}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  inputText: {
    color: '#e2e2e8',
    fontSize: 16,
  },
  chevron: {
    color: '#888',
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    alignItems: 'center',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    marginTop: 10,
    marginBottom: 8,
  },
  picker: {
    width: '100%',
    height: 200,
  },
  doneBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
