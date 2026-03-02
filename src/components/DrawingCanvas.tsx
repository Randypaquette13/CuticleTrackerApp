import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  type SkPath,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { DrawStroke } from '../types';

interface ActivePath {
  path: SkPath;
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
 * Interactive Skia drawing canvas. Handles touch input to record strokes.
 * Renders both previously committed strokes and the currently-in-progress stroke.
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
  const currentPath = useRef<SkPath | null>(null);
  const currentStrokeId = useRef<string>('');
  const [, forceUpdate] = useState(0);
  const activePath = useRef<ActivePath | null>(null);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      const path = Skia.Path.Make();
      path.moveTo(e.x, e.y);
      currentPath.current = path;
      currentStrokeId.current = `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      activePath.current = {
        path,
        color,
        strokeWidth,
        isEraser,
        id: currentStrokeId.current,
      };
      forceUpdate((n) => n + 1);
    })
    .onUpdate((e) => {
      if (!currentPath.current) return;
      currentPath.current.lineTo(e.x, e.y);
      forceUpdate((n) => n + 1);
    })
    .onEnd(() => {
      if (!currentPath.current || !activePath.current) return;
      const svgString = currentPath.current.toSVGString();
      onStrokeComplete({
        id: currentStrokeId.current,
        path: svgString,
        color: activePath.current.color,
        strokeWidth: activePath.current.strokeWidth,
        isEraser: activePath.current.isEraser,
      });
      currentPath.current = null;
      activePath.current = null;
      forceUpdate((n) => n + 1);
    });

  const renderStroke = useCallback(
    (stroke: DrawStroke, isLive = false) => {
      let skPath: SkPath | null;
      if (isLive && currentPath.current) {
        skPath = currentPath.current;
      } else {
        skPath = Skia.Path.MakeFromSVGString(stroke.path);
      }
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
    },
    []
  );

  return (
    <View style={{ width, height }}>
      <GestureDetector gesture={panGesture}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Committed strokes */}
          {committedStrokes.map((s) => renderStroke(s))}
          {/* Live stroke */}
          {activePath.current &&
            renderStroke(
              {
                id: 'live',
                path: '',
                color: activePath.current.color,
                strokeWidth: activePath.current.strokeWidth,
                isEraser: activePath.current.isEraser,
              },
              true
            )}
        </Canvas>
      </GestureDetector>
    </View>
  );
}
