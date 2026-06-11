/**
 * OfflinePill.tsx
 * ─────────────────────────────────────────────────────────────────
 * Shared "Go offline / Go online" pill rendered identically on every
 * map screen. Pinned to the same absolute position so it never jumps
 * between screens.
 *
 * Usage:
 *   <OfflinePill />   ← reads + writes riderStore automatically
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Radius } from '../../theme';
import { useToggleStatus } from '../../hooks/rider/useRider';
import { useRiderStore } from '../../store/riderStore';
import PowerCircleIcon from '../../../assets/icons/power-circle.svg';

export default function OfflinePill() {
  const insets = useSafeAreaInsets();
  const { isOnline, isTogglingStatus } = useRiderStore();
  const { mutate: toggleStatus } = useToggleStatus();

  const topOffset = insets.top + (Platform.OS === 'ios' ? 12 : 8);

  return (
    <View style={[styles.wrapper, { top: topOffset }]} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.pill, !isOnline && styles.pillOffline]}
        onPress={() => toggleStatus(!isOnline)}
        activeOpacity={0.85}
        disabled={isTogglingStatus}
      >
        {isTogglingStatus ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <PowerCircleIcon width={18} height={18} />
            <Text style={styles.pillText}>
              {isOnline ? 'Go offline' : 'Go online'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 9,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  pillOffline: {
    backgroundColor: Colors.textSecondary,
  },
  pillText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: Typography.base,
    color: Colors.white,
  },
});