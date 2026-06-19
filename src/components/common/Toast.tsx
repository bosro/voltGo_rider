/**
 * Toast.tsx — RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * Lightweight toast notifications. Matches the customer app's
 * useToast() pattern: wrap the app root in <ToastProvider>, then call
 * toast.success(msg) / toast.error(msg) / toast.info(msg) from any
 * screen.
 *
 * Usage:
 *   // App.tsx
 *   <ToastProvider><RootNavigator /></ToastProvider>
 *
 *   // any screen
 *   const toast = useToast();
 *   toast.error("Failed to submit delivery. Please retry.");
 *   toast.success("Order cancelled");
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Radius, Shadow, Typography } from "../../theme";

// ── Types ─────────────────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 3200;
const ANIM_MS = 240;

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; iconBg: string; text: string }
> = {
  success: { bg: "#0B1F3A", border: "#1A8A3C", iconBg: "#1A8A3C", text: Colors.white },
  error: { bg: "#0B1F3A", border: "#EF4444", iconBg: "#EF4444", text: Colors.white },
  info: { bg: "#0B1F3A", border: "#3B82F6", iconBg: "#3B82F6", text: Colors.white },
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const symbol = variant === "success" ? "✓" : variant === "error" ? "!" : "i";
  return (
    <View style={[styles.iconCircle, { backgroundColor: VARIANT_STYLES[variant].iconBg }]}>
      <Text style={styles.iconText}>{symbol}</Text>
    </View>
  );
}

function ToastBanner({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const variantStyle = VARIANT_STYLES[item.variant];

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: ANIM_MS, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => handleDismiss(), DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: ANIM_MS, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: ANIM_MS, useNativeDriver: true }),
    ]).start(() => onDismiss(item.id));
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top: (Platform.OS === "ios" ? insets.top : insets.top + 8) + 8,
          backgroundColor: variantStyle.bg,
          borderLeftColor: variantStyle.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bannerContent}
        activeOpacity={0.9}
        onPress={handleDismiss}
      >
        <ToastIcon variant={item.variant} />
        <Text style={[styles.message, { color: variantStyle.text }]} numberOfLines={3}>
          {item.message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = String(idRef.current++);
    // Only one toast visible at a time — replace rather than stack,
    // matching mobile-toast convention and avoiding layout jumps.
    setToasts([{ id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    success: (message) => push(message, "success"),
    error: (message) => push(message, "error"),
    info: (message) => push(message, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.overlay} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastBanner key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    position: "absolute",
    left: 14,
    right: 14,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    ...Shadow.modal,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontFamily: "Poppins-Bold",
    fontSize: 13,
    color: Colors.white,
  },
  message: {
    flex: 1,
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    lineHeight: 18,
  },
});