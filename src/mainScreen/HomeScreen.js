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
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// removed gradient in favor of solid primary button per design
import colors from '../component/color';
import images from '../component/image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '../services/userAuth';
import { fetchAddresses } from '../services/address';
import { fetchUserServices } from '../services/services';
import { useUser } from '../context/UserContext';
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

// Grid card version to match the provided design
const ServiceGridCard = ({ service, isSelected, onSelect }) => {
  const { title, description, imageSource } = service;
  return (
    <TouchableOpacity
      style={[styles.gridCard, isSelected && styles.gridCardSelected]}
      onPress={onSelect}
      activeOpacity={0.9}
    >
      {isSelected && (
        <TouchableOpacity style={styles.selectBadge} onPress={onSelect} activeOpacity={0.8}>
          <View style={styles.gridTickCircle}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
      <View style={styles.gridCardContent}>
        <View style={styles.gridIconWrap}>
          <Image source={imageSource} style={styles.gridIcon} resizeMode="contain" />
        </View>
        <Text style={styles.gridTitle} numberOfLines={2} ellipsizeMode="tail">{title}</Text>
      </View>
      {/* <Text style={styles.gridSubtitle} numberOfLines={1}>{description}</Text> */}
    </TouchableOpacity>
  );
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
const HomeScreen = ({ navigation, route }) => {
  const { refreshUser } = useUser();

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
  const [refreshing, setRefreshing] = useState(false);
  const [swiperRefreshKey, setSwiperRefreshKey] = useState(0);

  // Calculate item width to show 3 items at a time
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 60) / 3; // 60 = 20 padding on each side + 20 gap between items

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


  useEffect(() => {
    fetchUserProfile();
    fetchServices();
  }, [fetchUserProfile, fetchServices]);

  
  useFocusEffect(
    useCallback(() => {
      if (route.params?.refresh) {
        refreshUser();
        // Clear the refresh param to avoid re-triggering
        navigation.setParams({ refresh: false });
      }

      // Reset selected services if a booking was just completed

      if (route.params?.bookingCompleted) {
        setSelectedServices({});
        // Clean up the param to avoid resetting on every focus
        navigation.setParams({ bookingCompleted: undefined });
      }

      // Initial data fetch
      fetchUserProfile();
      fetchServices();
      fetchSavedAddresses();

      // Handle other params like hidePromo
      if (route.params?.hidePromo) {
        setShowPromoCard(false);
        navigation.setParams({ hidePromo: undefined });
      }
    }, [route.params?.bookingCompleted, route.params?.hidePromo])
  );

  const selectedAddressPrimary = selectedAddress
    ? [selectedAddress?.house, selectedAddress?.street].filter(Boolean).join(', ')
    : 'Detecting location...';
  const selectedAddressSecondary = selectedAddress
    ? [selectedAddress?.city, selectedAddress?.state, selectedAddress?.pincode || selectedAddress?.postal_code]
        .filter(Boolean)
        .join(' ')
    : '';
  const headerAddressLine = [selectedAddressPrimary, selectedAddressSecondary].filter(Boolean).join(' ');
  const selectedAddressLabel = selectedAddress?.label || 'Current Location';
  
  const handleSelectAddress = useCallback((address) => {
    setSelectedAddress(address);
    try {
      AsyncStorage.setItem('@selectedAddress', JSON.stringify(address));
    } catch (e) {
      console.warn('Failed to persist selected address');
    }
    setLocationModalVisible(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSwiperRefreshKey(prev => prev + 1);
    Promise.all([
      fetchUserProfile(),
      fetchServices(),
      fetchSavedAddresses(),
    ]).finally(() => setRefreshing(false));
  }, []); // Dependencies are stable

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
                    {'Detecting location...'}
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.listHeaderWrap}>
          {showPromoCard && (
            <View style={styles.fullBleed}>
              <AutoSwiper refreshKey={swiperRefreshKey} />
            </View>
          )}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Services</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleSeeAllPress}>
              <Text style={styles.sectionAction}>{showPromoCard ? 'Hide Promo' : 'Show Promo'}</Text>
            </TouchableOpacity>
          </View>
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
          <FlatList
            data={services}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={[styles.horizontalCardWrapper, { width: itemWidth }]}>
                <ServiceGridCard
                  service={item}
                  isSelected={!!selectedServices[item.id]}
                  onSelect={() => handleServiceSelect(item)}
                />
              </View>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContainer}
            snapToInterval={itemWidth + 10}
            decelerationRate="fast"
            getItemLayout={(data, index) => ({
              length: itemWidth + 10,
              offset: (itemWidth + 10) * index,
              index,
            })}
          />
        )}

        <View style={styles.continueButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.continueButton,
              Object.keys(selectedServices).length === 0 && styles.disabledButton
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={Object.keys(selectedServices).length === 0}
          >
            <Text style={styles.continueButtonText}>
              Schedule Pickup
            </Text>
          </TouchableOpacity>
        </View>
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
  gridContainer: {
    paddingBottom: 8,
  },
  gridContainerFlat: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  listHeaderWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },
  fullBleed: {
    marginHorizontal: -20,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flex: 1,
    width: '100%',
  },
  horizontalCardWrapper: {
    marginRight: 10,
  },
  horizontalListContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  gridCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  selectBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  gridTickHollow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  gridIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIcon: {
    width: 55,
    height: 55,
    alignSelf:"center"
  },
  gridTick: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  gridTickCircle: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
  },
  gridSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
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
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    disabledButton: {
      backgroundColor: '#cccccc',
      opacity: 0.7,
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
