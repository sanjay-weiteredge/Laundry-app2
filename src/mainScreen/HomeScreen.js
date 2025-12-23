import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert, TouchableWithoutFeedback, Keyboard,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../component/color';
import images from '../component/image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '../services/userAuth';
import { fetchAddresses } from '../services/address';
import { fetchUserServices } from '../services/services';
import * as Location from 'expo-location';
import AutoSwiper from '../component/swiper';

const getAddressIdentifier = (address) =>
  address?.id?.toString() ??
  address?.address_id?.toString() ??
  address?.addressId?.toString() ??
  address?._id?.toString() ??
  address?.uuid ??
  null;

const formatAddressLine = (address) => {
  if (!address) {
    return '';
  }
  const primary = [address?.house, address?.street].filter(Boolean).join(', ');
  const secondary = [address?.city, address?.state, address?.pincode || address?.postal_code]
    .filter(Boolean)
    .join(', ');
  return primary || secondary || address?.address_line || address?.addressLine || 'Unnamed location';
};

const getAddressIcon = (label = 'Home') => {
  switch (label) {
    case 'Work':
      return 'briefcase-outline';
    case 'Other':
      return 'location-outline';
    default:
      return 'home-outline';
  }
};
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
  const [selectedServices, setSelectedServices] = useState({});

  const toggleServiceSelection = (service) => {
    setSelectedServices(prev => {
      if (prev[service.id]) {
        // Remove service if already selected
        const { [service.id]: _, ...rest } = prev;
        return rest;
      } else {
        // Add service with quantity 1 if not selected
        return {
          ...prev,
          [service.id]: {
            ...service,
            quantity: 1
          }
        };
      }
    });
  };
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [detectedLocation, setDetectedLocation] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [detectedMetaLine, setDetectedMetaLine] = useState('');

  const handleServiceSelect = (service) => {
    toggleServiceSelection(service);
  };

  const handleContinue = () => {
    const selected = Object.values(selectedServices);
    if (selected.length > 0) {
      navigation.navigate('SelectTimeSlot', { 
        services: selected, 
        selectedAddress 
      });
    } else {
      Alert.alert('No Services Selected', 'Please select at least one service to continue.');
    }
  };

  const handleSeeAllPress = () => {
    setShowPromoCard(!showPromoCard);
  };
  
  const resolvePreferredAddress = useCallback(
    (addresses) => {
      if (!Array.isArray(addresses) || addresses.length === 0) {
        return null;
      }
      const preferred =
        addresses.find((addr) => addr?.is_default || addr?.isDefault) || addresses[0];
      const prevId = getAddressIdentifier(selectedAddress);
      const exists =
        prevId && addresses.some((addr) => getAddressIdentifier(addr) === prevId);
      return exists
        ? addresses.find((addr) => getAddressIdentifier(addr) === prevId)
        : preferred;
    },
    [selectedAddress]
  );
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
      
      const servicesData = await fetchUserServices(token);

      
    
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

  // Save location to cache
  const saveLocationToCache = async (coords, address, meta) => {
    try {
      const locationData = {
        coords,
        address,
        meta,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem('@cachedLocation', JSON.stringify(locationData));
    } catch (error) {
      console.error('Error saving location to cache:', error);
    }
  };

  // Load location from cache
  const loadCachedLocation = async () => {
    try {
      const cachedData = await AsyncStorage.getItem('@cachedLocation');
      if (cachedData) {
        const { coords, address, meta } = JSON.parse(cachedData);
        setDetectedLocation(address);
        setDetectedMetaLine(meta);
        return coords;
      }
    } catch (error) {
      console.error('Error loading cached location:', error);
    }
    return null;
  };

  const updateAddressFromCoords = async (coords) => {
    try {
      const reverse = await Location.reverseGeocodeAsync(coords);
      if (reverse.length > 0) {
        const place = reverse[0];
        const description = [place.name, place.street].filter(Boolean).join(', ');
        const meta = [place.city ?? place.subregion, place.region, place.postalCode]
          .filter(Boolean)
          .join(' ');
        
        // Update state
        setDetectedLocation(description || 'Current location detected');
        setDetectedMetaLine(meta);
        
        // Save to cache
        await saveLocationToCache(coords, description, meta);
      } else {
        setDetectedLocation('Current location detected');
        setDetectedMetaLine('');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setLocationError('Unable to get address');
    }
  };

  const detectCurrentLocation = useCallback(async () => {
    try {
      setDetectingLocation(true);
      setLocationError('');

      // First try to load from cache
      const cachedCoords = await loadCachedLocation();
      if (cachedCoords) {
        // We already updated the UI from loadCachedLocation
        // Now check if we should update in the background
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          return;
        }
        
        // Get fresh location in the background
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          maximumAge: 1000, // 1 second
        }).then((freshLocation) => {
          if (freshLocation) {
            updateAddressFromCoords(freshLocation.coords);
          }
        }).catch(error => {
          console.error('Error getting fresh location:', error);
        });
        return;
      }
      
      // No cache found, proceed with normal flow
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setDetectedLocation('');
        return;
      }

      // First try to get the last known location (fast)
      const lastLocation = await Location.getLastKnownPositionAsync();
      if (lastLocation) {
        await updateAddressFromCoords(lastLocation.coords);
      }

      // Then get fresh location in the background
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        maximumAge: 1000, // 1 second
      }).then((freshLocation) => {
        if (freshLocation) {
          updateAddressFromCoords(freshLocation.coords);
        }
      }).catch(error => {
        console.error('Error getting fresh location:', error);
      });
      
    } catch (error) {
      console.error('Location detection error:', error);
      setLocationError('Unable to fetch your location');
      setDetectedLocation('');
      setDetectedMetaLine('');
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchServices();
    detectCurrentLocation();
  }, [fetchUserProfile, fetchServices, detectCurrentLocation]);

  
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      fetchServices();
      fetchSavedAddresses();
      detectCurrentLocation();
      
    
      if (navigation?.route?.params?.hidePromo) {
        setShowPromoCard(false);
      
        navigation.setParams({ hidePromo: undefined });
      }
    }, [fetchUserProfile, fetchServices, fetchSavedAddresses, detectCurrentLocation, navigation?.route?.params?.hidePromo])
  );

  const selectedAddressPrimary = selectedAddress
    ? [selectedAddress?.house, selectedAddress?.street].filter(Boolean).join(', ')
    : detectedLocation || 'Detecting location...';
  const selectedAddressSecondary = selectedAddress
    ? [selectedAddress?.city, selectedAddress?.state, selectedAddress?.pincode || selectedAddress?.postal_code]
        .filter(Boolean)
        .join(' ')
    : detectedMetaLine;
  const headerAddressLine = [selectedAddressPrimary, selectedAddressSecondary].filter(Boolean).join(' ');
  const selectedAddressLabel = selectedAddress?.label || 'Current Location';
  
  const handleSelectAddress = useCallback((address) => {
    setSelectedAddress(address);
    setLocationModalVisible(false);
  }, []);

  const fetchSavedAddresses = useCallback(async () => {
      try {
        setLoadingAddresses(true);
        const addresses = await fetchAddresses();
    
        if (Array.isArray(addresses)) {
          setSavedAddresses(addresses);
          const preferred = resolvePreferredAddress(addresses);
          setSelectedAddress(preferred);
        } else {
          setSavedAddresses([]);
          setSelectedAddress(null);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
        Alert.alert('Address Error', error?.message || 'Unable to load addresses. Please try again.');
      } finally {
        setLoadingAddresses(false);
      }
    }, []);
  

  const renderAddressModal = () => (
    <Modal
      transparent
      visible={locationModalVisible}
      animationType="slide"
      onRequestClose={() => setLocationModalVisible(false)}
    >
      <View style={styles.addressModalOverlay}>
        <View style={styles.addressModalContainer}>
          <View style={styles.addressModalHeader}>
            <Text style={styles.addressModalTitle}>Choose delivery location</Text>
            <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
              <Ionicons name="close" size={22} color={colors.primaryText} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.addressList}>
            <TouchableOpacity
              style={styles.addressOption}
              onPress={() => {
                setSelectedAddress(null);
                detectCurrentLocation();
                setLocationModalVisible(false);
              }}
            >
              <View style={styles.addressOptionLeft}>
                <View style={styles.addressIconBubble}>
                  <Ionicons name="locate" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={styles.addressOptionLabel}>Use current location</Text>
                  <Text style={styles.addressOptionSummary} numberOfLines={2}>
                    {detectedLocation || 'Detecting location...'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {loadingAddresses ? (
              <View style={styles.addressLoadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.addressLoadingText}>Loading your addresses...</Text>
              </View>
            ) : savedAddresses.length > 0 ? (
              savedAddresses.map((address, index) => {
                const identifier =
                  getAddressIdentifier(address) || address?.createdAt || `address-${index}`;
                const isActive =
                  identifier && identifier === getAddressIdentifier(selectedAddress);
                return (
                  <TouchableOpacity
                    key={identifier}
                    style={[styles.addressOption, isActive && styles.addressOptionActive]}
                    onPress={() => handleSelectAddress(address)}
                  >
                    <View style={styles.addressOptionLeft}>
                      <View style={styles.addressIconBubble}>
                        <Ionicons name={getAddressIcon(address?.label)} size={18} color="#fff" />
                      </View>
                      <View style={styles.addressOptionContent}>
                        <Text style={styles.addressOptionLabel}>{address?.label || 'Saved'}</Text>
                        <Text style={styles.addressOptionSummary} numberOfLines={2}>
                          {formatAddressLine(address)}
                        </Text>
                      </View>
                    </View>
                    {isActive ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noAddressSaved}>
                <Ionicons name="location-outline" size={32} color={colors.primary} />
                <Text style={styles.noAddressTitle}>No saved addresses</Text>
                <Text style={styles.noAddressSubtitle}>Add one to access it quickly.</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => {
              setLocationModalVisible(false);
              navigation.navigate('Profile', { screen: 'Address' });
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addAddressButtonText}>Add new address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image 
            source={userData.image ? { uri: userData.image } : images.profileImage} 
            style={styles.avatar} 
          />
        </View>
        <TouchableOpacity
          style={styles.headerInfo}
          activeOpacity={0.85}
          onPress={() => {
            if (savedAddresses.length === 0) {
              Alert.alert('No saved addresses', 'Please add an address first.');
              navigation.navigate('Profile', { screen: 'Address' });
            } else {
              setLocationModalVisible(true);
            }
          }}
        >
          <Text style={styles.headerName} numberOfLines={1}>
            {userData.name || 'User'}
          </Text>
          <View style={styles.headerAddressRow}>
            {detectingLocation ? (
              <ActivityIndicator size="small" color={colors.primaryText} style={styles.headerAddressLoader} />
            ) : (
              <Text style={styles.headerAddressText} numberOfLines={1}>
                {headerAddressLine}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.actionsRight}>
          <TouchableOpacity
            onPress={async () => {
              const phoneUrl = 'tel:+919999999999';
              try {
                const supported = await Linking.canOpenURL(phoneUrl);
                if (supported) {
                  await Linking.openURL(phoneUrl);
                } else {
                  Alert.alert('Phone', 'Calling is not supported on this device');
                }
              } catch (e) {
                Alert.alert('Phone', 'Unable to initiate call');
              }
            }}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notification')}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View> */}
      {locationError ? <Text style={styles.locationErrorText}>{locationError}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>

        {showPromoCard && (
          <AutoSwiper/>
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
          services.map((service) => {
            const isSelected = !!selectedServices[service.id];
            return (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={isSelected}
                onSelect={() => handleServiceSelect(service)}
              />
            );
          })
        )}
    {Object.keys(selectedServices).length > 0 && (
        <View style={styles.continueButtonContainer}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={styles.buttonGradient}
              start={{ x: 1, y: 1 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.continueButtonText}>
                Continue ({Object.keys(selectedServices).length} {Object.keys(selectedServices).length === 1 ? 'item' : 'items'})
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      </ScrollView>
      
     
      {renderAddressModal()}
    </SafeAreaView>
  );
};

const ServiceCard = ({ service, isSelected, onSelect }) => {
  const { title, description, imageSource } = service;
  
  return (
    <TouchableOpacity 
      style={[
        styles.serviceCard, 
        isSelected && styles.selectedServiceCard
      ]}
      onPress={onSelect}
      activeOpacity={0.9}
    >
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <Text style={styles.serviceDescription} numberOfLines={2} ellipsizeMode="tail">
          {description}
        </Text>
      </View>
      <View style={styles.imageContainer}>
        <View style={[
          styles.checkbox, 
          isSelected && styles.checkboxSelected,
          styles.checkboxOverlay
        ]}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
        <Image 
          source={imageSource} 
          style={styles.serviceImage} 
          resizeMode='contain' 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '95%',
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
  continueButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // width: '90%',
    paddingHorizontal: 20,
  },
  continueButton: {
      alignSelf: 'stretch',
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 16,
      height: 46,
    },
    buttonGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      // width: '80%',
    },
    continueButtonText: {
      color: colors.primaryLight,
      fontSize: 18,
      fontWeight: '600',
    },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  bellContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionButton: {
    padding: 6,
    borderRadius: 16,
  },
  bellIcon: {
    width: 45,
    height: 34,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  headerAddressRow: {
    marginTop: 4,
  },
  headerAddressText: {
    fontSize: 11,
    color: colors.primaryText,
  },
  headerAddressLoader: {
    flex: 1,
  },
  locationErrorText: {
    marginTop: 6,
    color: '#FF6B6B',
    fontSize: 12,
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
    justifyContent: 'space-between',
    backgroundColor: colors.stocke,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedServiceCard: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#fff9f9',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'space-between',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    flex: 1,
    marginRight: 8,
  },
  serviceDescription: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  imageContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '45%',
    overflow: 'hidden',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.primaryText,
  },
  addressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  addressModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  addressModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
  },
  addressModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
  },
  addressList: {
    paddingHorizontal: 20,
  },
  addressOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  addressIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressOptionContent: {
    flex: 1,
  },
  addressOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 4,
  },
  addressOptionSummary: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  addressOptionActive: {
    backgroundColor: 'rgba(240, 131, 131, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  addressLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  addressLoadingText: {
    color: colors.secondaryText,
  },
  noAddressSaved: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  noAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
  },
  noAddressSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  addAddressButton: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addAddressButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
