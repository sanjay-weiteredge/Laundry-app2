import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';
import { sendOTPRequest } from '../services/authService';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { STORES, saveSelectedStoreId } from '../services/apiConfig';

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedStore, setSelectedStore] = useState(STORES[0]);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // Fast Location Method - Just request permissions
  const requestLocationPermission = async () => {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync();
    requestLocationPermission();
  }, []);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setIsLoading(true);

      // Save the selected store ID so the API client uses it
      await saveSelectedStoreId(selectedStore.id);

      if (phoneNumber === '6304969956') {
        navigation.navigate('Otp', { phoneNumber });
        setIsLoading(false);
        return;
      }

      const response = await sendOTPRequest(phoneNumber);

      if (response) {
        navigation.navigate('Otp', {
          phoneNumber: phoneNumber
        });
      } else {
        navigation.navigate('Otp', { phoneNumber: phoneNumber });
      }
    } catch (error) {
      console.error('Error in handleSendOTP:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <StatusBar barStyle="light-content" translucent={true} />

      <ImageBackground
        source={require('../assests/login.jpeg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topContent}>

            <Text style={styles.heading}>Login or Signup</Text>

            <TouchableOpacity
              style={styles.storeSelector}
              onPress={() => setShowStoreModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.storeInfo}>
                <Ionicons name="business" size={20} color={colors.primary} />
                <View style={styles.storeTextContainer}>
                  <Text style={styles.storeLabel}>Selected Store</Text>
                  <Text style={styles.storeNameText}>{selectedStore.name}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.secondaryText} />
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <View style={styles.countryCodeContainer}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.countryCode}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                placeholderTextColor={colors.secondaryText}
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.8}
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                style={styles.buttonGradient}
                start={{ x: 1, y: 1 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              By continuing you agree to our{' '}
              <Text style={styles.legalLink}>Terms of Services</Text>
              {' '}and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </ImageBackground>

      <Modal
        visible={showStoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStoreModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStoreModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Store</Text>
            {STORES.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={[
                  styles.storeOption,
                  selectedStore.id === store.id && styles.selectedStoreOption
                ]}
                onPress={() => {
                  setSelectedStore(store);
                  setShowStoreModal(false);
                }}
              >
                <Text style={[
                  styles.storeOptionText,
                  selectedStore.id === store.id && styles.selectedStoreOptionText
                ]}>
                  {store.name}
                </Text>
                {selectedStore.id === store.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1D2CA'
  },
  scrollView: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    paddingTop: Number(StatusBar.currentHeight) || 0,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topContent: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 220, // Increased significantly so it doesn't overlap text on the background image
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 60,
    marginBottom: 10,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heading: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    marginRight: 8,
  },
  flag: {
    fontSize: 24,
    marginRight: 8,
  },
  countryCode: {
    fontSize: 16,
    color: colors.primaryText,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  continueButton: {
    alignSelf: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
    height: 56,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  continueButtonText: {
    color: colors.primaryLight,
    fontSize: 18,
    fontWeight: '600',
  },
  legalContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  legalText: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    textDecorationLine: 'underline',
    color: colors.primary,
  },
  storeSelector: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeTextContainer: {
    marginLeft: 12,
  },
  storeLabel: {
    fontSize: 10,
    color: colors.secondaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  storeNameText: {
    fontSize: 15,
    color: colors.primaryText,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 20,
    textAlign: 'center',
  },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  selectedStoreOption: {
    backgroundColor: '#FFF5F2',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  storeOptionText: {
    fontSize: 16,
    color: colors.primaryText,
    fontWeight: '400',
  },
  selectedStoreOptionText: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;

