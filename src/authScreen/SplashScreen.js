import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import images from '../component/image';
import { getProfile } from '../services/userAuth';
import { Ionicons } from '@expo/vector-icons';

const SplashScreen = ({ navigation }) => {
  const [address, setAddress] = useState('Fetching location...');
  const [detectingLocation, setDetectingLocation] = useState(true);

  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const addressSlide = useRef(new Animated.Value(20)).current;
  const addressScale = useRef(new Animated.Value(0)).current; // pulse animation

  // Format Address
  const updateAddressFromCoords = async (coords) => {
    try {
      const geocode = await Location.reverseGeocodeAsync(coords);

      if (geocode.length > 0) {
        const {
          name,
          street,
          district,
          city,
          region,
          postalCode,
          country,
        } = geocode[0];

        const fullAddress = [
          name,
          street,
          district,
          city,
          region,
          postalCode,
          country,
        ]
          .filter(Boolean)
          .join(', ');

        setAddress(fullAddress);
      }
    } catch (e) {
      setAddress('Address lookup failed');
    }
  };

  // Fast Location Method
  const getCurrentLocation = async () => {
    try {
      setDetectingLocation(true);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Location permission not granted');
        setDetectingLocation(false);
        return;
      }

      // Instant last known location
      let lastLocation = await Location.getLastKnownPositionAsync();
      if (lastLocation) updateAddressFromCoords(lastLocation.coords);

      // Fresh location in background
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        maximumAge: 1000,
      }).then((freshLocation) => {
        if (freshLocation) updateAddressFromCoords(freshLocation.coords);
      });
    } catch {
      setAddress('Unable to fetch location');
    } finally {
      setDetectingLocation(false);

      // Slide-up
      Animated.spring(addressSlide, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      // ⭐ Pulse Animation (big → small → normal)
      Animated.sequence([
        Animated.timing(addressScale, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(addressScale, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(addressScale, {
          toValue: 1,
          friction: 3,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Main useEffect
  useEffect(() => {
    getCurrentLocation();

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

          const profileResponse = await getProfile(token);
          const user = profileResponse?.data;

          if (user?.name) {
            const normalized = {
              id: user?.id ?? user?._id ?? null,
              name: user?.name,
              email: user?.email ?? '',
              phoneNumber: user?.phone_number ?? '',
              image: user?.image ?? null,
              token,
            };

            await AsyncStorage.setItem('userData', JSON.stringify(normalized));
            return navigation.replace('Main');
          }

          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          return navigation.replace('Login');
        }
      } catch {}

      navigation.replace('Onboarding');
    };

    const timer = setTimeout(bootstrap, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ImageBackground source={images.splashIcon} style={styles.container} resizeMode="cover">
      <StatusBar barStyle="light-content" translucent />

      {/* Logo Animation */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* background already shows full image */}
      </Animated.View>

      {/* Address with Pulse + Slide Animation */}
      <Animated.View
        style={[
          styles.locationContainer,
          {
            transform: [
              { translateY: addressSlide },
              { scale: addressScale }, // pulse effect
            ],
          },
        ]}
      >
        <View style={styles.addressRow}>
          <Ionicons name="location-sharp" size={20} color="white" />

          {detectingLocation ? (
            <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} />
          ) : (
            <Text style={styles.locationText} numberOfLines={1}>
              {address}
            </Text>
          )}
        </View>
      </Animated.View>

      <Text style={styles.text}>Your Local Services, Just a Tap Away!</Text>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 0,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 170,
    height: 170,
  },
  locationContainer: {
    marginBottom: 8,
    width: '90%',
    alignItems: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
  },
  locationText: {
    color: 'white',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '600',
  },
  text: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
});

export default SplashScreen;
