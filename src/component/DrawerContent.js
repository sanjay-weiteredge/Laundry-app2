import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from './color';
import { useUser } from '../context/UserContext';
import { Linking } from 'react-native';
import { fetchAddresses } from '../services/address';
import * as Location from 'expo-location';


const DrawerContent = ({ navigation }) => {
  const { user, loading: userLoading, refreshUser } = useUser();
    const [addressText, setAddressText] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');


  useFocusEffect(
    useCallback(() => {
      refreshUser();
      detectCurrentLocation();
    }, [refreshUser])
  );


  const pickAddressText = (addr) => {
    if (!addr) return '';
    const primary = [addr.house, addr.street].filter(Boolean).join(', ');
    const secondary = [addr.city, addr.state, addr.pincode || addr.postal_code]
      .filter(Boolean)
      .join(' ');
    const fallback = addr.address_line || addr.addressLine || addr.address1 || addr.addressLine1 || addr.street;
    const text = primary || secondary || fallback || '';
    return text;
  };

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
        const { address, meta } = JSON.parse(cachedData);
        setAddressText([address, meta].filter(Boolean).join(' '));
        return JSON.parse(cachedData).coords;
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
        
        setAddressText([description, meta].filter(Boolean).join(' ') || 'Current location detected');
        
        await saveLocationToCache(coords, description, meta);
      } else {
        setAddressText('Current location detected');
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

      const cachedCoords = await loadCachedLocation();
      if (cachedCoords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          return;
        }
        
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
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setAddressText('Location permission needed');
        return;
      }

      const lastLocation = await Location.getLastKnownPositionAsync();
      if (lastLocation) {
        await updateAddressFromCoords(lastLocation.coords);
      }

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
      setAddressText('Could not fetch location');
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  const fetchUserAddress = async () => {
    try {
      // Prefer the address the user selected on HomeScreen if available
      const stored = await AsyncStorage.getItem('@selectedAddress');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const text = pickAddressText(parsed);
          if (text) {
            setAddressText(text);
            return;
          }
        } catch {}
      }

      // Next, try the current detected location cached by HomeScreen
      const cachedLoc = await AsyncStorage.getItem('@cachedLocation');
      if (cachedLoc) {
        try {
          const parsed = JSON.parse(cachedLoc);
          const text = [parsed?.address, parsed?.meta].filter(Boolean).join(' ');
          if (text) {
            setAddressText(text);
            return;
          }
        } catch {}
      }

      // Fall back to default/first saved address from backend
      const list = await fetchAddresses();
      if (!Array.isArray(list) || list.length === 0) {
        setAddressText('');
        return;
      }
      const def = list.find(a => a.isDefault || a.is_default || a.default) || list[0];
      setAddressText(pickAddressText(def));
    } catch (e) {
      // silently ignore and keep empty subtitle
      setAddressText('');
    }
  };


  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    // {
    //   icon: 'person-outline',
    //   label: 'Profile',
    //   onPress: () => {
    //     navigation.closeDrawer();
    //     // Navigate to MainTabs (Tab Navigator) then to Profile tab
    //     navigation.navigate('MainTabs', { screen: 'Profile', params: { screen: 'ProfileHome' } });
    //   },
    // },
    {
      icon: 'home-outline',
      label: 'Home',
      onPress: () => {
        navigation.closeDrawer();
        navigation.navigate('MainTabs', { screen: 'Home' });
      },
    },
    {
      icon: 'person-outline',
      label: 'Profile',
      onPress: () => {
        navigation.closeDrawer();
        navigation.navigate('MainTabs', {
          screen: 'Home',
          params: { screen: 'EditProfile' },
        });
      },
    },
    {
      icon: 'bag-outline',
      label: 'My Orders',
      onPress: () => {
        navigation.closeDrawer();
        navigation.navigate('MainTabs', { screen: 'Home', params: { screen: 'Myorder' } });
      },
    },
    {
   icon: 'information-circle-outline',
  label: 'About Us',
  onPress: () => {
    navigation.closeDrawer();
    Linking.openURL('https://www.techruitz.com/');
  },
    },
    {
      icon: 'location-outline',
      label: 'Saved Addresses',
      onPress: () => {
        navigation.closeDrawer();
        navigation.navigate('MainTabs', { screen: 'Home', params: { screen: 'Address' } });
      },
    },
    {
      icon: 'document-text-outline',
      label: 'Privacy Policy',
      onPress: () => {
        navigation.closeDrawer();
        navigation.navigate('MainTabs', { screen: 'Home', params: { screen: 'PrivacyPolicy' } });
      },
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => {
        navigation.closeDrawer();
        navigation.navigate('MainTabs', { screen: 'Home', params: { screen: 'HelpSupport' } });
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          {userLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.headerCard}>
              <View style={styles.avatarContainer}>
                {user?.image ? (
                  <Image key={user.image} source={{ uri: user.image }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={20} color={colors.primary} />
                  </View>
                )}
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>{user?.name || 'User'}</Text>
                <Text style={styles.headerSubtitle} numberOfLines={0}>
                  {detectingLocation ? 'Detecting location...' : (locationError || addressText || 'Address')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon} size={24} color={colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.primary} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>Version: 15.0.8 (433)</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.95,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
  },
  menuSection: {
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    backgroundColor: '#fff',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    marginLeft: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    marginHorizontal: 0,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: '#F1E4E4',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 12,
  },
  versionInfo: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: colors.secondaryText,
  },
});

export default DrawerContent;

