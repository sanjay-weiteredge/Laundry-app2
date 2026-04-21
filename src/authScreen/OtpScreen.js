import React, { useState, useRef, useEffect } from 'react';
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
import { verifyOTP } from '../services/authService';
import { API_TOKEN, getSelectedStoreId } from '../services/apiConfig';
import { getOrgDetails } from '../services/configService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { updateDeviceToken } from '../services/notificationService';
import { useUser } from '../context/UserContext';

const OtpScreen = ({ route, navigation }) => {
  const { refreshUser } = useUser();
  const [otp, setOtp] = useState(['', '', '', '', '']);
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

    if (otpCode.length !== 5) {
      Alert.alert('Error', 'Please enter a valid 5-digit OTP');
      return;
    }

    try {
      setIsLoading(true);

      let response;
      if (phoneNumber === '6304969956' && otpCode === '12345') {
        // Static bypass for testing
        response = {
          userInfo: {
            id: 11111,
            name: 'Test Member',
            firstName: 'Test',
            email: 'test@example.com',
            phoneNumber: '6304969956',
            walletAmt: 1000
          }
        };
      } else {
        let fcmToken = '';
        try {
          const tokenData = await Notifications.getDevicePushTokenAsync();
          fcmToken = tokenData.data;
        } catch (e) {
          console.log("Could not get push token for verification", e);
        }
        response = await verifyOTP(phoneNumber, otpCode, fcmToken);
      }

      if (response && response.userInfo) {
        const userInfo = response.userInfo;

        // Save the full user profile and session flags
        await AsyncStorage.setItem('userProfile', JSON.stringify(userInfo));
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('userToken', String(userInfo.id)); // Using ID as token for session checks

        // Map to internal userData for compatibility
        const userData = {
          id: userInfo.id,
          name: userInfo.name || userInfo.firstName || '',
          email: userInfo.email || '',
          phoneNumber: userInfo.phoneNumber || phoneNumber,
          walletAmt: userInfo.walletAmt || 0
        };
        await AsyncStorage.setItem('userData', JSON.stringify(userData));

        // --- Fetch & persist live org details from getOrgDetails API ---
        try {
          const storeId = await getSelectedStoreId();
          const orgDetails = await getOrgDetails(storeId);
          if (orgDetails) {
            await AsyncStorage.setItem('orgDetails', JSON.stringify(orgDetails));
            console.log('[OtpScreen] Org details saved:', orgDetails.orgName, '| orgId:', orgDetails.orgId);
          }
        } catch (orgError) {
          // Non-fatal: log the error but don't block login
          console.warn('[OtpScreen] Could not fetch org details:', orgError.message);
        }
        // ----------------------------------------------------------------

        // Sync with global UserContext
        if (refreshUser) {
          await refreshUser();
        }

        // Determine if user is new by checking if first name matches phone number or email is missing
        const isNewUser = !userInfo.firstName ||
          userInfo.firstName === userInfo.phoneNumber ||
          userInfo.firstName === phoneNumber ||
          !userInfo.email;

        if (isNewUser) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'BasicDetails', params: { phoneNumber } }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }
      } else {
        Alert.alert('Error', 'Invalid OTP or verification failed');
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
        colors={[colors.primary, 'rgba(249, 115, 115, 0.15)']}
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
              <Text style={styles.subtitle}>Enter the 5 digit code that we</Text>
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
              <Text style={styles.resendLink} onPress={() => { }}>
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
    width: 54,
    height: 58,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 18,
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