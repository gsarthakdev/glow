import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ChildData {
  child_name: string;
  goals: string[];
  commentsEnabled: boolean;
}

interface QRData {
  children: ChildData[];
}

export default function QRScannerScrn({ navigation }: { navigation: any }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<QRData | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  
  // Animation values
  const scanLineOpacity = useSharedValue(1);
  const scanLineTranslateY = useSharedValue(0);

  useEffect(() => {
    // Animate scan line
    scanLineTranslateY.value = withRepeat(
      withSequence(
        withTiming(height * 0.3, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );
  }, []);

  // Handle screen focus/blur to manage camera lifecycle
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      setScanned(false); // Reset scanned state when screen comes into focus
      
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  const scanLineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scanLineOpacity.value,
    transform: [{ translateY: scanLineTranslateY.value }],
  }));

  if (!permission) {
    // Camera permissions are still loading
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#007AFF" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            It will be used to scan the QR code for quick setup.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("WelcomeScrn")}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      // Parse the QR code data
      const parsedData: QRData = JSON.parse(data);
      
      // Validate the data structure
      if (!parsedData.children || !Array.isArray(parsedData.children)) {
        throw new Error('Invalid QR code format: missing children array');
      }
      
      if (parsedData.children.length === 0) {
        throw new Error('No children found in QR code');
      }
      
      // Validate each child object
      for (const child of parsedData.children) {
        if (!child.child_name || typeof child.child_name !== 'string') {
          throw new Error('Invalid child data: missing or invalid child_name');
        }
        if (child.child_name.trim().length === 0) {
          throw new Error('Child name cannot be empty');
        }
        if (child.goals && !Array.isArray(child.goals)) {
          throw new Error('Invalid child data: goals must be an array');
        }
        if (child.commentsEnabled !== undefined && typeof child.commentsEnabled !== 'boolean') {
          throw new Error('Invalid child data: commentsEnabled must be a boolean');
        }
      }
      
      setScannedData(parsedData);
    
      // Navigate to confirmation modal using replace to unmount this screen
      navigation.replace('QRConfirmationModal', { 
        childrenData: parsedData.children 
      });
      
    } catch (error) {
      console.error('QR Code parsing error:', error);
      Alert.alert(
        'Invalid QR Code',
        'This QR code doesn\'t contain valid child setup data. Please try scanning a different QR code.',
        [
          {
            text: 'Try Again',
            onPress: () => setScanned(false),
          },
          {
            text: 'Manual Setup',
            onPress: () => navigation.replace('ChildrenCountScrn'),
            style: 'default',
          },
        ]
      );
    }
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    navigation.navigate("WelcomeScrn");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {isScreenFocused ? (
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            {/* Overlay */}
            <View style={styles.overlay}>
              {/* Top overlay */}
              <View style={styles.overlayTop} />
              
              {/* Middle section with scan area */}
              <View style={styles.middleSection}>
                <View style={styles.overlaySide} />
                <View style={styles.scanArea}>
                  {/* Corner indicators */}
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                  
                  {/* Animated scan line */}
                  <Animated.View style={[styles.scanLine, scanLineAnimatedStyle]} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              
              {/* Bottom overlay */}
              <View style={styles.overlayBottom}>
                <Text style={styles.instructionText}>
                  Position the QR code within the frame
                </Text>
                <Text style={styles.subInstructionText}>
                  Make sure the QR code is well-lit and clearly visible
                </Text>
              </View>
            </View>
          </CameraView>
        ) : (
          <View style={styles.camera}>
            <View style={styles.overlay}>
              <View style={styles.overlayTop} />
              <View style={styles.middleSection}>
                <View style={styles.overlaySide} />
                <View style={styles.scanArea}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              <View style={styles.overlayBottom}>
                <Text style={styles.instructionText}>
                  Camera paused
                </Text>
                <Text style={styles.subInstructionText}>
                  Returning to scanner...
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F8F9FA',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  backButton: {
    // paddingHorizontal: 32,
    paddingVertical: 16,
    marginLeft: 20
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    // paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1, 
  },
  placeholder: {
    width: 24,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleSection: {
    flexDirection: 'row',
    height: 300,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  subInstructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});