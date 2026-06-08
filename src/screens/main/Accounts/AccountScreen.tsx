import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { CommonActions } from "@react-navigation/native";

import ChevronRightIcon from "../../../../assets/icons/chevron-right.svg";
import MenuProfileIcon from "../../../../assets/icons/user-profile.svg";
import MenuPaymentIcon from "../../../../assets/icons/payment.svg";
import MenuNotifIcon from "../../../../assets/icons/notifications.svg";
import MenuSecurityIcon from "../../../..//assets/icons/security.svg";
import MenuSupportIcon from "../../../../assets/icons/support.svg";
import MenuSettingsIcon from "../../../../assets/icons/settings.svg";

// Replace with your actual logout icon path, e.g.: require('@/assets/icons/logout.png')
const logoutIcon = require('../../../../assets/images/logout.png');

import { SvgProps } from "react-native-svg";
import { clearAuthToken } from "@/navigation/RootNavigator";
import { Colors, Typography, Radius, Shadow } from "@/theme";

const MENU: { key: string; label: string; Icon: React.FC<SvgProps> }[] = [
  { key: "Profile", label: "Profile", Icon: MenuProfileIcon },
  { key: "PaymentMethods", label: "Payment methods", Icon: MenuPaymentIcon },
  { key: "Notifications", label: "Notifications", Icon: MenuNotifIcon },
  { key: "Security", label: "Security", Icon: MenuSecurityIcon },
  { key: "Support", label: "Support", Icon: MenuSupportIcon },
  { key: "Settings", label: "Settings", Icon: MenuSettingsIcon },
];

export default function AccountScreen() {
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await clearAuthToken();
          navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: "Splash" }] }),
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <Text style={styles.heading}>Account</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatarPlaceholder}>
          <Text style={{ fontSize: 24 }}>👤</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName}>John Cena</Text>
          <Text style={styles.profileEmail}>johncena1000@gmail.com</Text>
        </View>
      </View>
      <View style={styles.menuList}>
        {MENU.map((item, index) => (
          <React.Fragment key={item.key}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate(item.key as any)}
              activeOpacity={0.7}
            >
              <item.Icon width={22} height={22} style={{ opacity: 0.85 }} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRightIcon width={8} height={14} />
            </TouchableOpacity>
            {index < MENU.length - 1 && <View style={styles.menuDivider} />}
          </React.Fragment>
        ))}
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuRow}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Image source={logoutIcon} style={styles.logoutIcon} resizeMode="contain" />
          <Text style={[styles.menuLabel, { color: Colors.errorRed }]}>
            Log out
          </Text>
          <ChevronRightIcon width={8} height={14} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    textAlign: "center",
    paddingTop: 16,
    paddingBottom: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    marginBottom: 18,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: { flex: 1 },
  profileName: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  profileEmail: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  menuList: { paddingHorizontal: 22 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 17,
    gap: 14,
  },
  menuLabel: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  menuDivider: { height: 1, backgroundColor: Colors.divider },
  logoutIcon: { width: 22, height: 22, opacity: 0.85 },
});