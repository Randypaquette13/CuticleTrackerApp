import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  onNewTracker: () => void;
  onCreateGroup: () => void;
  onSettings: () => void;
}

export default function BottomNav({ onNewTracker, onCreateGroup, onSettings }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 4 }]}>
      <NavButton icon="➕" label="New Tracker" onPress={onNewTracker} />
      <NavButton icon="🗂" label="Create Group" onPress={onCreateGroup} />
      <NavButton icon="⚙️" label="Settings" onPress={onSettings} />
    </View>
  );
}

function NavButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#13131f',
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
    borderRadius: 12,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '500',
  },
});
