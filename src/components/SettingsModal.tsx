import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: Props) {
  const settings = useSettingsStore();
  const [earlyHoursStr, setEarlyHoursStr] = useState(String(settings.earlyTrackingWindowHours));
  const [slideshowSpeedStr, setSlideshowSpeedStr] = useState(String(settings.slideshowSpeedSeconds));

  useEffect(() => {
    if (visible) {
      setEarlyHoursStr(String(settings.earlyTrackingWindowHours));
      setSlideshowSpeedStr(String(settings.slideshowSpeedSeconds));
    }
  }, [visible, settings.earlyTrackingWindowHours, settings.slideshowSpeedSeconds]);

  const confirmEarlyHours = () => {
    const n = parseFloat(earlyHoursStr);
    if (!isNaN(n) && n >= 0) settings.update({ earlyTrackingWindowHours: n });
    else setEarlyHoursStr(String(settings.earlyTrackingWindowHours));
  };

  const confirmSlideshowSpeed = () => {
    const n = parseFloat(slideshowSpeedStr);
    if (!isNaN(n) && n > 0) settings.update({ slideshowSpeedSeconds: n });
    else setSlideshowSpeedStr(String(settings.slideshowSpeedSeconds));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>Settings</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Early tracking window — use keyboard "Done" to confirm */}
              <View style={styles.settingBlock}>
                <SettingRow label="Early Tracking Window (hours)" noBorder>
                  <TextInput
                    style={styles.numberInput}
                    value={earlyHoursStr}
                    onChangeText={setEarlyHoursStr}
                    onSubmitEditing={confirmEarlyHours}
                    returnKeyType="done"
                    keyboardType="decimal-pad"
                    maxLength={6}
                    selectTextOnFocus
                  />
                </SettingRow>
                <Text style={styles.settingDescription}>
                  Tracking within this window will suppress the reminder notification.
                </Text>
              </View>

              {/* View grouped things */}
              <SettingRow label="Show Grouped Items on Home">
                <Switch
                  value={settings.viewGroupedThingsInHome}
                  onValueChange={(v) =>
                    settings.update({ viewGroupedThingsInHome: v })
                  }
                  trackColor={{ false: '#3a3a4a', true: '#7c3aed' }}
                  thumbColor="#fff"
                />
              </SettingRow>

              {/* Search bar */}
              <SettingRow label="Show Search Bar">
                <Switch
                  value={settings.showSearchBar}
                  onValueChange={(v) => settings.update({ showSearchBar: v })}
                  trackColor={{ false: '#3a3a4a', true: '#7c3aed' }}
                  thumbColor="#fff"
                />
              </SettingRow>

              {/* Slideshow speed — use keyboard "Done" to confirm */}
              <SettingRow label="Slideshow Speed (seconds/photo)">
                <TextInput
                  style={styles.numberInput}
                  value={slideshowSpeedStr}
                  onChangeText={setSlideshowSpeedStr}
                  onSubmitEditing={confirmSlideshowSpeed}
                  returnKeyType="done"
                  keyboardType="decimal-pad"
                  maxLength={6}
                  selectTextOnFocus
                />
              </SettingRow>

              {/* Slideshow show date */}
              <SettingRow label="Show Date in Slideshow">
                <Switch
                  value={settings.slideshowShowDate}
                  onValueChange={(v) => settings.update({ slideshowShowDate: v })}
                  trackColor={{ false: '#3a3a4a', true: '#7c3aed' }}
                  thumbColor="#fff"
                />
              </SettingRow>
            </ScrollView>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SettingRow({
  label,
  children,
  noBorder,
}: {
  label: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.row, noBorder && styles.rowNoBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '85%',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3a3a4a',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#e2e2e8',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  settingBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  settingDescription: {
    color: '#777',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 0,
    paddingBottom: 12,
    paddingTop: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
    gap: 12,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowLabel: {
    color: '#ccc',
    fontSize: 15,
    flex: 1,
  },
  numberInput: {
    color: '#e2e2e8',
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 52,
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: 20,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
