import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Cropper from 'react-easy-crop';
import { X, Check, ZoomIn, RotateCcw } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageCropperModalProps {
  visible: boolean;
  image: string;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
}

export default function ImageCropperModal({ visible, image, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: any) => setCrop(crop);
  const onZoomChange = (zoom: number) => setZoom(zoom);

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    if (Platform.OS !== 'web') return; // Should only be used on web

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = image;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx?.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      const base64Image = canvas.toDataURL('image/jpeg');
      onCropComplete(base64Image);
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  };

  if (Platform.OS !== 'web') return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Adjust Image</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#1B2C21" />
            </TouchableOpacity>
          </View>

          <View style={styles.cropperContainer}>
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1 / 1}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteInternal}
              onZoomChange={onZoomChange}
            />
          </View>

          <View style={styles.controls}>
            <View style={styles.zoomRow}>
              <ZoomIn size={18} color="#6B7A6F" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => onZoomChange(Number(e.target.value))}
                style={{ flex: 1, marginLeft: 10, marginRight: 10 }}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={createCroppedImage}>
              <Check size={20} color="white" />
              <Text style={styles.saveBtnText}>Apply Adjustment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: Math.min(SCREEN_WIDTH * 0.9, 500),
    height: Math.min(SCREEN_HEIGHT * 0.8, 600),
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F1',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1B2C21' },
  cropperContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#333',
  },
  controls: {
    padding: 20,
    backgroundColor: 'white',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: '#1B2C21',
    flexDirection: 'row',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
