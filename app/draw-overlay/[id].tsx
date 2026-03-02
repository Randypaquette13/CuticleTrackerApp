import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useThingsStore } from '../../src/store/thingsStore';
import { isDefaultFinger } from '../../src/data/defaultFingers';
import DrawingCanvas from '../../src/components/DrawingCanvas';
import ColorWheelPicker from '../../src/components/ColorWheelPicker';
import { DrawStroke } from '../../src/types';

const STROKE_WIDTHS = [2, 4, 8, 14, 22];
const DEFAULT_CANVAS_SIZE = 300;
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

/**
 * Fit (width, height) inside container preserving aspect ratio.
 * Rounds so the result has exactly the same aspect ratio as the image;
 * otherwise Image with resizeMode="contain" would center the image with
 * small gaps and the drawing canvas would be offset from the image.
 */
function fitInContainer(
  contentW: number,
  contentH: number,
  containerW: number,
  containerH: number
): { width: number; height: number } {
  if (contentW <= 0 || contentH <= 0) {
    return { width: containerW, height: containerH };
  }
  const scale = Math.min(containerW / contentW, containerH / contentH, 1);
  const exactW = contentW * scale;
  const exactH = contentH * scale;
  const aspect = contentW / contentH;
  if (containerW / contentW <= containerH / contentH) {
    const width = Math.round(exactW);
    let height = Math.round(width / aspect);
    if (height > containerH) {
      height = containerH;
      const w = Math.round(height * aspect);
      return { width: Math.min(w, containerW), height };
    }
    return { width, height };
  }
  const height = Math.round(exactH);
  let width = Math.round(height * aspect);
  if (width > containerW) {
    width = containerW;
    const h = Math.round(width / aspect);
    return { width, height: Math.min(h, containerH) };
  }
  return { width, height };
}

export default function DrawOverlayScreen() {
  const params = useLocalSearchParams<{ id: string; fromNewTracker?: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  const fromNewTracker = typeof params.fromNewTracker === 'string' ? params.fromNewTracker : params.fromNewTracker?.[0];
  const router = useRouter();
  const { things, setOverlay } = useThingsStore();
  const thing = things.find((t) => t.id === id);
  const cannotEdit = id !== '' && isDefaultFinger(id);

  const [strokes, setStrokes] = useState<DrawStroke[]>(
    thing?.overlay?.strokes ?? []
  );
  const [color, setColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [containerLayout, setContainerLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const backgroundPhoto = thing?.photographs.at(-1)?.uri;

  useEffect(() => {
    if (!backgroundPhoto) {
      setImageDimensions(null);
      return;
    }
    Image.getSize(
      backgroundPhoto,
      (width, height) => setImageDimensions({ width, height }),
      () => setImageDimensions(null)
    );
  }, [backgroundPhoto]);

  const contentSize = (() => {
    const win = Dimensions.get('window');
    const maxW = win.width - 32;
    const maxH = Math.max(400, win.height * 0.5);
    if (containerLayout) {
      const { width: cw, height: ch } = containerLayout;
      if (imageDimensions) {
        return fitInContainer(
          imageDimensions.width,
          imageDimensions.height,
          cw,
          ch
        );
      }
      const side = Math.min(cw, ch, DEFAULT_CANVAS_SIZE * 2);
      return { width: side, height: side };
    }
    if (imageDimensions) {
      return fitInContainer(
        imageDimensions.width,
        imageDimensions.height,
        maxW,
        maxH
      );
    }
    return { width: Math.min(maxW, DEFAULT_CANVAS_SIZE), height: Math.min(maxH, DEFAULT_CANVAS_SIZE) };
  })();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

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
      canvasWidth: contentSize.width,
      canvasHeight: contentSize.height,
    });
    if (fromNewTracker === 'true') {
      router.replace('/');
    } else {
      router.back();
    }
  };

  const existingOverlay = thing?.overlay;
  const committedSourceWidth = existingOverlay?.canvasWidth;
  const committedSourceHeight = existingOverlay?.canvasHeight;

  if (cannotEdit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Draw Overlay</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.disabledOverlayMessage}>
          <Text style={styles.disabledOverlayText}>
            The original 10 finger trackers use a fixed overlay and can't be edited.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
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
          {/* Zoomable/pannable canvas area: full image with pinch and 2-finger pan */}
          <View
            style={styles.canvasArea}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setContainerLayout((prev) =>
                prev?.width === width && prev?.height === height
                  ? prev
                  : { width, height }
              );
            }}
          >
            <GestureDetector gesture={composed}>
              <Animated.View
                style={[
                  styles.canvasTransformWrapper,
                  { width: contentSize.width, height: contentSize.height },
                  animatedStyle,
                ]}
              >
                <View style={[styles.canvasWrapper, { width: contentSize.width, height: contentSize.height }]}>
                  {backgroundPhoto ? (
                    <Image
                      source={{ uri: backgroundPhoto }}
                      style={[StyleSheet.absoluteFill, styles.canvasImage]}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.canvasBackground} />
                  )}
                  <DrawingCanvas
                    width={contentSize.width}
                    height={contentSize.height}
                    committedStrokes={strokes}
                    committedStrokesSourceWidth={committedSourceWidth}
                    committedStrokesSourceHeight={committedSourceHeight}
                    color={isEraser ? '#FFFFFF' : color}
                    strokeWidth={strokeWidth}
                    isEraser={isEraser}
                    onStrokeComplete={handleStrokeComplete}
                  />
                </View>
              </Animated.View>
            </GestureDetector>
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
  canvasArea: {
    width: '100%',
    minHeight: 280,
    marginBottom: 8,
  },
  canvasTransformWrapper: {
    alignSelf: 'center',
  },
  canvasWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  canvasImage: {
    borderRadius: 12,
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
  disabledOverlayMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  disabledOverlayText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2a2a3a',
    borderRadius: 12,
  },
  backBtnText: {
    color: '#7c3aed',
    fontSize: 16,
    fontWeight: '600',
  },
});
