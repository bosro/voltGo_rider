/**
 * SupportScreen.tsx
 * Reached from: AccountScreen → "Support"
 *
 * Layout:
 *  - Back header + "Support" title
 *  - Contact options: WhatsApp, Email, Call (each a card row)
 *  - "FAQ" section label
 *  - Accordion FAQ items (tap to expand/collapse)
 *
 * SVGs needed: back_arrow.svg, whatsapp.svg, email_support.svg, phone_call.svg, chevron_down.svg
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SvgXml } from "react-native-svg";
import { Colors, Typography, Radius, Shadow } from "../../../theme";
import { SafeAreaView } from "react-native-safe-area-context";

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const whatsappSvg = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="10" fill="#25D366"/><path d="M7 8C7 8 8 7 9 8C10 9 10.5 10 10 10.5C9.5 11 9 11 10 12C11 13 11.5 12.5 12 12C12.5 11.5 13.5 12 14.5 13C15 13.5 14.5 14.5 14 15C12 16 8 14 7 11C6.5 9.5 7 8 7 8Z" fill="white"/></svg>`;
const emailSvg2 = `<svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="20" height="16" rx="2" stroke="#0D2240" stroke-width="1.5" fill="none"/><path d="M1 4L11 10L21 4" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const phoneSvg2 = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 2H7.5L9 6L7 7.5C7.8 9.4 10.6 12.2 12.5 13L14 11L18 12.5V16C18 17.1 17.1 18 16 18C7.2 18 2 12.8 2 4C2 2.9 2.9 2 4 2Z" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
const chevronDownSvg = `<svg width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L7 8L13 1" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const chevronUpSvg = `<svg width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 8L7 1L13 8" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const FAQS = [
  {
    q: "How do I receive payments?",
    a: "Payments are credited to your wallet after each completed delivery. You can withdraw anytime from the Wallet screen to your registered mobile money or bank account.",
  },
  {
    q: "What happens if I miss an order?",
    a: "Missed orders are returned to the pool. Repeated missed orders may affect your acceptance rate, so only go online when you are ready to take deliveries.",
  },
  {
    q: "How long does withdrawal take?",
    a: "Mobile Money withdrawals are instant. Bank transfers take 1–2 business days.",
  },
  {
    q: "What do I do if a customer is unreachable?",
    a: 'Try calling and messaging at least twice. If still unreachable, take a photo at the drop-off location and tap "Package collected" to document the attempt.',
  },
  {
    q: "How is my earnings calculated?",
    a: "Earnings are based on distance, vehicle type, and package weight. You can see the breakdown in each completed delivery in Activities.",
  },
  {
    q: "How do I report an issue with an order?",
    a: "Tap the chat icon during an active delivery to contact our dispatch team, or reach us via WhatsApp or email below.",
  },
];

export default function SupportScreen() {
  const navigation = useNavigation<any>();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.sectionLabel}>CONTACT US</Text>
        {[
          {
            icon: whatsappSvg,
            label: "WhatsApp",
            sub: "+233 55 123 4567",
            onPress: () => Linking.openURL("https://wa.me/233551234567"),
          },
          {
            icon: emailSvg2,
            label: "Email",
            sub: "support@voltgo.com",
            onPress: () => Linking.openURL("mailto:support@voltgo.com"),
          },
          {
            icon: phoneSvg2,
            label: "Call us",
            sub: "+233 55 123 4567",
            onPress: () => Linking.openURL("tel:+233551234567"),
          },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.contactCard}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
            <View style={styles.contactIcon}>
              <SvgXml xml={item.icon} width={22} height={22} />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactLabel}>{item.label}</Text>
              <Text style={styles.contactSub}>{item.sub}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          FREQUENTLY ASKED QUESTIONS
        </Text>
        {FAQS.map((faq, i) => (
          <View key={i} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              activeOpacity={0.8}
            >
              <Text style={styles.faqQ}>{faq.q}</Text>
              <SvgXml
                xml={openFaq === i ? chevronUpSvg : chevronDownSvg}
                width={14}
                height={9}
              />
            </TouchableOpacity>
            {openFaq === i && <Text style={styles.faqA}>{faq.a}</Text>}
            {i < FAQS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.xl,
    color: Colors.textPrimary,
  },
  scroll: { paddingHorizontal: 22 },
  sectionLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.xs,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    ...Shadow.card,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: { flex: 1 },
  contactLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  contactSub: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  faqItem: { paddingVertical: 4 },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  faqQ: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  faqA: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingBottom: 14,
  },
  divider: { height: 1, backgroundColor: Colors.divider },
});
