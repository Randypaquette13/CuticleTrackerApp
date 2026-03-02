import React, { useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { CameraView, type CameraType, type CameraCapturedPicture } from 'expo-camera';
import { DrawingOverlay } from '../types';
import OverlayView from './OverlayView';

interface Props {
  onCapture: (photo: CameraCapturedPicture) => void;
  overlay?: DrawingOverlay | null;
  facing?: CameraType;
}

/**
 * Full-screen camera with an optional semi-transparent DrawingOverlay guide.
 * The overlay is only a visual aid — it is NOT baked into the saved photo.
 */
export default function CameraWithOverlay({
  onCapture,
  overlay,
  facing = 'back',
}: Props) {
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (photo) onCapture(photo);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

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

      {/* Shutter button */}
      <View style={styles.shutterContainer}>
        <TouchableOpacity style={styles.shutterOuter} onPress={handleCapture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
});
