/**
 * Toast.tsx — RIDER APP
 * WhatsApp-style minimal pill toast.
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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const DURATION_MS = 3000;
const ANIM_MS = 200;

// Accent dot color per variant — subtle, not loud
const ACCENT: Record<ToastVariant, string> = {
  success: "#22C55E",
  error: "#EF4444",
  info: "#3B82F6",
};

function ToastBanner({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  React.useEffect(() => {
    // Fade + subtle scale in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIM_MS,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(handleDismiss, DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIM_MS,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.92,
        duration: ANIM_MS,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(item.id));
  };

  const topOffset = (Platform.OS === "ios" ? insets.top : insets.top + 8) + 12;

  return (
    <Animated.View
      style={[
        styles.pill,
        {
          top: topOffset,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleDismiss}
        style={styles.pillInner}
      >
        {/* Accent dot */}
        <View style={[styles.dot, { backgroundColor: ACCENT[item.variant] }]} />
        <Text style={styles.message} numberOfLines={2}>
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
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
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
    alignItems: "center", // centers pill horizontally
  },
  pill: {
    position: "absolute",
    // Auto width — shrinks to content, max prevents overflow
    maxWidth: "80%",
    minWidth: 120,
    backgroundColor: "#1E2530", // dark navy-charcoal, matches your app palette
    borderRadius: 20,
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  pillInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  message: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: "#F1F1F1",
    flexShrink: 1, // wraps before overflowing
    lineHeight: 18,
  },
});
