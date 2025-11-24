import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../component/color';
import images from '../component/image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '../services/userAuth';
import { fetchAddresses } from '../services/address';
import { fetchAllServices } from '../services/services';
const HomeScreen = ({ navigation }) => {

  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone_number: '',
    image: null,
  });
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showPromoCard, setShowPromoCard] = useState(true);

  const handleServiceSelect = (service) => {
    navigation.navigate('SelectTimeSlot', { service });
  };

  const handleSeeAllPress = () => {
    setShowPromoCard(!showPromoCard);
  };
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        console.log('No token found, skipping profile fetch');
        return;
      }

      const response = await getProfile(token);
      
      if (response.success && response.data) {
        setUserData(response.data);
      } else {
        console.error('Profile fetch failed:', response.message);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Profile Error', error?.message || 'Unable to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setLoadingServices(true);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Please log in again');
      }
      
      const servicesData = await fetchAllServices(token);

      
    
      const mappedServices = servicesData.map(service => ({
        id: service.id,
        title: service.name,
        description: service.description,
        imageSource: service.image ? { uri: service.image } : images.service1 
      }));
      
      setServices(mappedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.error('Full error:', error);
      Alert.alert('Services Error', `Failed to load services: ${error.message || 'Network error'}`);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchServices();
  }, []);

  
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      fetchServices();
      fetchSavedAddresses();
      
    
      if (navigation?.route?.params?.hidePromo) {
        setShowPromoCard(false);
      
        navigation.setParams({ hidePromo: undefined });
      }
    }, [fetchUserProfile, fetchServices, fetchSavedAddresses, navigation?.route?.params?.hidePromo])
  );

  const fetchSavedAddresses = useCallback(async () => {
      try {
        setLoadingAddresses(true);
        const addresses = await fetchAddresses();
    
        if (Array.isArray(addresses)) {
          setSavedAddresses(addresses);
        } else {
          setSavedAddresses([]);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
        Alert.alert('Address Error', error?.message || 'Unable to load addresses. Please try again.');
      } finally {
        setLoadingAddresses(false);
      }
    }, []);
  

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image 
            source={userData.image ? { uri: userData.image } : images.profileImage} 
            style={styles.avatar} 
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.userName}>{userData.name}</Text>
          <Text style={styles.userAddress}>{savedAddresses[0]?.house} {savedAddresses[0]?.city} {savedAddresses[0]?.state} {savedAddresses[0]?.pincode}</Text>
        </View>
        <View style={styles.bellContainer}>
          {/* <Image source={images.notificationIcon} style={styles.bellIcon} /> */}
          <View style={styles.notificationDot} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {showPromoCard && (
          <View style={styles.promoCard}>
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>Hot Deal</Text>
            </View>
            <Text style={styles.promoTitle}>44% OFF</Text>
            <Text style={styles.promoSubtitle}>On First 1st Service</Text>
            <TouchableOpacity style={styles.promoButton} activeOpacity={0.8}>
              <Text style={styles.promoButtonText}>Get Discount</Text>
            </TouchableOpacity>
            <Image source={images.cardImage} style={styles.promoImage}  />
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={handleSeeAllPress}>
            <Text style={styles.sectionAction}>{showPromoCard ? 'Hide Promo' : 'Show Promo'}</Text>
          </TouchableOpacity>
        </View>
        
        {loadingServices ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No services available</Text>
          </View>
        ) : (
          services.map((service) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              description={service.description}
              imageSource={service.imageSource}
              onPress={() => handleServiceSelect(service)}
            />
          ))
        )}
   

      </ScrollView>
    </SafeAreaView>
  );
};

const ServiceCard = ({ title, description, imageSource, isSelected, onPress, navigation }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.serviceCard, 
        isSelected && styles.selectedServiceCard
      ]} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceDescription}>{description}</Text>
        <View style={[
          styles.selectButton,
          isSelected && styles.selectedButton
        ]}>
          <Text style={[
            styles.selectButtonText,
            isSelected && styles.selectedButtonText
          ]}>
            {isSelected ? 'Selected' : 'Select service'}
          </Text>
        </View>
      </View>
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.serviceImage} resizeMode='contain' />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    paddingBottom: 50,
    width: '100%',  
    backgroundColor: colors.mainColor,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerText: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  userAddress: {
    fontSize: 12,
    color: colors.primaryText,
  },
  bellContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    width: 45,
    height: 34,
  },
  promoCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    backgroundColor:colors.primary
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6807',
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  promoBadgeText: {
    color: colors.stocke,
    fontSize: 12,
    fontWeight: '600',
  },
  promoTitle: {
    fontSize: 32,
    color: colors.stocke,
    fontWeight: '700',
  },
  promoSubtitle: {
    fontSize: 16,
    color: colors.primaryText,
    marginBottom: 16,
  },
  promoButton: {
    backgroundColor: colors.stocke,
    borderRadius: 24,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  promoButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  promoImage: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 180,
    height: 220,
    borderBottomRightRadius: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline'
  },
  cardList: {
    gap: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    minHeight: 160,
  },
  selectedServiceCard: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#f0f7ff',
  },
  serviceInfo: {
    flex: 1,
    gap: 12,
    paddingRight: '50%',
    paddingVertical: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
  },
  serviceDescription: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  selectButtonText: {
    color: colors.stocke,
    fontWeight: '600',
    fontSize: 11,
  },
  imageContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '45%',
    overflow: 'hidden',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.primaryText,
  },
});

export default HomeScreen;

