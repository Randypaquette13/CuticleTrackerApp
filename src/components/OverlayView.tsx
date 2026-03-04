import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { DrawingOverlay } from '../types';

interface Props {
  overlay: DrawingOverlay;
  width: number;
  height: number;
  opacity?: number;
  /** When true, scales the center-largest-square of the canvas uniformly into the display
   *  area instead of stretching X and Y independently. Prevents squishing when the canvas
   *  aspect ratio differs from the display area. */
  centerCrop?: boolean;
}

/**
 * Renders a saved DrawingOverlay by scaling its strokes to the target width/height.
 * Used in ThingCard thumbnails and on top of the camera preview.
 */
export default function OverlayView({ overlay, width, height, opacity = 1, centerCrop = false }: Props) {
  let strokeScale: number;
  let buildMatrix: () => ReturnType<typeof Skia.Matrix>;

  if (centerCrop) {
    // Crop to the center-largest-square of the canvas, then scale uniformly into the
    // display area and center the result within it.
    const side = Math.min(overlay.canvasWidth, overlay.canvasHeight);
    const cropOffsetX = (overlay.canvasWidth - side) / 2;
    const cropOffsetY = (overlay.canvasHeight - side) / 2;
    const displaySide = Math.min(width, height);
    const scale = displaySide / side;
    const canvasOffsetX = (width - displaySide) / 2;
    const canvasOffsetY = (height - displaySide) / 2;
    strokeScale = scale;
    // Post-multiply order: translate(canvasOffset) → scale → translate(-cropOffset)
    // Result for point p: scale*(p - cropOffset) + canvasOffset
    buildMatrix = () =>
      Skia.Matrix().translate(canvasOffsetX, canvasOffsetY).scale(scale, scale).translate(-cropOffsetX, -cropOffsetY);
  } else {
    const scaleX = width / overlay.canvasWidth;
    const scaleY = height / overlay.canvasHeight;
    strokeScale = Math.min(scaleX, scaleY);
    buildMatrix = () => Skia.Matrix().scale(scaleX, scaleY);
  }

  return (
    <Canvas style={[styles.canvas, { width, height, opacity }]} pointerEvents="none">
      {overlay.strokes.map((stroke) => {
        const skiaPath = Skia.Path.MakeFromSVGString(stroke.path);
        if (!skiaPath) return null;

        skiaPath.transform(buildMatrix());

        if (stroke.isEraser) {
          return (
            <Path
              key={stroke.id}
              path={skiaPath}
              color="white"
              style="stroke"
              strokeWidth={stroke.strokeWidth * strokeScale}
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
            strokeWidth={stroke.strokeWidth * strokeScale}
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
