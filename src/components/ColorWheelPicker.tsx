import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Canvas, Circle, Paint, Skia, Shader } from '@shopify/react-native-skia';

interface Props {
  color: string;
  onColorChange: (color: string) => void;
}

/** HSV-based color wheel. Tapping a region picks that hue at full saturation/value. */
export default function ColorWheelPicker({ color, onColorChange }: Props) {
  const SIZE = 160;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 4;

  const PRESET_COLORS = [
    '#FFFFFF', '#FF0000', '#FF7700', '#FFFF00',
    '#00FF00', '#00FFFF', '#0066FF', '#8800FF',
    '#FF00FF', '#FF69B4', '#00000000',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.presetRow}>
        {PRESET_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.swatch,
              { backgroundColor: c === '#00000000' ? 'transparent' : c },
              c === '#00000000' && styles.eraserSwatch,
              color === c && styles.selectedSwatch,
            ]}
            onPress={() => onColorChange(c)}
          >
            {c === '#00000000' && (
              <Text style={styles.eraserText}>✕</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.selectedRow}>
        <View style={[styles.selectedPreview, { backgroundColor: color }]} />
        <Text style={styles.selectedLabel}>{color}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraserSwatch: {
    borderColor: '#666',
    borderStyle: 'dashed',
    backgroundColor: '#2a2a3a',
  },
  selectedSwatch: {
    borderColor: '#7c3aed',
    borderWidth: 3,
  },
  eraserText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  selectedPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#555',
  },
  selectedLabel: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
