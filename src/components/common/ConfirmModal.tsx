/**
 * ConfirmModal.tsx — RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * Replaces Alert.alert(...) across rider screens with a themed,
 * controlled modal. Supports 1 or 2 actions, an optional "danger"
 * style for destructive actions (matches Colors.errorRed elsewhere
 * in your app), and a loading state on the primary button.
 *
 * Usage (declarative — render once per screen, control with state):
 *   const [confirmVisible, setConfirmVisible] = useState(false);
 *
 *   <ConfirmModal
 *     visible={confirmVisible}
 *     title="Order Cancelled"
 *     message="The customer cancelled this delivery."
 *     primaryLabel="OK"
 *     onPrimary={() => { setConfirmVisible(false); navigation.replace("MainTabs"); }}
 *   />
 *
 * Two-button / destructive usage:
 *   <ConfirmModal
 *     visible={visible}
 *     title="Rider already on the way"
 *     message="Contact support if you need to cancel this delivery."
 *     primaryLabel="Contact support"
 *     onPrimary={() => { setVisible(false); navigation.navigate("Support"); }}
 *     secondaryLabel="Keep delivery"
 *     onSecondary={() => setVisible(false)}
 *     danger
 *   />
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Colors, Radius, Shadow, Typography } from "../../theme";

const { height: SCREEN_H } = Dimensions.get("window");

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Styles primary button red instead of navy — for destructive actions */
  danger?: boolean;
  /** Shows a spinner on the primary button and disables both buttons */
  loading?: boolean;
  /** Called when the user taps the backdrop. Defaults to onSecondary (or no-op). */
  onClose?: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  danger = false,
  loading = false,
  onClose,
}: ConfirmModalProps) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 68,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
    }
  }, [visible]);

  const handleBackdropPress = () => {
    if (loading) return;
    (onClose ?? onSecondary)?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleBackdropPress}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />
      </Animated.View>

      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.btnRow}>
            {!!secondaryLabel && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onSecondary}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                danger && styles.primaryBtnDanger,
                !secondaryLabel && styles.primaryBtnFull,
                loading && { opacity: 0.7 },
              ]}
              onPress={onPrimary}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.primaryText}>{primaryLabel}</Text>
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
    backgroundColor: "rgba(11, 31, 58, 0.45)",
  },
  centerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    ...Shadow.modal,
  },
  title: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 19,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  btnRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  secondaryText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navy,
  },
  primaryBtnFull: { flex: 1 },
  primaryBtnDanger: { backgroundColor: "#EF4444" },
  primaryText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});
