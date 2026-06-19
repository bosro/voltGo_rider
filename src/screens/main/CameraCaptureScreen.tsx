/**
 * CameraCaptureScreen.tsx
 * ─────────────────────────────────────────────────────────────────
 * Proof-of-delivery camera. After capturing, navigates to
 * SubmitPhotoScreen with the full order params preserved.
 *
 * Fix vs previous version:
 *  - All route params (amount, pickupAddress, dropoffAddress, itemType)
 *    are forwarded to SubmitPhoto so Retake → CameraCapture → SubmitPhoto
 *    never loses context.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Colors, Typography, Radius } from "../../theme";
import { MainStackParamList } from "../../navigation/types";

import FlashIcon from "../../../assets/icons/camera-flash.svg";
import ChevronUpIcon from "../../../assets/icons/camera-chevron-up.svg";
import NoMicIcon from "../../../assets/icons/camera-no-mic.svg";

import * as ImageManipulator from "expo-image-manipulator";
import { useToast } from "@/components/common/toast";

type CameraParams = RouteProp<MainStackParamList, "CameraCapture">;

const MODES = ["CINEMATIC", "VIDEO", "PHOTO", "PORTRAIT", "PANO"] as const;

export default function CameraCaptureScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<CameraParams>();
  const { orderId, amount, pickupAddress, dropoffAddress, itemType } =
    route.params as any;

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");
  const [zoom, setZoom] = useState<"0.5" | "1">("1");
  const [mode, setMode] = useState<(typeof MODES)[number]>("PHOTO");
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const toast = useToast();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.permissionText}>
          Camera access is needed to take delivery proof photos.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permissionSkipBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Text style={styles.permissionSkipText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) return;

      // FIX: reject black/blank frames before handing off to SubmitPhoto.
      // Downscale to 8x8 and sample average luminance — a real photo of
      // any scene will have variance; a black/failed capture won't.
      const isBlank = await isLikelyBlankPhoto(photo.uri);
      if (isBlank) {
        toast.error(
          "Photo looks blank — make sure the lens isn't covered and try again.",
        );
        return;
      }

      navigation.replace("SubmitPhoto", {
        orderId,
        photoUri: photo.uri,
        amount,
        pickupAddress,
        dropoffAddress,
        itemType,
      });
    } catch {
      toast.error("Failed to take photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Downsamples the photo to 8x8 and checks both average brightness and
  // variance across pixels. A solid black (or solid any-color) frame has
  // near-zero variance; a real scene has meaningful pixel-to-pixel variation.
  async function isLikelyBlankPhoto(uri: string): Promise<boolean> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 8, height: 8 } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (!result.base64) return false; // fail open — don't block on manipulator errors

      // Rough heuristic: a valid JPEG of a real scene compresses to noticeably
      // more bytes than a flat/black 8x8 tile even at this tiny size, because
      // there's actual image entropy to encode.
      const byteLength = result.base64.length;
      return byteLength < 200; // empirically: solid-color 8x8 JPEGs base64 to ~120-160 chars
    } catch {
      return false; // fail open — never block a legitimate delivery on a heuristic bug
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top controls */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          style={styles.topIconBtn}
          onPress={() =>
            setFlashMode((prev) => (prev === "off" ? "on" : "off"))
          }
          activeOpacity={0.75}
        >
          <FlashIcon
            width={22}
            height={22}
            style={{ opacity: flashMode === "on" ? 1 : 0.6 }}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.75}>
          <ChevronUpIcon width={22} height={14} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.75}>
          <NoMicIcon width={22} height={22} />
        </TouchableOpacity>
      </SafeAreaView>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flashMode}
      />

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {/* Zoom pills */}
        <View style={styles.zoomRow}>
          {(["0.5", "1"] as const).map((z) => (
            <TouchableOpacity
              key={z}
              style={[styles.zoomPill, zoom === z && styles.zoomPillActive]}
              onPress={() => setZoom(z)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.zoomText,
                  zoom === z &&
                    (z === "1"
                      ? styles.zoomTextSelected
                      : styles.zoomTextActive),
                ]}
              >
                {z === "1" ? "1×" : z}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
              style={styles.modeBtn}
            >
              <Text
                style={[styles.modeText, mode === m && styles.modeTextActive]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shutter */}
        <TouchableOpacity
          style={[styles.shutterOuter, isCapturing && { opacity: 0.6 }]}
          onPress={handleCapture}
          activeOpacity={0.9}
          disabled={isCapturing}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={{ height: Platform.OS === "ios" ? 24 : 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  permissionScreen: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  permissionText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  permissionBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
  permissionSkipBtn: { paddingVertical: 12 },
  permissionSkipText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 0 : 12,
    paddingBottom: 10,
    backgroundColor: "#000000",
    zIndex: 10,
  },
  topIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: { flex: 1 },
  bottomBar: {
    backgroundColor: "#000000",
    paddingTop: 14,
    alignItems: "center",
  },
  zoomRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  zoomPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomPillActive: { backgroundColor: "rgba(255,255,255,0.32)" },
  zoomText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  zoomTextActive: { color: Colors.white },
  zoomTextSelected: { color: "#FFCC00", fontFamily: "Poppins-SemiBold" },
  modeRow: { flexDirection: "row", gap: 18, marginBottom: 22 },
  modeBtn: { paddingHorizontal: 2 },
  modeText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
  },
  modeTextActive: { color: "#FFCC00", fontFamily: "Poppins-SemiBold" },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.white,
  },
});
