import React from 'react';
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
} from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: Props) {
  const settings = useSettingsStore();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Settings</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Early tracking window */}
            <SettingRow label="Early Tracking Window (hours)">
              <TextInput
                style={styles.numberInput}
                value={String(settings.earlyTrackingWindowHours)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n >= 0)
                    settings.update({ earlyTrackingWindowHours: n });
                }}
                keyboardType="number-pad"
                maxLength={2}
              />
            </SettingRow>

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

            {/* Slideshow speed */}
            <SettingRow label="Slideshow Speed (seconds/photo)">
              <TextInput
                style={styles.numberInput}
                value={String(settings.slideshowSpeedSeconds)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n) && n >= 1)
                    settings.update({ slideshowSpeedSeconds: n });
                }}
                keyboardType="number-pad"
                maxLength={2}
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
    </Modal>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '80%',
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
    gap: 12,
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
    paddingVertical: 6,
    fontSize: 16,
    minWidth: 60,
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
