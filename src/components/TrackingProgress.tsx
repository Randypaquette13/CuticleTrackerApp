import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  current: number;
  total: number;
  label?: string;
}

export default function TrackingProgress({ current, total, label }: Props) {
  const pct = total > 0 ? current / total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label ?? 'Progress'}</Text>
        <Text style={styles.count}>
          {current} / {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  count: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 6,
    backgroundColor: '#2a2a3a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 3,
  },
});
