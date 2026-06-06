import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Colors } from "../../theme";

import HomeDefault from "../../../assets/icons/tab-home-default.svg";
import HomeActive from "../../../assets/icons/tab-home-active.svg";
import WalletDefault from "../../../assets/icons/tab-wallet-default.svg";
import WalletActive from "../../../assets/icons/tab-wallet-active.svg";
import ActivitiesDefault from "../../../assets/icons/tab-activities-default.svg";
import ActivitiesActive from "../../../assets/icons/tab-activities-active.svg";
import AccountDefault from "../../../assets/icons/tab-account-default.svg";
import AccountActive from "../../../assets/icons/tab-account-active.svg";
import { SvgProps } from "react-native-svg";

const TABS: {
  name: string;
  IconDefault: React.FC<SvgProps>;
  IconActive: React.FC<SvgProps>;
}[] = [
  { name: "HomeMap", IconDefault: HomeDefault, IconActive: HomeActive },
  { name: "Wallet", IconDefault: WalletDefault, IconActive: WalletActive },
  {
    name: "Activities",
    IconDefault: ActivitiesDefault,
    IconActive: ActivitiesActive,
  },
  { name: "Account", IconDefault: AccountDefault, IconActive: AccountActive },
];

interface Props {
  activeTab?: string;
}

export default function StandaloneTabBar({ activeTab = "HomeMap" }: Props) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        const Icon = isActive ? tab.IconActive : tab.IconDefault;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <Icon width={24} height={24} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#ECEEF2",
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 10,
    height: Platform.OS === "ios" ? 72 : 58,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
});


