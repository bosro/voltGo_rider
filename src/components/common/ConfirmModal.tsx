/**
 * ConfirmModal.tsx
 * Reusable confirmation modal for Voltgo — matches app design system.
 *
 * Usage:
 *   <ConfirmModal
 *     visible={showModal}
 *     title="Log out"
 *     message="Are you sure you want to log out?"
 *     confirmLabel="Log out"
 *     variant="danger"           // "danger" | "primary" | "default"
 *     onConfirm={handleLogout}
 *     onCancel={() => setShowModal(false)}
 *   />
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";

const Colors = {
  white: "#FFFFFF",
  navy: "#0B1F3A",
  primary: "#4CD964",
  textPrimary: "#1A1A2E",
  textMuted: "#9CA3AF",
  border: "#EFEFEF",
  danger: "#E05252",
  overlay: "rgba(11, 31, 58, 0.55)",
};

export type ConfirmModalVariant = "danger" | "primary" | "default";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.spring(scaleY, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 40,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const confirmBgColor =
    variant === "danger"
      ? Colors.danger
      : variant === "primary"
        ? Colors.primary
        : Colors.navy;

  const confirmTextColor =
    variant === "primary" ? Colors.textPrimary : Colors.white;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdropInner, { opacity }]} />
      </Pressable>

      {/* Sheet */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity,
              transform: [{ translateY }, { scale: scaleY }],
            },
          ]}
        >
          {/* Drag pill */}
          <View style={styles.pill} />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: confirmBgColor }, loading && { opacity: 0.65 }]}
              onPress={onConfirm}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={confirmTextColor} />
              ) : (
                <Text style={[styles.confirmText, { color: confirmTextColor }]}>
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  backdropInner: {
    backgroundColor: Colors.overlay,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  pill: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  title: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  message: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: 28,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelText: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmText: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});