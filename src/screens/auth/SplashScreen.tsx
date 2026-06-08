import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, StatusBar, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(exitOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(
        () => navigation.replace('Welcome'),
      );
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2240" translucent />
      {/* Full-screen background */}
      <Image
        source={require('../../../assets/images/splash-bg.png')}
        style={styles.bg}
        resizeMode="cover"
      />
      {/* Logo on top */}
      {/* <Animated.Image
        source={require('../../../assets/images/voltgo-logo.png')}
        style={[styles.logo, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      /> */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bg: { ...StyleSheet.absoluteFill },
  logo: { width: 220, height: 56 },
});