import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  PermissionsAndroid,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import colors from '../component/color';
import { updateUserProfile } from '../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BasicDetails = ({ navigation, route }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { phoneNumber } = route.params;

  const handleSubmit = async () => {


    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);


      // Get the authentication token from AsyncStorage
      const profileStr = await AsyncStorage.getItem('userProfile');
      const profileData = profileStr ? JSON.parse(profileStr) : null;
      const userInfoId = profileData?.id;

      if (!userInfoId) {
        throw new Error('User profile not found. Please log in again.');
      }

      console.log('Calling updateProfile with:', {
        name: name.trim(),
        email: email.trim()
      });

      // Call the update profile API
      const response = await updateUserProfile(userInfoId, {
        firstName: name.trim(),
        email: email.trim(),
        // imageUrl: image // Fabklean usually handles images differently or has a separate field
      });



      if (response && response.success) {
        // Save user data to local storage or context
        const userData = {
          id: response.data?.id || userInfoId || phoneNumber,
          name: response.data?.name || name.trim(),
          email: response.data?.email || email.trim(),
          phoneNumber: response.data?.phone_number || phoneNumber,
        };

        console.log('Saving user data to AsyncStorage:', userData);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));


        // Navigate to the main screen on success
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving details:', error);

      // Check for specific error messages from the backend
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);

        if (error.response.status === 400 &&
          error.response.data.message === 'Email is already in use by another account') {
          Alert.alert('Email Exists', 'This email is already registered. Please use a different email address.');
          return;
        }

        // Handle other error messages from the server
        const errorMessage = error.response.data.message || 'Failed to update profile';
        Alert.alert('Error', errorMessage);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        Alert.alert('Network Error', 'Could not connect to the server. Please check your internet connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error:', error.message);
        Alert.alert('Error', error.message || 'Failed to save details. Please try again.');
      }
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Complete Your Profile</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.secondaryText}
                  value={name}
                  onChangeText={setName}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
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
  gradient: {
    flex: 1,
    paddingTop: (StatusBar.currentHeight || 0) + 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 32,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: colors.primaryText,
    padding: 0,
  },
  button: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default BasicDetails;