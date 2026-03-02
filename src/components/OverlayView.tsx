import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { DrawingOverlay } from '../types';

interface Props {
  overlay: DrawingOverlay;
  width: number;
  height: number;
  opacity?: number;
}

/**
 * Renders a saved DrawingOverlay by scaling its strokes to the target width/height.
 * Used in ThingCard thumbnails and on top of the camera preview.
 */
export default function OverlayView({ overlay, width, height, opacity = 1 }: Props) {
  const scaleX = width / overlay.canvasWidth;
  const scaleY = height / overlay.canvasHeight;

  return (
    <Canvas style={[styles.canvas, { width, height, opacity }]} pointerEvents="none">
      {overlay.strokes.map((stroke) => {
        const skiaPath = Skia.Path.MakeFromSVGString(stroke.path);
        if (!skiaPath) return null;

        // Scale path to target dimensions
        skiaPath.transform(Skia.Matrix().scale(scaleX, scaleY));

        if (stroke.isEraser) {
          // Eraser: draw with destination-out blend mode to punch through
          return (
            <Path
              key={stroke.id}
              path={skiaPath}
              color="white"
              style="stroke"
              strokeWidth={stroke.strokeWidth * Math.min(scaleX, scaleY)}
              blendMode="dstOut"
            />
          );
        }

        return (
          <Path
            key={stroke.id}
            path={skiaPath}
            color={stroke.color}
            style="stroke"
            strokeWidth={stroke.strokeWidth * Math.min(scaleX, scaleY)}
            strokeCap="round"
            strokeJoin="round"
          />
        );
      })}
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
  },
});
