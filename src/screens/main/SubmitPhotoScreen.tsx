import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Colors, Typography, Radius, Shadow } from "../../theme";
import { MainStackParamList } from "../../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
type SubmitParams = RouteProp<MainStackParamList, "SubmitPhoto">;

export default function SubmitPhotoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SubmitParams>();
  const {
    orderId,
    photoUri,
    amount = 20,
    pickupAddress = "American House",
    dropoffAddress = "University of Ghana",
    itemType = "Parcel",
  } = route.params;

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
          onPress={() =>
            navigation.replace("CameraCapture", {
              orderId,
              mode: "delivery_proof",
            })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() =>
            navigation.replace("DeliveryCompleted", {
              orderId,
              amount,
              pickupAddress,
              dropoffAddress,
              itemType,
            })
          }
          activeOpacity={0.88}
        >
          <Text style={styles.submitText}>Submit</Text>
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
  btnWrap: { width: "100%", gap: 12,  paddingHorizontal: 16},
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
    ...Shadow.card,
  },
  submitText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});
