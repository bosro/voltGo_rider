/**
 * PaymentMethodsScreen.tsx
 * Reached from: AccountScreen → "Payment methods"
 *
 * Layout:
 *  - Back header + "Payment Methods" title
 *  - List of saved accounts (mobile money / bank) as cards
 *  - Each card: icon + account name + masked number + delete icon
 *  - "Add payment method" ghost button at bottom
 *  - Add-method bottom sheet: select type (MTN / Vodafone / AirtelTigo / Bank) + number + name
 *
 * SVGs needed: back_arrow.svg, mtn_logo.svg, vodafone_logo.svg, airtel_logo.svg, bank_icon.svg,
 *              trash_delete.svg, plus_navy.svg
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { NavyButton, GhostButton, InputField, DropdownField, FieldLabel } from '../../../components/common';
import { Colors, Typography, Radius, Shadow } from '../../../theme';

const backArrowSvg = `<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 1L1 9L9 17" stroke="#0D1B2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const trashSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5H17" stroke="#E53E3E" stroke-width="1.5" stroke-linecap="round"/><path d="M3 5L4 17C4 18.1 4.9 19 6 19H12C13.1 19 14 18.1 14 17L15 5" stroke="#E53E3E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 5V3C6 2.4 6.4 2 7 2H11C11.6 2 12 2.4 12 3V5" stroke="#E53E3E" stroke-width="1.5"/></svg>`;
const plusNavySvg = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 2V16M2 9H16" stroke="#0D2240" stroke-width="2" stroke-linecap="round"/></svg>`;
const bankSvg = `<svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 8L11 1L21 8" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="8" width="3" height="8" fill="#0D2240" rx="0.5"/><rect x="9.5" y="8" width="3" height="8" fill="#0D2240" rx="0.5"/><rect x="16" y="8" width="3" height="8" fill="#0D2240" rx="0.5"/><path d="M1 18H21" stroke="#0D2240" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const chevronDownSvg = `<svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L8 9L15 1" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const walletSvg = `<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="3" width="18" height="14" rx="2" stroke="#5A6478" stroke-width="1.5" fill="none"/><path d="M1 7H19" stroke="#5A6478" stroke-width="1.5"/><circle cx="14.5" cy="12" r="1.5" fill="#5A6478"/></svg>`;
const userSvg = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="5" r="4" stroke="#5A6478" stroke-width="1.5" fill="none"/><path d="M1 19C1 15.7 5.1 13 9 13C12.9 13 17 15.7 17 19" stroke="#5A6478" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>`;

type Account = { id: string; type: string; name: string; number: string; emoji: string };

const NETWORK_OPTIONS = ['MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo Money', 'Bank Account'];
const NETWORK_EMOJIS: Record<string, string> = { 'MTN Mobile Money': '🟡', 'Vodafone Cash': '🔴', 'AirtelTigo Money': '🔵', 'Bank Account': '🏦' };

export default function PaymentMethodsScreen() {
  const navigation = useNavigation<any>();
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', type: 'MTN Mobile Money', name: 'John Cena', number: '0575****04', emoji: '🟡' },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');

  const handleDelete = (id: string) => {
    Alert.alert('Remove account', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setAccounts(a => a.filter(x => x.id !== id)) },
    ]);
  };

  const handleAdd = () => {
    if (!newType || !newNumber.trim() || !newName.trim()) { Alert.alert('Required', 'Please fill all fields.'); return; }
    setAccounts(prev => [...prev, { id: Date.now().toString(), type: newType, name: newName, number: newNumber, emoji: NETWORK_EMOJIS[newType] || '💳' }]);
    setNewType(''); setNewNumber(''); setNewName(''); setShowForm(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <SvgXml xml={backArrowSvg} width={10} height={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {accounts.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyText}>No payment methods added yet</Text>
          </View>
        )}
        {accounts.map(acc => (
          <View key={acc.id} style={styles.accountCard}>
            <Text style={styles.accountEmoji}>{acc.emoji}</Text>
            <View style={styles.accountInfo}>
              <Text style={styles.accountType}>{acc.type}</Text>
              <Text style={styles.accountMeta}>{acc.name} · {acc.number}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(acc.id)} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <SvgXml xml={trashSvg} width={18} height={20} />
            </TouchableOpacity>
          </View>
        ))}

        {!showForm && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <SvgXml xml={plusNavySvg} width={18} height={18} />
            <Text style={styles.addBtnText}>Add payment method</Text>
          </TouchableOpacity>
        )}

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Account</Text>
            <FieldLabel label="Account Type" />
            <DropdownField placeholder="Select type" value={newType} onPress={() => {
              // Cycle through for demo — replace with modal picker
              const idx = NETWORK_OPTIONS.indexOf(newType);
              setNewType(NETWORK_OPTIONS[(idx + 1) % NETWORK_OPTIONS.length]);
            }} chevronSvg={chevronDownSvg} />
            <FieldLabel label="Account Number" />
            <InputField iconSvg={walletSvg} placeholder="0xx xxx xxxx" value={newNumber} onChangeText={setNewNumber} keyboardType="phone-pad" />
            <FieldLabel label="Account Name" />
            <InputField iconSvg={userSvg} placeholder="Name on account" value={newName} onChangeText={setNewName} autoCapitalize="words" />
            <View style={{ height: 16 }} />
            <NavyButton label="Save account" onPress={handleAdd} />
            <GhostButton label="Cancel" onPress={() => setShowForm(false)} style={{ marginTop: 10 }} />
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  headerTitle: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.xl, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 22, paddingTop: 8 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontFamily: 'Poppins-Regular', fontSize: Typography.base, color: Colors.textMuted },
  accountCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 16, marginBottom: 12, gap: 14, backgroundColor: Colors.white, ...Shadow.card },
  accountEmoji: { fontSize: 28 },
  accountInfo: { flex: 1 },
  accountType: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.base, color: Colors.textPrimary },
  accountMeta: { fontFamily: 'Poppins-Regular', fontSize: Typography.sm, color: Colors.textMuted },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.navy, borderRadius: Radius.lg, borderStyle: 'dashed', paddingVertical: 16, gap: 8, marginTop: 8 },
  addBtnText: { fontFamily: 'Poppins-SemiBold', fontSize: Typography.base, color: Colors.navy },
  formCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 18, marginTop: 16, backgroundColor: Colors.offWhite },
  formTitle: { fontFamily: 'HelveticaNeue-CondensedBold', fontSize: Typography.lg, color: Colors.textPrimary, marginBottom: 4 },
});
