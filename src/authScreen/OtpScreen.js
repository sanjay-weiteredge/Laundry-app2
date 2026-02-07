import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../component/color';
import { verifyOTP, getProfile } from '../services/userAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { updateDeviceToken, sendNotification } from '../services/notificationService';

const OtpScreen = ({ route, navigation }) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);
  const { phoneNumber } = route.params;

  const handleChange = (value, index) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    const digit = sanitized[sanitized.length - 1];
    const updated = [...otp];
    updated[index] = digit || '';
    setOtp(updated);

    if (!digit) {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (index < inputRefs.current.length - 1 && digit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit OTP');
      return;
    }

    try {
      setIsLoading(true);
     
      const response = await verifyOTP(phoneNumber, otpCode);
      
      if (response.success && response.token) {
        const token = response.token;
        await AsyncStorage.setItem('userToken', token);

        try {
          const deviceToken = (await Notifications.getDevicePushTokenAsync()).data;
          await updateDeviceToken(token, deviceToken);
          const message = {
            title: "Login Successful",
            body: "You have successfully logged in.",
            subtitle: "Welcome back!"
          };
          await sendNotification(token, deviceToken, message);
        } catch (e) {
          console.log("Push notification setup failed", e);
        }

        
        // Save the token to AsyncStorage
        if (response.token) {
          await AsyncStorage.setItem('userToken', response.token);

          // Attempt to fetch profile to determine if user already exists
          try {
            const profileResponse = await getProfile(response.token);
            const profileData = profileResponse?.data;
            const hasBasicDetails =
              profileData?.name && profileData?.email;

            if (hasBasicDetails) {
              const userData = {
                id: profileData?.id ?? phoneNumber,
                name: profileData?.name,
                email: profileData?.email,
                phoneNumber: profileData?.phone_number ?? phoneNumber,
                image: profileData?.image ?? null,
                token: response.token,
              };

              await AsyncStorage.setItem('userData', JSON.stringify(userData));

              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
              return;
            }

          } catch (profileError) {
           
          }

          // Navigate to BasicDetails screen with phoneNumber and token for new users
          navigation.navigate('BasicDetails', {
            phoneNumber,
            token: response.token, // Pass token as a parameter for immediate use
          });
        } else {
          // Still navigate but show a warning
          Alert.alert('Warning', 'No authentication token received');
          navigation.navigate('BasicDetails', { phoneNumber });
        }
      } else {
        Alert.alert('Error', response.message || 'Invalid OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" translucent={true} />

      <LinearGradient
        colors={[colors.primary,'rgba(249, 115, 115, 0.15)' ]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topSection}>
            <View style={styles.header}>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>Enter the 4 digit code that we</Text> 
              <Text style={styles.subtitle}>sent to your number</Text>
            </View>

            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => {
                    inputRefs.current[index] = ref;
                  }}
                  style={styles.otpBox}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={value => handleChange(value, index)}
                  onKeyPress={event => handleKeyPress(event, index)}
                  returnKeyType={index === otp.length - 1 ? 'done' : 'next'}
                  autoFocus={index === 0}
                  editable={!isLoading}
                />
              ))}
            </View>

            <Text style={styles.resend}>
              Didn't get the code?{' '}
              <Text style={styles.resendLink} onPress={() => {}}>
                Resend in 30s
              </Text>
            </Text>
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity 
              style={[styles.continueButton, isLoading && styles.buttonDisabled]} 
              activeOpacity={0.8} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['rgba(237, 97, 97, 0.85)', colors.primary]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.legalText}>
              By continuing you agree to our{' '}
              <Text style={styles.legalLink}>Terms of Services</Text> and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingTop: (Number(StatusBar.currentHeight) || 0) + 16,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
    width: '100%',
  },
  topSection: {
    paddingTop: 9,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
  },
  header: {
    marginBottom: 54,
  },
  title: {
    color: colors.primaryLight,
    fontSize: 32,
    fontWeight: '700',
  },
  titleStrong: {
    color: colors.primaryLight,
    fontSize: 34,
    fontWeight: '700',
    marginTop: 4,
  },
  subtitle: {
    color: colors.primaryLight,
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 58,
    marginBottom: 16,
  },
  otpBox: {
    width: 58,
    height: 58,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    color: colors.primaryText,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  resend: {
    color: colors.primaryLight,
    fontSize: 14,
    textAlign: 'start',
    marginTop: 12,
  },
  resendLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  continueButton: {
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
    height: 56,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 144,
    paddingHorizontal: 14,
    width: '100%',
    alignSelf: 'stretch',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.primaryLight,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  title: {
    color: colors.primaryLight,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  legalText: {
    textAlign: 'center',
    color: colors.secondaryText,
    fontSize: 12,
  },
  legalLink: {
    textDecorationLine: 'underline',
    color: colors.primary,
  },
});

export default OtpScreen;