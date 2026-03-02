import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { DrawStroke } from '../types';

interface ActivePath {
  skPath: SkPath;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
  id: string;
}

interface Props {
  width: number;
  height: number;
  committedStrokes: DrawStroke[];
  color: string;
  strokeWidth: number;
  isEraser: boolean;
  onStrokeComplete: (stroke: DrawStroke) => void;
}

/**
 * Interactive Skia drawing canvas using React Native's built-in touch events.
 * No react-native-gesture-handler or reanimated required.
 */
export default function DrawingCanvas({
  width,
  height,
  committedStrokes,
  color,
  strokeWidth,
  isEraser,
  onStrokeComplete,
}: Props) {
  const activePath = useRef<ActivePath | null>(null);
  const [, forceUpdate] = useState(0);

  const handleTouchStart = useCallback(
    (e: any) => {
      const touch = e.nativeEvent.touches[0];
      if (!touch) return;
      const path = Skia.Path.Make();
      path.moveTo(touch.locationX, touch.locationY);
      activePath.current = {
        skPath: path,
        color,
        strokeWidth,
        isEraser,
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      forceUpdate((n) => n + 1);
    },
    [color, strokeWidth, isEraser]
  );

  const handleTouchMove = useCallback((e: any) => {
    const touch = e.nativeEvent.touches[0];
    if (!touch || !activePath.current) return;
    activePath.current.skPath.lineTo(touch.locationX, touch.locationY);
    forceUpdate((n) => n + 1);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!activePath.current) return;
    const { skPath, color: c, strokeWidth: sw, isEraser: ie, id } = activePath.current;
    onStrokeComplete({
      id,
      path: skPath.toSVGString(),
      color: c,
      strokeWidth: sw,
      isEraser: ie,
    });
    activePath.current = null;
    forceUpdate((n) => n + 1);
  }, [onStrokeComplete]);

  const renderStroke = (stroke: DrawStroke, liveSkPath?: SkPath) => {
    const skPath = liveSkPath ?? Skia.Path.MakeFromSVGString(stroke.path);
    if (!skPath) return null;

    if (stroke.isEraser) {
      return (
        <Path
          key={stroke.id}
          path={skPath}
          color="white"
          style="stroke"
          strokeWidth={stroke.strokeWidth}
          strokeCap="round"
          strokeJoin="round"
          blendMode="dstOut"
        />
      );
    }
    return (
      <Path
        key={stroke.id}
        path={skPath}
        color={stroke.color}
        style="stroke"
        strokeWidth={stroke.strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    );
  };

  return (
    <View
      style={{ width, height }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {committedStrokes.map((s) => renderStroke(s))}
        {activePath.current &&
          renderStroke(
            {
              id: 'live',
              path: '',
              color: activePath.current.color,
              strokeWidth: activePath.current.strokeWidth,
              isEraser: activePath.current.isEraser,
            },
            activePath.current.skPath
          )}
      </Canvas>
    </View>
  );
}
