import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NavyButton } from "../../components/common";
import { Colors, Typography } from "../../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/api";

const { width, height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.58;

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const imgScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(imgScale, {
        toValue: 1,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 55,
        friction: 9,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Hero — image only, no background box */}
      <View style={[styles.heroSection, { marginTop: insets.top + 12 }]}>
        <Animated.View
          style={[
            styles.illustrationWrap,
            { transform: [{ scale: imgScale }] },
          ]}
        >
          <Image
            source={require("../../../assets/images/onboarding1.png")}
            style={{ width: width * 1.2, height: HERO_HEIGHT * 1.1 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.bottom,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        <Text style={styles.heading}>
          {"Student Commerce\nAnd Mobility Made Efficient!"}
        </Text>
        <Text style={styles.body}>
          Deliver, track, and pay seamlessly with one smart{"\n"}app built for
          campus convenience.
        </Text>
        <NavyButton
          label="Get started"
          onPress={async () => {
            await AsyncStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, "true");
            navigation.navigate("PhoneEntry");
          }}
          style={[styles.btn, { marginBottom: Math.max(insets.bottom, 8) + 8 }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  heroSection: {
    height: HERO_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  illustrationWrap: {
    width: "100%",
    height: HERO_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },

  bottom: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: "center",
  },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  btn: { width: "100%", marginHorizontal: 0 },
});
