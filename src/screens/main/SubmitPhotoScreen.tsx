/**
 * SubmitPhotoScreen.tsx
 * ─────────────────────────────────────────────────────────────────
 * Shows the captured proof photo and lets the rider submit or retake.
 *
 * Fix vs previous version:
 *  - Retake passes the full order context back to CameraCapture so
 *    nothing is lost in the loop.
 *  - Deduped (was defined twice in the codebase — only one copy needed).
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Typography, Radius, Shadow } from "../../theme";
import { MainStackParamList } from "../../navigation/types";
import { useMarkDelivered } from "../../hooks/rider/useOrders";
import { useToast } from "@/components/common/toast";

const { width, height } = Dimensions.get("window");
type SubmitParams = RouteProp<MainStackParamList, "SubmitPhoto">;

export default function SubmitPhotoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SubmitParams>();
  const {
    orderId,
    photoUri,
    amount = 0,
    pickupAddress = "",
    dropoffAddress = "",
    itemType = "",
  } = route.params as any;

  const { mutateAsync: markDelivered, isPending } = useMarkDelivered();
  const toast = useToast();

  const handleSubmit = async () => {
    try {
      const response = await markDelivered({ id: orderId, photoUri });
      // FIX: forward the FULL order returned by the API instead of a
      // 5-field subset — this is what was missing on ActivityDetail.
      const order = response?.data?.data;

      navigation.replace("DeliveryCompleted", {
        orderId,
        amount,
        pickupAddress,
        dropoffAddress,
        itemType,
        // Full order fields, with safe fallbacks to what we already had
        customerName: order?.customer?.full_name,
        customerPhone: order?.customer?.phone,
        vehicleType: order?.vehicle_type,
        paymentMethod: order?.payment_method,
        distanceKm: order?.distance_km,
        durationMins: order?.estimated_duration_mins,
        proofPhotoUrl: order?.proof_of_delivery_url,
      });
    } catch (err: any) {
      console.log(
        "DELIVERY SUBMIT ERROR:",
        JSON.stringify(err?.response?.data ?? err?.message ?? err, null, 2),
      );
      const message =
        err?.response?.data?.message ??
        "Failed to submit delivery. Please retry.";
      toast.error(message);
    }
  };

  const handleRetake = () => {
    // Pass full context so the camera → submit loop never loses order info
    navigation.replace("CameraCapture", {
      orderId,
      amount,
      pickupAddress,
      dropoffAddress,
      itemType,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <Text style={styles.subtitle}>Submit picture to end delivery</Text>

      <View style={styles.photoCard}>
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          resizeMode="cover"
        />
      </View>

      <View style={styles.btnWrap}>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={handleRetake}
          activeOpacity={0.8}
          disabled={isPending}
        >
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          activeOpacity={0.88}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: "center",
    paddingHorizontal: 22,
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 18,
    marginBottom: 22,
  },
  photoCard: {
    width: width - 44,
    height: height * 0.48,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.navy,
    backgroundColor: Colors.inputBg,
    marginBottom: 32,
  },
  photo: { width: "100%", height: "100%" },
  btnWrap: { width: "100%", gap: 12, paddingHorizontal: 16 },
  retakeBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  retakeText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.card,
  },
  submitText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});
