import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions, ScrollView,
} from 'react-native';
import { Colors, Typography } from '@/theme';

const { height: SCREEN_H } = Dimensions.get('window');

export type RiderFilterState = {
  months: string[];
  statuses: string[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: RiderFilterState) => void;
  current: RiderFilterState;
  availableMonths: string[];
};

const STATUS_OPTIONS = [
  { id: 'delivered',  label: 'Delivered'  },
  { id: 'cancelled',  label: 'Cancelled'  },
  { id: 'failed',     label: 'Failed'     },
];

export default function FilterBottomSheet({
  visible, onClose, onApply, current, availableMonths,
}: Props) {
  const slideY = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [months, setMonths] = React.useState<string[]>(current.months);
  const [statuses, setStatuses] = React.useState<string[]>(current.statuses);

  useEffect(() => {
    if (visible) {
      setMonths(current.months);
      setStatuses(current.statuses);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const handleApply = () => {
    onApply({ months, statuses });
    onClose();
  };

  const handleReset = () => {
    setMonths([]);
    setStatuses([]);
  };

  const hasFilters = months.length > 0 || statuses.length > 0;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter Activities</Text>
            {hasFilters && (
              <TouchableOpacity onPress={handleReset} activeOpacity={0.7}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Month filter — only shown when there are past orders */}
            {availableMonths.length > 0 && (
              <>
                <Text style={styles.filterLabel}>Month</Text>
                <View style={styles.chipGrid}>
                  {availableMonths.map(month => (
                    <TouchableOpacity
                      key={month}
                      style={[styles.chip, months.includes(month) && styles.chipActive]}
                      onPress={() => toggle(months, month, setMonths)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, months.includes(month) && styles.chipTextActive]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Status filter */}
            <Text style={[styles.filterLabel, availableMonths.length > 0 && { marginTop: 20 }]}>
              Status
            </Text>
            <View style={styles.chipGrid}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, statuses.includes(s.id) && styles.chipActive]}
                  onPress={() => toggle(statuses, s.id, setStatuses)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, statuses.includes(s.id) && styles.chipTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.applyBtn}
            onPress={handleApply}
            activeOpacity={0.85}
          >
            <Text style={styles.applyBtnText}>
              Apply{hasFilters ? ` (${months.length + statuses.length})` : ''}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,31,58,0.45)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: SCREEN_H * 0.65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDE1E9',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: 'HelveticaNeue-CondensedBold',
    fontSize: 19,
    color: Colors.textPrimary,
  },
  resetText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    color: '#EF4444',
  },
  filterLabel: {
    fontFamily: 'HelveticaNeue-CondensedBold',
    fontSize: 15,
    color: Colors.navy,
    marginBottom: 12,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  chipActive: {
    borderColor: Colors.navy,
    backgroundColor: Colors.navy,
  },
  chipText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: Colors.textPrimary,
  },
  chipTextActive: {
    fontFamily: 'Poppins-SemiBold',
    color: Colors.white,
  },
  applyBtn: {
    marginTop: 28,
    backgroundColor: Colors.navy,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});