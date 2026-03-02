import React, { useRef, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { CameraView, type CameraType, type CameraCapturedPicture } from 'expo-camera';
import { DrawingOverlay } from '../types';
import OverlayView from './OverlayView';

const FOCUS_RETICLE_SIZE = 64;
const FOCUS_RETICLE_DURATION_MS = 1200;
/** After tap, hold single-shot focus this long then return to continuous. */
const FOCUS_LOCK_MS = 600;

/** Zoom: 0 = no zoom, 1 = max. Show slider whenever onZoomChange is provided (all photo flows). */
interface Props {
  onCapture: (photo: CameraCapturedPicture) => void;
  overlay?: DrawingOverlay | null;
  facing?: CameraType;
  /** 0–1. Current zoom level; slider reflects this. Saved on capture when onZoomChange provided. */
  zoom?: number;
  /** When provided, zoom slider and hint are shown. Parent saves zoom on capture. */
  onZoomChange?: (zoom: number) => void;
  /** When true, shutter is disabled (e.g. parent is saving). Prevents capture during unmount. */
  disabled?: boolean;
  /** When true, zoom slider is display-only; touching it shows a message that zoom is set on first picture. */
  zoomLocked?: boolean;
}

/**
 * Full-screen camera with an optional semi-transparent DrawingOverlay guide.
 * Tap anywhere to trigger a focus cycle (toggle autofocus on→off) and show a reticle.
 * Uses continuous autofocus by default; tap briefly switches to single-shot focus then back.
 * The overlay is only a visual aid — it is NOT baked into the saved photo.
 */
export default function CameraWithOverlay({
  onCapture,
  overlay,
  facing = 'back',
  zoom = 0,
  onZoomChange,
  disabled = false,
  zoomLocked = false,
}: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [autofocus, setAutofocus] = useState<'off' | 'on'>('off'); // 'off' = continuous, 'on' = single-shot then lock
  const clearFocusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusLockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleZoomChange = useCallback(
    (value: number) => {
      if (zoomLocked) {
        Alert.alert(
          'Zoom locked',
          'Zoom can only be set when taking the first picture. Later photos use the same zoom for consistency.'
        );
        return;
      }
      onZoomChange?.(value);
    },
    [zoomLocked, onZoomChange]
  );

  const handleCapture = async () => {
    if (!cameraRef.current || capturing || disabled) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo) onCapture(photo);
    } catch {
      // e.g. "Camera unmounted during taking photo process" when navigating away or double-tap
    } finally {
      setCapturing(false);
    }
  };

  const handleTapToFocus = useCallback(
    (e: { nativeEvent: { touches: Array<{ locationX: number; locationY: number }> } }) => {
      const touch = e.nativeEvent.touches?.[0];
      if (!touch) return;
      const { locationX, locationY } = touch;

      if (clearFocusTimeout.current) clearTimeout(clearFocusTimeout.current);
      if (focusLockTimeout.current) clearTimeout(focusLockTimeout.current);

      setFocusPoint({ x: locationX, y: locationY });
      setAutofocus('on'); // single-shot focus (triggers hardware to refocus)

      clearFocusTimeout.current = setTimeout(() => {
        setFocusPoint(null);
        clearFocusTimeout.current = null;
      }, FOCUS_RETICLE_DURATION_MS);

      focusLockTimeout.current = setTimeout(() => {
        setAutofocus('off'); // back to continuous autofocus
        focusLockTimeout.current = null;
      }, FOCUS_LOCK_MS);
    },
    []
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        autofocus={autofocus}
        zoom={zoom}
      />

      {/* Tap-to-focus layer: capture taps and show reticle */}
      <View
        style={StyleSheet.absoluteFill}
        onTouchStart={handleTapToFocus}
      />

      {focusPoint != null && (
        <View
          style={[
            styles.focusReticle,
            {
              left: focusPoint.x - FOCUS_RETICLE_SIZE / 2,
              top: focusPoint.y - FOCUS_RETICLE_SIZE / 2,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {overlay && (
        <View style={[StyleSheet.absoluteFill, styles.overlayContainer]}>
          <View style={styles.overlayWrapper}>
            <OverlayView
              overlay={overlay}
              width={280}
              height={280}
              opacity={0.6}
            />
          </View>
        </View>
      )}

      {/* Zoom hint — show whenever slider is shown */}
      {onZoomChange != null && (
        <View style={styles.zoomHintContainer} pointerEvents="none">
          <Text style={styles.zoomHintText}>
            If taking a pic of a small thing, use zoom for a focused image.
          </Text>
        </View>
      )}

      {/* Zoom sliders — left and right; same value, either side controls zoom */}
      {onZoomChange != null && (
        <>
          <View style={[styles.zoomSliderContainer, styles.zoomSliderLeft]} pointerEvents="box-none">
            <View style={styles.zoomSliderTrack}>
              <Slider
                style={styles.zoomSlider}
                minimumValue={0}
                maximumValue={1}
                value={zoom}
                onValueChange={handleZoomChange}
                minimumTrackTintColor="rgba(255,255,255,0.6)"
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor="#fff"
              />
            </View>
          </View>
          <View style={[styles.zoomSliderContainer, styles.zoomSliderRight]} pointerEvents="box-none">
            <View style={styles.zoomSliderTrack}>
              <Slider
                style={styles.zoomSlider}
                minimumValue={0}
                maximumValue={1}
                value={zoom}
                onValueChange={handleZoomChange}
                minimumTrackTintColor="rgba(255,255,255,0.6)"
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor="#fff"
              />
            </View>
          </View>
        </>
      )}

      {/* Shutter button — on top so its tap doesn't trigger focus */}
      <View style={styles.shutterContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.shutterOuter, (capturing || disabled) && styles.shutterDisabled]}
          onPress={handleCapture}
          disabled={capturing || disabled}
          activeOpacity={capturing || disabled ? 1 : 0.75}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  focusReticle: {
    position: 'absolute',
    width: FOCUS_RETICLE_SIZE,
    height: FOCUS_RETICLE_SIZE,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: FOCUS_RETICLE_SIZE / 2,
    backgroundColor: 'transparent',
  },
  overlayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  overlayWrapper: {
    width: 280,
    height: 280,
  },
  shutterContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  zoomHintContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  zoomHintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  zoomSliderContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 110,
  },
  zoomSliderLeft: {
    left: 12,
  },
  zoomSliderRight: {
    right: 12,
  },
  zoomSliderTrack: {
    width: 36,
    height: 200,
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  zoomSlider: {
    width: 200,
    height: 36,
  },
});
