import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, SafeAreaView, StatusBar, Alert, Modal } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import colors from '../component/color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API } from '../services/apiRequest';
import images from '../component/image';
import { ActivityIndicator } from 'react-native';
import { getProfile } from '../services/userAuth';

const ProfileScreen = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone_number: '',
    image: null,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('error'); 

  const showModal = (message, type = 'error') => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found, skipping profile fetch');
        return;
      }

      const response = await getProfile(token);
      
      if (response.success && response.data) {
        // Add timestamp to image URL to prevent caching
        const userData = { ...response.data };
        if (userData.image) {
          userData.image = `${userData.image}?t=${new Date().getTime()}`;
        }
        setUserData(userData);
      } else {
        console.error('Profile fetch failed:', response.message);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      showModal(error?.message || 'Unable to refresh profile. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleLogout = () => {
    setModalMessage('Are you sure you want to logout?');
    setModalType('confirm');
    setModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error during logout:', error);
      showModal('Error during logout. Please try again.', 'error');
    }
  };

  const menuItems = [
    { icon: 'edit-3', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'shopping-bag', label: 'My Orders', onPress: () => navigation.navigate('Myorder') },
    { icon: 'map-pin', label: 'Saved Addresses', onPress: () => navigation.navigate('Address') },
    { icon: 'shield', label: 'Privacy Policy', onPress: () => navigation.navigate('PrivacyPolicy') },
    { icon: 'help-circle', label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport') },
    { icon: 'list', label: 'Price List', onPress: () => navigation.navigate('PriceList') },

    { 
      icon: 'log-out', 
      label: 'Logout',
      onPress: handleLogout,
      textColor: '#FF3B30'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={userData.image ? { uri: userData.image } : images.profileImage}
              onError={(error) => console.log('Image load error:', error.nativeEvent.error)}
              style={styles.profileImage}
            />
            <TouchableOpacity 
              style={styles.editIcon}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <MaterialIcons name="edit" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userData.name || 'Your Name'}</Text>
          <Text style={styles.userEmail}>{userData.email || 'your.email@example.com'}</Text>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={styles.contactText}>{userData.phone_number || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={item.onPress || (() => {})}
            >
              <View style={[styles.menuIcon, item.textColor && { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                <Feather 
                  name={item.icon} 
                  size={22} 
                  color={item.textColor || colors.primary} 
                />
              </View>
              <Text style={[styles.menuText, item.textColor && { color: item.textColor }]}>
                {item.label}
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={item.textColor || '#999'} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
    
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons 
                name={modalType === 'error' ? 'alert-circle' : modalType === 'confirm' ? 'help-circle' : 'checkmark-circle'} 
                size={50} 
                color={modalType === 'error' ? '#FF3B30' : modalType === 'confirm' ? '#007AFF' : '#34C759'} 
              />
            </View>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalButtons}>
              {modalType === 'confirm' ? (
                <>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.confirmButton]} 
                    onPress={() => {
                      setModalVisible(false);
                      confirmLogout();
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Logout</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.modalButton, styles.okButton]} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.okButtonText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    height: '93%',
    backgroundColor: '#f8f8f8',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
  
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: colors.primaryLight,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  contactInfo: {
    alignItems: 'center',
    
    width: '100%',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    maxWidth: 250,
  },
  contactText: {
    fontSize: 15,
    color: colors.primary,
    marginLeft: 12,
    fontWeight: '500',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(240, 131, 131, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  okButton: {
    backgroundColor: '#007AFF',
  },
  okButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProfileScreen;