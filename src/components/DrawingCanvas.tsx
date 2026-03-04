import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia, Group, type SkPath } from '@shopify/react-native-skia';
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
  /** If committed strokes were drawn on a different canvas size, pass that size so they scale correctly. */
  committedStrokesSourceWidth?: number;
  committedStrokesSourceHeight?: number;
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
  committedStrokesSourceWidth,
  committedStrokesSourceHeight,
  color,
  strokeWidth,
  isEraser,
  onStrokeComplete,
}: Props) {
  const activePath = useRef<ActivePath | null>(null);
  const [, forceUpdate] = useState(0);

  const defaultScaleX = committedStrokesSourceWidth != null && committedStrokesSourceWidth > 0
    ? width / committedStrokesSourceWidth
    : 1;
  const defaultScaleY = committedStrokesSourceHeight != null && committedStrokesSourceHeight > 0
    ? height / committedStrokesSourceHeight
    : 1;
  const hasDefaultScale = committedStrokesSourceWidth != null && committedStrokesSourceHeight != null;

  const handleTouchStart = useCallback(
    (e: any) => {
      const touches = e.nativeEvent.touches;
      if (touches.length >= 2) return;
      const touch = touches[0];
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
    const touches = e.nativeEvent.touches;
    // Ignore multi-touch moves here; 2-finger gestures (pinch/pan)
    // are handled by the parent, and 1-finger should always draw.
    if (touches.length >= 2) {
      return;
    }
    const touch = touches[0];
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

    const sx = stroke.sourceWidth != null && stroke.sourceWidth > 0
      ? width / stroke.sourceWidth
      : hasDefaultScale && !liveSkPath ? defaultScaleX : 1;
    const sy = stroke.sourceHeight != null && stroke.sourceHeight > 0
      ? height / stroke.sourceHeight
      : hasDefaultScale && !liveSkPath ? defaultScaleY : 1;
    const scaleThisStroke = (sx !== 1 || sy !== 1) && !liveSkPath;

    if (scaleThisStroke) {
      skPath.transform(Skia.Matrix().scale(sx, sy));
    }
    const strokeW = scaleThisStroke
      ? stroke.strokeWidth * Math.min(sx, sy)
      : stroke.strokeWidth;

    if (stroke.isEraser) {
      return (
        <Path
          key={stroke.id}
          path={skPath}
          color="white"
          style="stroke"
          strokeWidth={strokeW}
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
        strokeWidth={strokeW}
        strokeCap="round"
        strokeJoin="round"
      />
    );
  };

  const { drawStrokes, eraserStrokes } = useMemo(() => {
    const draw: DrawStroke[] = [];
    const erase: DrawStroke[] = [];
    for (const s of committedStrokes) {
      if (s.isEraser) erase.push(s);
      else draw.push(s);
    }
    return { drawStrokes: draw, eraserStrokes: erase };
  }, [committedStrokes]);

  return (
    <View
      style={[styles.container, { width, height }]}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <View style={styles.canvasPassThrough} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          <Group layer>
            {drawStrokes.map((s) => renderStroke(s))}
          </Group>
          <Group layer blendMode="dstOut">
            {eraserStrokes.map((s) => renderStroke(s))}
          </Group>
          {activePath.current &&
            (activePath.current.isEraser ? (
              <Group blendMode="dstOut">
                {renderStroke(
                  {
                    id: 'live',
                    path: '',
                    color: activePath.current.color,
                    strokeWidth: activePath.current.strokeWidth,
                    isEraser: true,
                  },
                  activePath.current.skPath
                )}
              </Group>
            ) : (
              renderStroke(
                {
                  id: 'live',
                  path: '',
                  color: activePath.current.color,
                  strokeWidth: activePath.current.strokeWidth,
                  isEraser: false,
                },
                activePath.current.skPath
              )
            ))}
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  canvasPassThrough: {
    ...StyleSheet.absoluteFillObject,
  },
});
