import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThingsStore } from '../../src/store/thingsStore';
import DrawingCanvas from '../../src/components/DrawingCanvas';
import ColorWheelPicker from '../../src/components/ColorWheelPicker';
import { DrawStroke } from '../../src/types';

const STROKE_WIDTHS = [2, 4, 8, 14, 22];
const CANVAS_SIZE = 300;

export default function DrawOverlayScreen() {
  const { id, fromNewTracker } = useLocalSearchParams<{
    id: string;
    fromNewTracker?: string;
  }>();
  const router = useRouter();
  const { things, setOverlay } = useThingsStore();
  const thing = things.find((t) => t.id === id);

  const [strokes, setStrokes] = useState<DrawStroke[]>(
    thing?.overlay?.strokes ?? []
  );
  const [color, setColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleStrokeComplete = useCallback((stroke: DrawStroke) => {
    setStrokes((prev) => [...prev, stroke]);
  }, []);

  const handleClearAll = () => {
    Alert.alert('Clear All', 'Remove all drawn lines?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setStrokes([]),
      },
    ]);
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleSave = () => {
    setOverlay(id, {
      strokes,
      canvasWidth: CANVAS_SIZE,
      canvasHeight: CANVAS_SIZE,
    });
    if (fromNewTracker === 'true') {
      router.replace('/');
    } else {
      router.back();
    }
  };

  const backgroundPhoto = thing?.photographs.at(-1)?.uri;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {thing?.displayName ?? 'Draw Overlay'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, styles.saveText]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* Canvas area */}
          <View style={styles.canvasWrapper}>
            {backgroundPhoto ? (
              <Image
                source={{ uri: backgroundPhoto }}
                style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.canvasBackground} />
            )}
            <DrawingCanvas
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              committedStrokes={strokes}
              color={isEraser ? '#FFFFFF' : color}
              strokeWidth={strokeWidth}
              isEraser={isEraser}
              onStrokeComplete={handleStrokeComplete}
            />
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            {/* Tool toggles */}
            <View style={styles.toolRow}>
              <TouchableOpacity
                style={[styles.toolBtn, !isEraser && styles.toolBtnActive]}
                onPress={() => setIsEraser(false)}
              >
                <Text style={styles.toolBtnText}>✏️ Draw</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolBtn, isEraser && styles.toolBtnActive]}
                onPress={() => setIsEraser(true)}
              >
                <Text style={styles.toolBtnText}>⬜ Erase</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={handleUndo}>
                <Text style={styles.toolBtnText}>↩ Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolBtn, styles.clearBtn]}
                onPress={handleClearAll}
              >
                <Text style={styles.toolBtnText}>🗑 Clear</Text>
              </TouchableOpacity>
            </View>

            {/* Stroke width */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Stroke Width</Text>
              <View style={styles.strokeWidthRow}>
                {STROKE_WIDTHS.map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[
                      styles.strokeWidthBtn,
                      strokeWidth === w && styles.strokeWidthBtnActive,
                    ]}
                    onPress={() => setStrokeWidth(w)}
                  >
                    <View
                      style={[
                        styles.strokeDot,
                        {
                          width: Math.min(w * 1.8, 28),
                          height: Math.min(w * 1.8, 28),
                          borderRadius: w,
                          backgroundColor: isEraser ? '#666' : color,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color picker */}
            {!isEraser && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.colorPickerToggle}
                  onPress={() => setShowColorPicker((v) => !v)}
                >
                  <View style={[styles.colorPreview, { backgroundColor: color }]} />
                  <Text style={styles.sectionLabel}>
                    Color {showColorPicker ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {showColorPicker && (
                  <ColorWheelPicker
                    color={color}
                    onColorChange={(c) => {
                      setColor(c);
                    }}
                  />
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  headerBtn: {
    padding: 4,
    minWidth: 60,
  },
  headerBtnText: {
    color: '#aaa',
    fontSize: 16,
  },
  saveText: {
    color: '#7c3aed',
    fontWeight: '700',
    textAlign: 'right',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
  canvasWrapper: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3a3a4a',
  },
  canvasBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
  },
  toolbar: {
    width: '100%',
    gap: 16,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  toolBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
    minWidth: 70,
  },
  toolBtnActive: {
    backgroundColor: '#7c3aed',
  },
  clearBtn: {
    backgroundColor: '#3a1a1a',
  },
  toolBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  strokeWidthRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  strokeWidthBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strokeWidthBtnActive: {
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  strokeDot: {
    backgroundColor: '#fff',
  },
  colorPickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#555',
  },
});
