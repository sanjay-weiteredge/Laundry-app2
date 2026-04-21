import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import colors from '../component/color';
import images from '../component/image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/userService';
import { fetchUserAddresses } from '../services/addressService';
import { listAllCatalogs } from '../services/catalogService';
import { useUser } from '../context/UserContext';
import AutoSwiper from '../component/swiper';
import { API } from '../services/apiRequest';

const STORE_LOCATIONS = [
  {
    id: 1,
    name: "Yapral",
    code: "500087",
    address: "The Laundry Guyz, Yapral Main Rd, Opposite Raam Honda Showroom, Sai Krupa Colony, Yapral, Secunderabad, Telangana 500087",
    mapUrl: "https://maps.app.goo.gl/oCNvYAjyUwiMrbZk7?g_st=aw", // Add your Google Maps link here
    phone: "+91 4079697735",
    email: "support@thelaundryguyz.com",
  },
  {
    id: 2,
    name: "Saket",
    code: "500103",
    address: "The Laundry Guyz, Near Saket  Towers , Saket Rd, Kapra, Secunderabad, Telangana 500103",
    mapUrl: "https://maps.app.goo.gl/Zz5Bhv6bDtEXQ9qa8?g_st=aw",
    phone: "+91 4079697735",
    email: "support@thelaundryguyz.com",
  },
  {
    id: 3,
    name: "AS Rao Nagar",
    code: "500062",
    address: "Pista house Lane , Maruti Nagar Rd, A. S. Rao Nagar, Secunderabad, 500062",
    mapUrl: "https://maps.app.goo.gl/WngwKgJhRCZnzyED6?g_st=aw",
    phone: "+91 4079697735",
    email: "support@thelaundryguyz.com",
  },
  {
    id: 4,
    name: "Maredpally/Mahendra Hill's",
    code: "500026",
    address: "The Laundry Guyz , Near St. Marks High School, East Marredpally, Secunderabad, Telangana – 500026",
    mapUrl: "https://maps.app.goo.gl/oggrpV4mskFzBRuZ6?g_st=aw",
    phone: "+91 4079697735",
    email: "support@thelaundryguyz.com",
  },


  {
    id: 5,
    name: "Padma Rao Nagar",
    code: "500020",
    address: "The Laundry Guyz, MIGH Colony, Walker Town, Padmarao Nagar Mai Road, Secunderabad, Telangana 500003",
    mapUrl: "https://maps.app.goo.gl/s7iEW3ZSchrBgeNP8?g_st=aw", // Add your Google Maps link here
    phone: "+91 4079697735",
    email: "support@thelaundryguyz.com",
  },
  {
    id: 6,
    name: "Tellapur",
    code: "500046",
    address: " The Laundry Guyz, Tellapur Rd, Tellapur, Next to Honer Vivantis Hyderabad, Nallagandla, Telangana 500046",
    mapUrl: "https://maps.app.goo.gl/x6zxQFXFiLNvK5rCA?g_st=aw",
    phone: "+91 4079697735",
    email: "support@thelaundryguyz.com",
  }

];

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
          {/* <View style={styles.gridTickCircle}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View> */}
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



  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 60) / 3; // 60 = 20 padding on each side + 20 gap between items
  const toggleServiceSelection = (service) => {
    setSelectedServices(prev => {
      if (prev[service.id]) {
        const { [service.id]: _, ...rest } = prev;
        return rest;
      } else {
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
      const allCategories = [];
      const categoryMap = new Map();

      selected.forEach(service => {
        if (service.categories && Array.isArray(service.categories)) {
          service.categories.forEach(cat => {
            if (!categoryMap.has(cat.id)) {
              categoryMap.set(cat.id, {
                ...cat,
                parentService: service.title,
                catalogId: service.id
              });
              allCategories.push(categoryMap.get(cat.id));
            }
          });
        }
      });

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

      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;
      const localData = JSON.parse(userDataStr);

      const response = await getUserProfile(localData.id);

      if (response && response.userInfo) {
        setUserData(response.userInfo);
      } else {
        console.error('Profile fetch failed: Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Profile Error', error?.message || 'Unable to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (flatListRef.current) {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= STORE_LOCATIONS.length) {
          nextIndex = 0;
        }
        flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
        setCurrentIndex(nextIndex);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const onMomentumScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 40));
    setCurrentIndex(index);
  };

  const openDirections = (address, mapUrl) => {
    if (mapUrl && mapUrl.trim() !== '') {
      Linking.openURL(mapUrl);
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      Linking.openURL(url);
    }
  };





  const fetchServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      console.log('Fetching catalogs from Fabklean...');

      const catalogItems = await listAllCatalogs();

      if (catalogItems && catalogItems.length > 0) {
        const mappedServices = catalogItems.map(catalog => {
          const titleLower = (catalog.title || '').toLowerCase();
          let imageSource = images.service1; // Default

          if (titleLower.includes('dry')) {
            imageSource = images.service3;
          } else if (titleLower.includes('iron')) {
            imageSource = images.service2;
          } else if (titleLower.includes('fold') || titleLower.includes('wash')) {
            imageSource = images.service1;
          }

          return {
            id: catalog.id,
            title: catalog.title || 'Service',
            description: catalog.shortDescription || catalog.description || '',
            categories: catalog.catalogCategories || [],
            imageSource: catalog.imageExtension ? { uri: catalog.imageExtension } : (catalog.imageUri ? { uri: catalog.imageUri } : imageSource)
          };
        });
        setServices(mappedServices);
      } else {
        console.log('No services found in catalog items');
        setServices([]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
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


      if (route.params?.bookingCompleted) {
        setSelectedServices({});
        navigation.setParams({ bookingCompleted: undefined });
      }

      fetchUserProfile();
      fetchServices();
      fetchSavedAddresses();

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

  const handleSelectAddress = useCallback(async (address) => {
    setSelectedAddress(address);
    try {
      await AsyncStorage.setItem('@selectedAddress', JSON.stringify(address));

      const pincode = address?.pincode || address?.postal_code || address?.zip || '';
      if (pincode) {
        const { getPincodeStatus } = require('../services/configService');
        const { saveSelectedStoreId } = require('../services/apiConfig');
        const data = await getPincodeStatus(pincode);
        if (data && data.assaignStoreId) {
          await saveSelectedStoreId(data.assaignStoreId);
          console.log(`[HomeScreen] Global store switched to: ${data.assaignStoreId}`);
        }
      }
    } catch (e) {
      console.warn('Failed to persist selected address or update store context:', e);
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
  }, []);

  const fetchSavedAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;
      const localData = JSON.parse(userDataStr);

      const response = await fetchUserAddresses(localData.id);

      const addresses = response?.addresses || (Array.isArray(response) ? response : []);

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
    } finally {
      setLoadingAddresses(false);
    }
  }, [resolvePreferredAddress]);


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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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

        <View style={styles.nearbyStoreSection}>
          <Text style={styles.sectionTitle}>Drop by The Laundry Guyz stores!</Text>
          <FlatList
            ref={flatListRef}
            data={STORE_LOCATIONS}
            style={{ marginTop: 15 }}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(data, index) => ({
              length: screenWidth - 40,
              offset: (screenWidth - 40) * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={{ width: screenWidth - 40 }}>
                <View style={styles.storeCard}>
                  <View style={styles.storeHeader}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: '#E6F7EC' },
                      ]}
                    >
                      <Text
                        style={{
                          color: '#1E9E5A',
                          fontWeight: '600',
                        }}
                      >
                        Open
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.storeAddress}>{item.address}</Text>

                  <TouchableOpacity
                    style={styles.directionBtn}
                    onPress={() => openDirections(item.address, item.mapUrl)}
                  >
                    <Text style={styles.directionText}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
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
    padding: 10,
    height: 140,
    width: '100%',
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
    paddingVertical: 5,
  },
  gridCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    width: 70,
    height: 70,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIcon: {
    width: 70,
    height: 70,
    alignSelf: "center"
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
    height: 40,
    textAlignVertical: 'center',
    width: '100%',
  },
  gridSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  continueButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
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
    backgroundColor: colors.primary
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
  nearbyStoreSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    color: colors.primaryText,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  storeAddress: {
    marginTop: 6,
    color: '#555',
    fontSize: 13,
  },
  storePhone: {
    marginTop: 6,
    color: colors.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  storeDistance: {
    marginTop: 6,
    color: '#777',
    fontSize: 13,
  },
  directionBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionText: {
    color: '#fff',
    fontWeight: '600',
  },
});
export default HomeScreen;
