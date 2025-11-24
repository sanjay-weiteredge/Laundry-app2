import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../component/color';
import images from '../component/image';
import { getProfile } from '../services/userAuth';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const storedUser = await AsyncStorage.getItem('userData');
          console.log('Stored user:', storedUser);
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              if (parsedUser?.name) {
                navigation.replace('Main');
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse stored user data:', parseError);
            }
          }

          try {
            const profileResponse = await getProfile(token);
            const profileData = profileResponse?.data;

            if (profileData?.name) {
              const normalizedUser = {
                id: profileData?.id ?? profileData?._id ?? null,
                name: profileData?.name,
                email: profileData?.email ?? '',
                phoneNumber: profileData?.phone_number ?? '',
                image: profileData?.image ?? null,
                token,
              };

              await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));
              navigation.replace('Main');
              return;
            }
          } catch (profileError) {
            console.warn('Error validating user profile during bootstrap:', profileError);
          }

          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          navigation.replace('Login');
          return;
        }
      } catch (e) {
        console.warn('Error during splash bootstrap:', e);
      }
      navigation.replace('Onboarding');
    };

    const timer = setTimeout(bootstrap, 1200);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#F9B4B4', colors.primary]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar barStyle="light-content" translucent={true} />
      
     
      <View style={styles.iconContainer}>
        <View>
          <Image 
            source={images.splashIcon} 
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
      </View>


      <Text style={styles.text}>Your Local Services, Just a Tap Away!</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Number(StatusBar.currentHeight) || 0,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 150,
    height: 150,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 50,
    paddingHorizontal: 40,
  },
});

export default SplashScreen;

