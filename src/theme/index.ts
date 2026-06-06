export const Colors = {
  navy: '#0D2240',
  navyDark: '#091829',
  navyMid: '#1A3A5C',
  primary: '#4CD964',
  orange: '#F05A28',
  white: '#FFFFFF',
  offWhite: '#F7F8FA',
  inputBg: '#F0F2F5',
  textPrimary: '#0D1B2A',
  textSecondary: '#5A6478',
  textMuted: '#9CA3AF',
  textPlaceholder: '#B8BFCB',
  textLink: '#1D5FA8',
  textGreen: '#009E60',
  border: '#E2E6EC',
  divider: '#ECEEF2',
  otpBorder: '#D8DCE4',
  otpBg: '#F0F2F5',
  chartBlue: '#1A3A5C',
  trendUp: '#00C07F',
  trendDown: '#E53E3E',
  errorRed: '#E53E3E',
  mapBg: '#EAF0F6',
} as const;

export const Typography = {
  xs: 11, sm: 12, base: 14, md: 15, lg: 16,
  xl: 18, xxl: 22, xxxl: 28, balance: 36,
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#0D2240', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  modal: {
    shadowColor: '#0D2240', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  button: {
    shadowColor: '#0D2240', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 14, elevation: 6,
  },
  soft: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
} as const;

export const Fonts = {
  condensedBold: 'HelveticaNeue-CondensedBold',
  regular: 'Poppins-Regular',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
} as const;

export const lightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#eaf0f6' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a9bb5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d0dce8' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#9aafbf' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ccdce8' }] },
  { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d8ecd8' }] },
];
