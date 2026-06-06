import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Animated, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavyButton } from '../../components/common';
import { Colors, Typography } from '../../theme';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 58, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <View style={styles.hero}>
        <Image
          source={require('../../../assets/images/onboarding1.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>
      <Animated.View style={[styles.bottom, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <Text style={styles.heading}>{'Student Commerce\nAnd Mobility Made Efficient!'}</Text>
        <Text style={styles.body}>
          Deliver, track, and pay seamlessly with one smart{'\n'}app built for campus convenience.
        </Text>
        <NavyButton label="Get started" onPress={() => navigation.navigate('PhoneEntry')} style={styles.btn} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  hero: {
    marginHorizontal: 14,
    marginTop: 10,
    height: height * 0.52,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: Colors.navy,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottom: { flex: 1, paddingHorizontal: 22, paddingTop: 22 },
  heading: {
    fontFamily: 'HelveticaNeue-CondensedBold',
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: { marginHorizontal: 0 },
});