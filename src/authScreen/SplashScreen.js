import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/userService';
import colors from '../component/color';

const splashGif = require('../assests/splash/splash.gif');

const SplashScreen = ({ navigation }) => {
  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  // Main useEffect
  useEffect(() => {
    // Logo fade + bounce
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // Auth bootstrap
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');

        if (token) {
          const storedUser = await AsyncStorage.getItem('userData');

          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed?.name) return navigation.replace('Main');
          }

          const profileResponse = await getUserProfile(JSON.parse(storedUser).id);
          const user = profileResponse?.userInfo;

          if (user?.name) {
            const normalized = {
              id: user?.id,
              name: user?.name,
              email: user?.email ?? '',
              phoneNumber: user?.phoneNumber ?? '',
              image: user?.imageUrl ?? null,
              token,
            };

            await AsyncStorage.setItem('userData', JSON.stringify(normalized));
            return navigation.replace('Main');
          }

          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          return navigation.replace('Login');
        }
      } catch { }

      navigation.replace('Login');
    };

    const timer = setTimeout(bootstrap, 5100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* GIF Splash Background */}
      <Image
        source={splashGif}
        style={styles.gifBackground}
        resizeMode="contain"
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 0,
    backgroundColor: '#F1D2CA',
  },
  gifBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  text: {
    color: 'black',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
});

export default SplashScreen;

