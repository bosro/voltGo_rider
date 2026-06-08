import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
  TextInputProps,
  Dimensions,
} from "react-native";
import { SvgProps, SvgXml } from "react-native-svg";
import { Colors, Typography, Spacing, Radius, Shadow } from "../../theme";

const HERO_HEIGHT = Dimensions.get("window").height * 0.34;

// ── NavyButton ────────────────────────────────────────────────────
export function NavyButton({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[btnS.navy, disabled && btnS.disabled, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text style={btnS.navyText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── GhostButton ───────────────────────────────────────────────────
export function GhostButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      style={[btnS.ghost, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={btnS.ghostText}>{label}</Text>
    </TouchableOpacity>
  );
}

const btnS = StyleSheet.create({
  navy: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.button,
  },
  navyText: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.lg,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  ghost: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.lg,
    color: Colors.textPrimary,
  },
  disabled: { opacity: 0.5 },
});

// ── InputField ────────────────────────────────────────────────────
export function InputField({
  IconComponent,
  iconSvg, // ← add this
  iconWidth = 18,
  iconHeight = 18,
  style,
  ...props
}: {
  IconComponent?: React.FC<SvgProps>;
  iconSvg?: string; // ← add this
  iconWidth?: number;
  iconHeight?: number;
  style?: StyleProp<ViewStyle>;
} & TextInputProps) {
  return (
    <View style={[fldS.wrap, style]}>
      {IconComponent && (
        <IconComponent
          width={iconWidth}
          height={iconHeight}
          style={fldS.icon}
        />
      )}
      {iconSvg && !IconComponent && (
        <SvgXml
          xml={iconSvg}
          width={iconWidth}
          height={iconHeight}
          style={fldS.icon}
        />
      )}
      <TextInput
        style={fldS.input}
        placeholderTextColor={Colors.textPlaceholder}
        {...props}
      />
    </View>
  );
}

// ── DropdownField ─────────────────────────────────────────────────
export function DropdownField({
  IconComponent,
  iconSvg, // ← add this
  iconWidth = 18,
  iconHeight = 18,
  placeholder,
  value,
  onPress,
  ChevronComponent,
  chevronSvg, // ← add this
  style,
}: {
  IconComponent?: React.FC<SvgProps>;
  iconSvg?: string; // ← add this
  iconWidth?: number;
  iconHeight?: number;
  placeholder: string;
  value?: string;
  onPress: () => void;
  ChevronComponent?: React.FC<SvgProps>; // make optional
  chevronSvg?: string; // ← add this
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      style={[fldS.wrap, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {IconComponent && (
        <IconComponent
          width={iconWidth}
          height={iconHeight}
          style={fldS.icon}
        />
      )}
      {iconSvg && !IconComponent && (
        <SvgXml
          xml={iconSvg}
          width={iconWidth}
          height={iconHeight}
          style={fldS.icon}
        />
      )}
      <Text
        style={[fldS.dropText, !value && { color: Colors.textPlaceholder }]}
      >
        {value || placeholder}
      </Text>
      {ChevronComponent && (
        <ChevronComponent width={16} height={16} style={fldS.chevron} />
      )}
      {chevronSvg && !ChevronComponent && (
        <SvgXml xml={chevronSvg} width={16} height={16} style={fldS.chevron} />
      )}
    </TouchableOpacity>
  );
}

const fldS = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
  },
  icon: { marginRight: 10, opacity: 0.65 },
  input: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  dropText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  chevron: { marginLeft: 6, opacity: 0.6 },
});

// ── FieldLabel ────────────────────────────────────────────────────
export function FieldLabel({
  label,
  optional,
}: {
  label: string;
  optional?: boolean;
}) {
  return (
    <Text style={labS.text}>
      {label}
      {optional && <Text style={labS.opt}>{" (Optional)"}</Text>}
    </Text>
  );
}
const labS = StyleSheet.create({
  text: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 14,
  },
  opt: { fontFamily: "Poppins-Regular", color: Colors.textMuted },
});

// ── StepDots ──────────────────────────────────────────────────────
export function StepDots({
  total = 4,
  current,
}: {
  total?: number;
  current: number;
}) {
  return (
    <View style={dotS.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[dotS.dot, i < current ? dotS.active : dotS.inactive]}
        />
      ))}
    </View>
  );
}
const dotS = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  dot: { height: 5, borderRadius: 3 },
  active: { width: 36, backgroundColor: Colors.navy },
  inactive: { width: 36, backgroundColor: Colors.divider },
});

// ── HeroImageHeader ───────────────────────────────────────────────
export function HeroImageHeader({
  source,
  style,
}: {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[heroS.container, style]}>
      <Image source={source} style={heroS.image} resizeMode="cover" />
    </View>
  );
}
const heroS = StyleSheet.create({
  container: {
    width: "100%",
    height: HERO_HEIGHT,
    borderRadius: Radius.xl,
    overflow: "hidden",
    backgroundColor: Colors.navy,
  },
  image: { width: "100%", height: "100%" },
});

// ── UploadCard ────────────────────────────────────────────────────
export function UploadCard({
  title,
  fileUri,
  onPress,
  UploadIconComponent,
  PlusIconComponent,
}: {
  title: string;
  fileUri?: string;
  onPress: () => void;
  UploadIconComponent: React.FC<SvgProps>;
  PlusIconComponent: React.FC<SvgProps>;
}) {
  return (
    <View style={upS.card}>
      <Text style={upS.title}>{title}</Text>
      <TouchableOpacity
        style={upS.dashedBox}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {fileUri ? (
          <Image
            source={{ uri: fileUri }}
            style={upS.preview}
            resizeMode="cover"
          />
        ) : (
          <>
            <UploadIconComponent
              width={32}
              height={32}
              style={{ marginBottom: 8, opacity: 0.7 }}
            />
            <Text style={upS.hint}>
              {
                "Browse and choose the files you want\nto upload from your device"
              }
            </Text>
            <TouchableOpacity
              style={upS.plusBtn}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <PlusIconComponent width={18} height={18} />
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
const upS = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    backgroundColor: Colors.white,
  },
  title: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  dashedBox: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: Radius.md,
    paddingVertical: 20,
    alignItems: "center",
    backgroundColor: Colors.offWhite,
  },
  hint: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 14,
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: { width: "100%", height: 120, borderRadius: Radius.sm },
});
