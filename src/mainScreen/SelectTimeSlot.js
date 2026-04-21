import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Alert, ActivityIndicator, Modal, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { createOrder, schedulePickup } from '../services/orderService';
import { fetchUserAddresses } from '../services/addressService';
import { getTimeSlots } from '../services/booking';
import { rescheduleOrder } from '../services/orders';
import { FABKLEAN_BASE_URL, API_TOKEN, getSelectedStoreId, getStoredOrgDetails, STORES, saveSelectedStoreId } from '../services/apiConfig';

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  // Match hours:minutes period (e.g., 09:00 AM or 9 AM)
  const match = timeStr.match(/(\d+):?(\d+)?\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] || '0');
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const normalizeTime = (timeStr) => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  // Match hours and period (e.g. 5 PM, 05 PM, 5:30 PM)
  const match = trimmed.match(/(\d+):?(\d+)?\s*(AM|PM)/i);
  if (!match) return trimmed;

  let hours = match[1].padStart(2, '0');
  const minutes = (match[2] || '00').padStart(2, '0');
  const period = match[3].toUpperCase();

  return `${hours}:${minutes} ${period}`;
};

const { width } = Dimensions.get('window');

const formatAddressLine = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;

  const parts = [
    address.house || address.addressLine,
    address.street || address.addressLine2,
    address.area,
    address.city,
    address.state || address.stateName,
    address.country,
    (address.pincode || address.zip) ? `Pin Code: ${address.pincode || address.zip}` : null
  ].filter(Boolean);

  return parts.join(', ');
};

const SelectTimeSlot = ({ navigation, route }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dates, setDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showNoAddressModal, setShowNoAddressModal] = useState(false);
  const [showRescheduleSuccessModal, setShowRescheduleSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('3day');
  const [userAddresses, setUserAddresses] = useState([]);
  const [pickupAddress, setPickupAddress] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressPickerType, setAddressPickerType] = useState('pickup');
  const modalAnimValue = useRef(new Animated.Value(0)).current;

  // Pincode serviceability state
  const [pickupPincodeStatus, setPickupPincodeStatus] = useState(null);   // null | 'checking' | 'serviceable' | 'not_serviceable'
  const [deliveryPincodeStatus, setDeliveryPincodeStatus] = useState(null);
  const [showNotServiceableModal, setShowNotServiceableModal] = useState(false);
  const [notServiceablePincode, setNotServiceablePincode] = useState('');
  const [serviceableStore, setServiceableStore] = useState(null);
  const [isSearchingAllStores, setIsSearchingAllStores] = useState(false);

  const {
    service,
    services: servicesParam,
    isReschedule,
    orderId,
    onRescheduleComplete,
    selectedItems,
    selectedCategories,
    selectedAddress
  } = route.params || {};

  const services = servicesParam || (service ? [service] : []) || [];

  useFocusEffect(
    useCallback(() => {
      const loadUserAddresses = async () => {
        try {
          const profileStr = await AsyncStorage.getItem('userProfile');
          const profile = profileStr ? JSON.parse(profileStr) : null;
          if (!profile?.id) return;

          const { getUserProfile } = require('../services/userService');
          const fullProfile = await getUserProfile(profile.id);

          if (fullProfile?.userInfo) {
            const info = fullProfile.userInfo;
            const isValidAddress = (addr) => {
              if (!addr) return false;
              if (typeof addr === 'string') return addr.trim() !== '';
              return !!(addr.house || addr.addressLine || addr.street || addr.addressLine2 || addr.area);
            };

            let validAddresses = [];
            if (isValidAddress(info.address1)) validAddresses.push(info.address1);
            if (isValidAddress(info.address2)) validAddresses.push(info.address2);
            if (isValidAddress(info.address)) validAddresses.push(info.address);

            // Add the dynamically passed selected address if it exists
            if (selectedAddress && !validAddresses.some(a => a.id === selectedAddress.id)) {
              validAddresses.unshift(selectedAddress);
            }

            if (validAddresses.length > 0) {
              setUserAddresses(validAddresses);
            }

            // Deliberately NOT auto-setting pickupAddress or deliveryAddress here
            // This forces the user to manually verify and select their address for every checkout sequence.
          }
        } catch (error) {
          console.error('Error loading addresses:', error);
        }
      };

      loadUserAddresses();
    }, [selectedAddress])
  );

  useEffect(() => {
    navigation.setOptions({
      title: isReschedule ? 'Reschedule Order' : 'Select Time Slot',
      headerTitleAlign: 'center',
    });
  }, [navigation, isReschedule]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ─── Pincode serviceability validation ─────────────────────────────────────
  /**
   * Extracts pincode string from an address object.
   * Checks common field names: pincode, zip, postalCode, pinCode.
   */
  const extractPincode = (address) => {
    if (!address) return null;
    const raw = address.pincode || address.zip || address.postalCode || address.pinCode || '';
    const cleaned = String(raw).replace(/\D/g, '').trim();
    return cleaned.length >= 5 ? cleaned : null;
  };

  /**
   * Searches through all available stores to find one that services the pincode.
   */
  const findServiceableStore = async (pincode) => {
    try {
      const currentStoreId = await getSelectedStoreId();
      const otherStores = STORES.filter(s => s.id !== currentStoreId);

      console.log(`[Pincode Validation] Searching across ${otherStores.length} other stores for pincode: ${pincode}`);

      const results = await Promise.all(otherStores.map(async (store) => {
        try {
          const fullUrl = `${FABKLEAN_BASE_URL}appConfigProperties/pincodesList?contextId=${store.id}&pinCode=${pincode}`;
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `ApiToken ${API_TOKEN}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.assaignStoreId) {
              return store;
            }
          }
        } catch (e) {
          console.warn(`[Pincode Validation] Check failed for store ${store.id}:`, e.message);
        }
        return null;
      }));

      return results.find(r => r !== null);
    } catch (error) {
      console.error('[Pincode Validation] Error in searchAllStores:', error);
      return null;
    }
  };

  /**
   * Calls the pincodesList API for the given pincode + current storeId.
   * If not serviceable, searches other stores.
   * Returns 'serviceable' | 'not_serviceable'.
   */
  const validatePincode = useCallback(async (pincode) => {
    try {
      const storeId = await getSelectedStoreId();
      const fullUrl = `${FABKLEAN_BASE_URL}appConfigProperties/pincodesList?contextId=${storeId}&pinCode=${pincode}`;

      console.log('[Pincode Validation] Fetching current store:', fullUrl);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `ApiToken ${API_TOKEN}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.assaignStoreId) {
          setServiceableStore(null); // Clear any previously found alternate store
          return 'serviceable';
        }
      }

      // Not serviceable by current store, check others
      setIsSearchingAllStores(true);
      const otherStore = await findServiceableStore(pincode);
      setIsSearchingAllStores(false);

      if (otherStore) {
        console.log('[Pincode Validation] Found alternate store:', otherStore.name);
        setServiceableStore(otherStore);
      } else {
        setServiceableStore(null);
      }

      return 'not_serviceable';
    } catch (error) {
      console.warn('[Pincode Validation] Network/Fetch error:', error.message);
      setIsSearchingAllStores(false);
      return 'not_serviceable';
    }
  }, []);

  /**
   * Validates the address pincode and updates the corresponding status state.
   * Shows the not-serviceable modal if the pincode fails.
   */
  const checkAddressPincode = useCallback(async (address, type) => {
    const pincode = extractPincode(address);
    if (!pincode) {
      // No pincode info available — treat as OK (can't validate)
      if (type === 'pickup') setPickupPincodeStatus(null);
      else setDeliveryPincodeStatus(null);
      return;
    }

    if (type === 'pickup') setPickupPincodeStatus('checking');
    else setDeliveryPincodeStatus('checking');

    const result = await validatePincode(pincode);

    if (type === 'pickup') setPickupPincodeStatus(result);
    else setDeliveryPincodeStatus(result);

    if (result === 'not_serviceable') {
      setNotServiceablePincode(pincode);
      setShowNotServiceableModal(true);
    }
  }, [validatePincode]);
  // ────────────────────────────────────────────────────────────────────────────

  // Helper to calculate taxes and amounts for Fabklean Sales Order
  const calculateFabkleanLineItem = (item) => {
    const totalAmount = (item.price || 0) * (item.quantity || 1);
    // Assuming 18% GST (9% CGST + 9% SGST)
    const taxableValue = totalAmount / 1.18;
    const totalTax = totalAmount - taxableValue;
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;

    return {
      name: item.name,
      quantity: item.quantity || 1,
      rate: (taxableValue / (item.quantity || 1)).toFixed(3),
      total: totalAmount, // This is total gross in some contexts, but let's check example
      taxableValue: taxableValue.toFixed(3),
      cgstPercent: "9",
      cgstAmount: cgst.toFixed(3),
      sgstPercent: "9",
      sgstAmount: sgst.toFixed(3),
      igstPercent: 0,
      igstAmount: "0.000",
      amount: totalAmount.toFixed(3),
      productId: item.id.toString(),
      discount: 0,
      value0: 0,
      value1: 1,
      tags: "SRV,sales",
      loyaltyDiscount: 0
    };
  };


  const showSuccessModalAnimated = useCallback((data) => {



    if (!data) {
      console.error('No data provided to showSuccessModalAnimated');
      setErrorMessage('No booking data received');
      setShowErrorModal(true);
      return;
    }


    const bookingDataWithDefaults = {
      ...data,
      orderId: data.orderId || 'N/A',
      store: data.store || { name: 'N/A', distance: 'N/A' },
      pickupSlot: data.pickupSlot || { start: null, end: null }
    };



    setBookingData(bookingDataWithDefaults);


    modalAnimValue.setValue(0);


    requestAnimationFrame(() => {
      setShowSuccessModal(true);


      Animated.timing(modalAnimValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          console.warn('Modal animation was interrupted');
        }
      });
    });
  }, []);

  const hideSuccessModal = () => {
    Animated.timing(modalAnimValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowSuccessModal(false);
      setBookingData(null);
    });
  };

  const fetchTimeSlots = useCallback(async (date, serviceId) => {
    let isMounted = true;

    if (!serviceId) {

      return;
    }

    try {
      if (isMounted) {
        setLoadingSlots(true);
        setTimeSlots([]);
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Please log in again');
      }

      const dateStr = date.toISOString().split('T')[0];
      console.log(`Fetching time slots for service ${serviceId} on ${dateStr}`);

      let slots;
      try {
        slots = await getTimeSlots(dateStr, serviceId, token);
      } catch (e) {
        console.warn('getTimeSlots API failed:', e.message);
        slots = [];
      }

      if (!isMounted) return;

      const finalSlots = Array.isArray(slots) ? slots : [];

      const mappedSlots = finalSlots.map((slot, index) => {
        const startNorm = normalizeTime(slot.start);
        const endNorm = normalizeTime(slot.end);
        return {
          id: `${dateStr}-${index}-${Date.now()}`,
          time: `${startNorm} - ${endNorm}`,
          start: startNorm,
          end: endNorm,
          available: slot.isAvailable !== false
        };
      });

      setTimeSlots(mappedSlots);
    } catch (error) {
      console.error('Error in fetchTimeSlots:', error);
      if (isMounted) {
        const fallbackSlots = [
          { id: 'default-1', time: '11:00 AM - 09:00 PM', start: '11:00 AM', end: '09:00 PM', available: true }
        ];
        setTimeSlots(fallbackSlots);
      }
    } finally {
      if (isMounted) {
        setLoadingSlots(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);


  const serviceId = useMemo(() => {
    return services?.[0]?.id || 'default_service';
  }, [services]);

  useEffect(() => {
    const next7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      next7Days.push(date);
    }
    setDates(next7Days);
  }, []);

  useEffect(() => {
    console.log('[SelectTimeSlot] Loading slots for serviceId:', serviceId);
    fetchTimeSlots(selectedDate, serviceId);
  }, [selectedDate, serviceId, fetchTimeSlots]);



  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      setErrorMessage('Please select a time slot');
      setShowErrorModal(true);
      return;
    }

    try {
      setBookingInProgress(true);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      if (isReschedule && route.params?.orderId) {
        const { orderId, currentOrder, onRescheduleComplete } = route.params;

        try {
          const rescheduleResult = await rescheduleOrder(
            orderId,
            selectedSlot.start,
            selectedSlot.end,
            token
          );

          console.log('Reschedule API Response:', rescheduleResult);

          if (onRescheduleComplete) {
            const updatedOrder = {
              ...currentOrder,
              pickupSlot: {
                ...currentOrder.pickupSlot,
                start: selectedSlot.start,
                end: selectedSlot.end
              },
              updatedAt: new Date().toISOString()
            };

            onRescheduleComplete(updatedOrder);
          }

          setTimeout(() => {
            navigation.goBack();
          }, 500);

        } catch (error) {
          console.error('Reschedule error:', error);
          throw error;
        }
      } else {
        try {
          const profileStr = await AsyncStorage.getItem('userProfile');
          const profile = profileStr ? JSON.parse(profileStr) : null;
          const userInfoId = profile?.id;

          if (!userInfoId) {
            throw new Error('User profile not found. Please log in again.');
          }

          if (!pickupAddress || !deliveryAddress) {
            setShowNoAddressModal(true);
            return;
          }

          // Block booking if pickup pincode is confirmed not serviceable
          if (pickupPincodeStatus === 'not_serviceable') {
            const pin = extractPincode(pickupAddress);
            setNotServiceablePincode(pin || 'your area');
            setShowNotServiceableModal(true);
            return;
          }
          if (deliveryPincodeStatus === 'not_serviceable') {
            const pin = extractPincode(deliveryAddress);
            setNotServiceablePincode(pin || 'your area');
            setShowNotServiceableModal(true);
            return;
          }

          // --- "Worked Before" Date Logic Implementation ---
          const formatDate = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          const now = new Date();
          const pickupDateObj = new Date(selectedDate || now);

          // orderDate: Today
          const orderDateStr = formatDate(now);

          // supplyDate: Selected Pickup Date
          const supplyDateStr = formatDate(pickupDateObj);

          // expectedDate: Pickup Date + 3 Days
          const deliveryDateObj = new Date(pickupDateObj);
          deliveryDateObj.setDate(deliveryDateObj.getDate() + 3);
          const expectedDateStr = formatDate(deliveryDateObj);

          // dueDate: Matches Delivery Date
          const dueDateStr = formatDate(deliveryDateObj);
          // --------------------------------------------------

          const pickupStr = formatAddressLine(pickupAddress);
          const deliveryStr = formatAddressLine(deliveryAddress);
          const addressStr = `Pickup Address:\n${pickupStr}\n\nDelivery Address:\n${deliveryStr}`;

          let response;
          if (selectedItems && selectedItems.length > 0) {
            // COSTED ORDER FLOW (salesOrders.json)
            const orderItems = selectedItems.map(item => calculateFabkleanLineItem(item));
            const subTotal = selectedItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
            const taxableTotal = orderItems.reduce((sum, item) => sum + parseFloat(item.taxableValue), 0);

            const orderData = {
              packs: 0,
              others: "",
              customerType: "user",
              consumerInfo: {
                id: userInfoId,
                name: profile.name || profile.firstName || 'User',
                phoneNumber: profile.phoneNumber
              },
              shippingAddress: addressStr,
              shippingLatitude: parseFloat(pickupAddress.latitude || pickupAddress.lat || 0),
              shippingLongitude: parseFloat(pickupAddress.longitude || pickupAddress.lon || 0),
              pieceItems: selectedItems.map(item => ({
                productIdIndex: `item_${item.id}_0`,
                productNameWithIndex: `${item.name}__B_APP__0_0_0`
              })),
              grandTotal: subTotal.toFixed(3),
              invoiceTotal: subTotal.toFixed(3),
              balanceAmount: subTotal.toFixed(3),
              adjustment: 0,
              invoiceStatus: "UNPAID",
              freightCharge: "0.000",
              supplyPlace: "PD",
              orderDate: orderDateStr,    // Today
              supplyDate: supplyDateStr,  // Pickup
              expectedDate: expectedDateStr, // Delivery
              dueDate: dueDateStr,        // Delivery (Admin commitment)
              processUser: { id: "6167" },
              orderId: `${Date.now()}`,
              workflowStatus: "PICKUP",
              tags: services.map(s => s.title).join(','),
              taxableValue: taxableTotal.toFixed(3),
              orderItems: orderItems,
              customerNotes: "",
              value10: "B_APP",
              pcsCount: selectedItems.reduce((sum, i) => sum + i.quantity, 0).toString(),
              orderType: "SRVORD",
              creditAmt: true
            };

            console.log('Building Fabklean SalesOrder (Costed):', JSON.stringify(orderData, null, 2));
            response = await createOrder(orderData);

            // Map salesOrder response keys
            response.orderCreate = response.entityOrderId ? "success" : "failed";
            response.orderIdStr = response.entityOrderId;
            response.orderId = response.entityBaseId;

          } else {
            // UNCOSTED PICKUP FLOW (schedulePickup.json)
            const pickupData = {
              consumerInfo: {
                id: userInfoId,
                name: profile.name || profile.firstName || 'User',
                phoneNumber: profile.phoneNumber
              },
              customerType: "user",
              invoiceStatus: "UNPAID",
              workflowStatus: "PICKUP",
              supplyPlace: "PD",
              value10: "B_APP",
              customerNotes: "",
              shippingAddress: addressStr,
              value6: selectedSlot.time || `${selectedSlot.start} - ${selectedSlot.end}`,
              value7: selectedSlot.time || `${selectedSlot.start} - ${selectedSlot.end}`,
              value8: services.map(s => s.title).join(','),
              promoCode: "",
              orderDate: orderDateStr,    // Today
              supplyDate: supplyDateStr,   // Pickup
              expectedDate: expectedDateStr, // Delivery
              dueDate: dueDateStr,        // Delivery
              tags: "fabklean",
              shippingLatitude: parseFloat(pickupAddress.latitude || pickupAddress.lat || 0),
              shippingLongitude: parseFloat(pickupAddress.longitude || pickupAddress.lon || 0)
            };

            console.log('Sending Fabklean schedulePickup request:', JSON.stringify(pickupData, null, 2));
            response = await schedulePickup(pickupData);
          }

          console.log('Fabklean Order Success:', JSON.stringify(response, null, 2));

          if (response.orderCreate === "success" || response.entityOrderId) {
            const org = await getStoredOrgDetails();
            const successData = {
              orderId: response.orderIdStr || response.entityOrderId || response.orderId || 'N/A',
              status: 'PICKUP',
              pickupSlot: {
                start: selectedSlot.start,
                end: selectedSlot.end
              },
              store: {
                name: org?.orgName || 'The LaundryGuyz',
              },
              items: selectedItems || services.map(s => ({ service: { name: s.title } }))
            };

            setTimeout(() => {
              showSuccessModalAnimated(successData);
            }, 100);
          } else {
            throw new Error(response.message || 'Failed to create order');
          }

        } catch (error) {
          console.error('Error in booking process:', error);
          setErrorMessage(error.message || 'Failed to book service. Please try again.');
          setShowErrorModal(true);
          throw error;
        }
      }

    } catch (error) {
      console.error(isReschedule ? 'Reschedule error:' : 'Booking error:', error);
      setErrorMessage(
        error.response?.data?.message ||
        error.message ||
        `Failed to ${isReschedule ? 'reschedule order' : 'book service'}. Please try again.`
      );
      setShowErrorModal(true);
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleSwitchStore = async () => {
    if (!serviceableStore) return;

    try {
      setBookingInProgress(true);
      await saveSelectedStoreId(serviceableStore.id);

      // Clear the cart/selection since it's store-specific
      await AsyncStorage.removeItem('cart');

      Alert.alert(
        'Store Switched',
        `Success! You are now connected to "${serviceableStore.name}". You'll need to re-select your services for this store.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowNotServiceableModal(false);
              // Force back to Home to reload data with new store context
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error switching store:', error);
      Alert.alert('Error', 'Failed to switch store. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  const renderDateItem = (date) => {
    const dayNumber = date.getDate();
    const dayName = days[date.getDay()];
    const isSelected = date.toDateString() === selectedDate.toDateString();

    return (
      <TouchableOpacity
        key={date.toString()}
        style={[styles.dateItem, isSelected && styles.selectedDateItem]}
        onPress={() => {
          setSelectedDate(date);
          setSelectedSlot(null);
        }}
      >
        <Text style={[styles.dayName, isSelected && styles.selectedDayName]}>{dayName}</Text>
        <View style={[styles.dateCircle, isSelected && styles.selectedDateCircle]}>
          <Text style={[styles.dayNumber, isSelected && styles.selectedDayNumber]}>{dayNumber}</Text>
        </View>
        <Text style={[styles.monthText, isSelected && styles.selectedMonthText]}>
          {months[date.getMonth()]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTimeSlots = () => {
    if (loadingSlots) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading time slots...</Text>
        </View>
      );
    }

    if (timeSlots.length === 0) {
      return (
        <View style={styles.noSlotsContainer}>
          <Text style={styles.noSlotsText}>
            No time slots available for the selected date.
          </Text>
        </View>
      );
    }

    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const isPast = (slot) => {
      if (!isToday) return false;
      // Check the END of the slot (e.g. for "3-5 PM", check against 5:00 PM)
      const slotEndTime = slot.end || (slot.time && slot.time.split('-')[1]?.trim());
      const slotEndMinutes = parseTimeToMinutes(slotEndTime);

      // If it's already past the end time, block it
      return slotEndMinutes <= currentMinutes;
    };

    const categorized = {
      MORNING: timeSlots.filter(s => parseTimeToMinutes(s.start || s.time.split('-')[0]) < 720),
      AFTERNOON: timeSlots.filter(s => {
        const mins = parseTimeToMinutes(s.start || s.time.split('-')[0]);
        return mins >= 720 && mins < 1020;
      }),
      EVENING: timeSlots.filter(s => parseTimeToMinutes(s.start || s.time.split('-')[0]) >= 1020)
    };

    const renderCategory = (title, slots) => {
      if (!slots || slots.length === 0) return null;
      return (
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryTitle}>{title}</Text>
          <View style={styles.timeSlotsGrid}>
            {slots.map((slot) => {
              const past = isPast(slot);
              const selected = selectedSlot?.id === slot.id;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.timeSlot,
                    selected && styles.selectedTimeSlot,
                    past && styles.pastTimeSlot
                  ]}
                  onPress={() => !past && setSelectedSlot(slot)}
                  disabled={past}
                >
                  <Text style={[
                    styles.timeSlotText,
                    selected && styles.selectedTimeSlotText,
                    past && styles.pastTimeSlotText
                  ]}>
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    };

    return (
      <View style={styles.slotsWrapper}>
        {renderCategory('MORNING', categorized.MORNING)}
        {renderCategory('AFTERNOON', categorized.AFTERNOON)}
        {renderCategory('EVENING', categorized.EVENING)}
      </View>
    );
  };

  const getServiceIcon = (serviceType) => {
    switch (serviceType?.toLowerCase()) {
      case 'washing':
        return 'water-outline';
      case 'dry clean':
        return 'sunny-outline';
      case 'ironing':
        return 'shirt-outline';
      case 'laundry':
        return 'shirt-outline';
      default:
        return 'shirt-outline';
    }
  };

  const renderServiceDetails = () => {
    if (services.length === 0) return null;

    return (
      <View style={styles.serviceDetailsContainer}>
        <View style={styles.sectionHeader}>
          {/* <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Selected Services</Text>
          </View> */}
          {/* <View style={styles.summaryBadge}>
            <Text style={styles.summaryText}>
              {services.length} {services.length === 1 ? 'Service' : 'Services'}
            </Text>
          </View> */}
        </View>

        <View style={styles.servicesList}>
          {/* {services.map((service, index) => (
            <View key={`${service.id || index}`} style={styles.serviceItem}>
              <View style={styles.serviceInfo1}>
                <Text style={styles.serviceName} numberOfLines={1}>
                  {service.title || 'Laundry Service'}
                </Text>
              </View>
            </View>
          ))} */}
        </View>
      </View>
    );
  };

  const renderBookingSuccessModal = () => {
    console.log('renderBookingSuccessModal, showSuccessModal:', showSuccessModal, 'bookingData:', !!bookingData);

    if (!showSuccessModal || !bookingData) return null;

    const bookingItems = bookingData.items || [];

    const renderServiceItem = (item, index) => {
      if (!item) return null;
      const name = item.name || item.service?.name || `Item #${item.id || index}`;
      return (
        <View key={`service-${item.id || index}`} style={styles.serviceItem}>
          <Text style={styles.serviceName}>{name}</Text>
          <Text style={styles.serviceQuantity}>x{item.quantity || 1}</Text>
        </View>
      );
    };

    const formatTimeRange = (start, end) => {
      if (!start || !end) return 'Time not specified';
      // start/end are strings like "11:00 AM", "12:00 PM" — just show them directly
      return `${start} - ${end}`;
    };

    return (
      <Modal
        transparent
        visible={showSuccessModal}
        animationType="none"
        onRequestClose={hideSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    scale: modalAnimValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
                opacity: modalAnimValue,
              },
            ]}
          >
            <View style={styles.successHeader}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>Booking Successful!</Text>
              <Text style={styles.successSubtitle}>Your service has been booked successfully</Text>
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>#{bookingData.orderId}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Services</Text>
                <View style={styles.servicesList}>
                  {bookingItems.length > 0 ? (
                    bookingItems.map((item, index) => renderServiceItem(item, index))
                  ) : (
                    <Text style={styles.noServicesText}>No services selected</Text>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Store:</Text>
                <Text style={styles.detailValue}>{bookingData.store?.name || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pickup Time:</Text>
                <Text style={styles.detailValue}>
                  {formatTimeRange(bookingData.pickupSlot?.start, bookingData.pickupSlot?.end)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                hideSuccessModal();
                navigation.replace('Myorder', { bookingCompleted: true });
              }}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      {renderBookingSuccessModal()}
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >




          {renderServiceDetails()}

          <View style={styles.addressSelectorsContainer}>
            {/* ── PICKUP ── */}
            <View style={styles.addressBox}>
              <View style={styles.addressBoxHeader}>
                <Text style={styles.addressBoxLabel}>PICKUP</Text>
                {pickupPincodeStatus === 'checking' && (
                  <View style={styles.pincodeStatusBadge}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.pincodeStatusText}>Checking...</Text>
                  </View>
                )}
                {pickupPincodeStatus === 'serviceable' && (
                  <View style={[styles.pincodeStatusBadge, styles.pincodeServiceable]}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={[styles.pincodeStatusText, { color: '#4CAF50' }]}>Serviceable</Text>
                  </View>
                )}
                {pickupPincodeStatus === 'not_serviceable' && (
                  <View style={[styles.pincodeStatusBadge, styles.pincodeNotServiceable]}>
                    <Ionicons name="close-circle" size={14} color="#FF4444" />
                    <Text style={[styles.pincodeStatusText, { color: '#FF4444' }]}>Not Serviceable</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.addressSelector,
                  pickupPincodeStatus === 'not_serviceable' && styles.addressSelectorError
                ]}
                onPress={() => { setAddressPickerType('pickup'); setShowAddressModal(true); }}
              >
                <Ionicons
                  name="location"
                  size={24}
                  color={pickupPincodeStatus === 'not_serviceable' ? '#FF4444' : colors.primary}
                  style={styles.addressIcon}
                />
                <View style={styles.addressTextContainer}>
                  <Text style={styles.addressPlaceholder}>PICKUP ADDRESS</Text>
                  <Text style={styles.addressValue} numberOfLines={2}>
                    {pickupAddress ? formatAddressLine(pickupAddress) : 'Select a pickup address'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>

            {/* ── DELIVERY ── */}
            <View style={styles.addressBox}>
              <View style={styles.addressBoxHeader}>
                <Text style={styles.addressBoxLabel}>DELIVERY</Text>
                {deliveryPincodeStatus === 'checking' && (
                  <View style={styles.pincodeStatusBadge}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.pincodeStatusText}>Checking...</Text>
                  </View>
                )}
                {deliveryPincodeStatus === 'serviceable' && (
                  <View style={[styles.pincodeStatusBadge, styles.pincodeServiceable]}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={[styles.pincodeStatusText, { color: '#4CAF50' }]}>Serviceable</Text>
                  </View>
                )}
                {deliveryPincodeStatus === 'not_serviceable' && (
                  <View style={[styles.pincodeStatusBadge, styles.pincodeNotServiceable]}>
                    <Ionicons name="close-circle" size={14} color="#FF4444" />
                    <Text style={[styles.pincodeStatusText, { color: '#FF4444' }]}>Not Serviceable</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.addressSelector,
                  deliveryPincodeStatus === 'not_serviceable' && styles.addressSelectorError
                ]}
                onPress={() => { setAddressPickerType('delivery'); setShowAddressModal(true); }}
              >
                <Ionicons
                  name="location"
                  size={24}
                  color={deliveryPincodeStatus === 'not_serviceable' ? '#FF4444' : colors.primary}
                  style={styles.addressIcon}
                />
                <View style={styles.addressTextContainer}>
                  <Text style={styles.addressPlaceholder}>DELIVERY ADDRESS</Text>
                  <Text style={styles.addressValue} numberOfLines={2}>
                    {deliveryAddress ? formatAddressLine(deliveryAddress) : 'Select a delivery address'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={styles.serviceDescription}>Select a preferred date and time slot</Text>
          </View>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
            contentContainerStyle={styles.dateScrollContent}
          >
            {dates.map((date) => renderDateItem(date))}
          </ScrollView>



          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          {renderTimeSlots()}
          <View style={[styles.expressContainer, { marginTop: 15 }]}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setSelectedServiceType('3day')}
            >
              <View style={[styles.checkbox, selectedServiceType === '3day' && styles.checked]}>
                {selectedServiceType === '3day' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.expressText}>Standard Service (3 Days)</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.confirmButtonContainer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedSlot || bookingInProgress) && styles.disabledButton
              ]}
              disabled={!selectedSlot || bookingInProgress}
              onPress={handleConfirmBooking}
            >
              {bookingInProgress ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {isReschedule
                    ? `Reschedule on ${selectedDate && days[selectedDate.getDay()] + ', ' + selectedDate.getDate() + ' ' + months[selectedDate.getMonth()]}`
                    : `Book service on ${selectedDate && days[selectedDate.getDay()] + ', ' + selectedDate.getDate() + ' ' + months[selectedDate.getMonth()]}`
                  }
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView >

      {/* Error Modal */}
      < Modal
        transparent
        visible={showErrorModal}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModalContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
            <Text style={styles.errorModalTitle}>Error</Text>
            <Text style={styles.errorModalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorModalButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal >

      <Modal
        transparent
        visible={showNoAddressModal}
        animationType="fade"
        onRequestClose={() => setShowNoAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModalContainer}>
            <Ionicons name="location-outline" size={48} color={colors.primary} />
            <Text style={styles.errorModalTitle}>No Address</Text>
            <Text style={styles.errorModalMessage}>Please add an address first</Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.errorModalButton, styles.secondaryButton]}
                onPress={() => setShowNoAddressModal(false)}
              >
                <Text style={[styles.errorModalButtonText, styles.secondaryButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.errorModalButton}
                onPress={() => {
                  setShowNoAddressModal(false);
                  navigation.navigate('MainTabs', {
                    screen: 'Home',
                    params: { screen: 'Address', params: { fromDeepLink: true } },
                  });
                }}
              >
                <Text style={styles.errorModalButtonText}>Add Address</Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showRescheduleSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowRescheduleSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.successModalTitle}>Order Rescheduled</Text>
            <Text style={styles.successModalMessage}>Order #{orderId} has been rescheduled successfully.</Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => {
                setShowRescheduleSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Not Serviceable Modal */}
      <Modal
        transparent
        visible={showNotServiceableModal}
        animationType="fade"
        onRequestClose={() => setShowNotServiceableModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notServiceableModalContainer}>
            <View style={styles.notServiceableIconContainer}>
              <Ionicons name="location-outline" size={48} color="#FF4444" />
            </View>
            <Text style={styles.notServiceableTitle}>
              {serviceableStore ? 'Store Available!' : 'Area Not Serviceable'}
            </Text>
            <Text style={styles.notServiceableSubtitle}>
              {serviceableStore ? (
                <>
                  Pincode <Text style={{ fontWeight: '700', color: colors.primary }}>{notServiceablePincode}</Text> is serviced by our <Text style={{ fontWeight: '700', color: colors.primary }}>{serviceableStore.name}</Text> branch.
                </>
              ) : (
                <>
                  Sorry! Pincode{' '}
                  <Text style={{ fontWeight: '700', color: colors.primary }}>{notServiceablePincode}</Text>
                  {' '}is currently not in our service area for the selected store.
                </>
              )}
            </Text>
            <Text style={styles.notServiceableHint}>
              {serviceableStore
                ? 'Would you like to switch to this store to place your order?'
                : 'Please check your address or select a different store.'
              }
            </Text>

            {serviceableStore ? (
              <View style={{ width: '100%', gap: 12 }}>
                <TouchableOpacity
                  style={styles.notServiceableButton}
                  onPress={handleSwitchStore}
                  disabled={bookingInProgress}
                >
                  {bookingInProgress ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.notServiceableButtonText}>Switch to {serviceableStore.name}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.notServiceableButton, { backgroundColor: '#F0F0F0' }]}
                  onPress={() => setShowNotServiceableModal(false)}
                >
                  <Text style={[styles.notServiceableButtonText, { color: '#666' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.notServiceableButton}
                onPress={() => setShowNotServiceableModal(false)}
              >
                <Text style={styles.notServiceableButtonText}>Choose Different Address</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlayAddress} onPress={() => setShowAddressModal(false)} activeOpacity={1}>
          <View style={styles.addressModalContainer}>
            <Text style={styles.addressModalTitle}>
              Select {addressPickerType === 'pickup' ? 'Pickup' : 'Delivery'} Address
            </Text>
            <ScrollView style={styles.addressModalScroll}>
              {userAddresses.length > 0 ? (
                userAddresses.map((addr, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.addressOption}
                    onPress={() => {
                      if (addressPickerType === 'pickup') {
                        setPickupAddress(addr);
                        checkAddressPincode(addr, 'pickup');
                      } else {
                        setDeliveryAddress(addr);
                        checkAddressPincode(addr, 'delivery');
                      }
                      setShowAddressModal(false);
                    }}
                  >
                    <Ionicons name="location-outline" size={24} color={colors.primary} />
                    <Text style={styles.addressOptionText} numberOfLines={3}>
                      {formatAddressLine(addr)}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noAddressFoundText}>No saved addresses found.</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.addNewAddressButton}
              onPress={() => {
                setShowAddressModal(false);
                navigation.navigate('MainTabs', {
                  screen: 'Home',
                  params: { screen: 'Address', params: { fromDeepLink: true } },
                });
              }}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.addNewAddressText}>Add New Address</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addressModalCloseButton} onPress={() => setShowAddressModal(false)}>
              <Text style={styles.addressModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 5,
  },
  expressContainer: {
    marginBottom: 0,
    paddingHorizontal: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonContainer: {
    paddingBottom: 80, // Large padding to clear the bottom tab bar
    marginTop: 10,
  },
  checked: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  expressText: {
    fontSize: 16,
    color: colors.primaryText,
    fontWeight: '500',
  },
  expressNote: {
    fontSize: 12,
    color: colors.gray,
    marginLeft: 32,
    fontStyle: 'italic',
  },
  container: {
    height: "100%",
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingBottom: 20
  },
  addressSelectorsContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  addressBox: {
    marginBottom: 10,
  },
  addressBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginLeft: 4,
  },
  addressBoxLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
  },
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  addressSelectorError: {
    borderColor: '#FF4444',
    backgroundColor: '#FFF5F5',
  },
  addressIcon: {
    marginRight: 10,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressPlaceholder: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  addressValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  // Pincode status badge styles
  pincodeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    gap: 4,
  },
  pincodeServiceable: {
    backgroundColor: '#E8F5E9',
  },
  pincodeNotServiceable: {
    backgroundColor: '#FFEBEE',
  },
  pincodeStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  // Not Serviceable Modal styles
  notServiceableModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  notServiceableIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  notServiceableTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  notServiceableSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  notServiceableHint: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  notServiceableButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  notServiceableButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  calendarHeader: {
    backgroundColor: colors.primaryLight,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: 15,
  },
  datesContainer: {
    paddingHorizontal: 10,
  },
  datesScrollView: {
    paddingHorizontal: 5,
  },
  dateItem: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 12,
  },
  selectedDateItem: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  selectedDateCircle: {
    backgroundColor: colors.primary,
  },
  groupSection: {
    marginTop: 0,
    marginBottom: 0,
  },
  groupLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayName: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  selectedDayName: {
    color: colors.primary,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
  },
  selectedDayNumber: {
    color: '#fff',
    fontWeight: '600',
  },
  monthText: {
    fontSize: 10,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  selectedMonthText: {
    color: colors.primary,
    fontWeight: '700',
  },
  slotsWrapper: {
    paddingHorizontal: 5,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 2,
  },
  timeSlotsContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: 0,
    marginBottom: 4,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noSlotsContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#FFF9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
    marginTop: 10,
  },
  noSlotsText: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  timeSlot: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  selectedTimeSlot: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  unavailableSlot: {
    opacity: 0.6,
  },
  timeSlotText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: '600',
  },
  pastTimeSlot: {
    backgroundColor: '#f8f8f8',
    borderColor: '#eeeeee',
    opacity: 0.6,
  },
  pastTimeSlotText: {
    color: '#aaaaaa',
  },
  confirmButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
    shadowColor: '#aaa',
    shadowOpacity: 0.2,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.primaryText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 20,
    padding: 24,
    maxWidth: width * 0.9,
    width: width * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },
  orderDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    serviceDetailsContainer: {
      marginBottom: 20,
      width: '100%',
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIcon: {
      marginRight: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
    },
    summaryBadge: {
      backgroundColor: 'rgba(240, 131, 131, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    summaryText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    servicesList: {
      width: '100%',
    },
    serviceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    serviceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    serviceQuantity: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
      backgroundColor: 'rgba(240, 131, 131, 0.2)',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      minWidth: 30,
      textAlign: 'center',
    },
    noServicesText: {
      color: colors.secondaryText,
      fontStyle: 'italic',
      textAlign: 'center',
      marginVertical: 10,
    },
    detailSection: {
      width: '100%',
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 10,
      paddingBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.primaryText,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rescheduleButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  rescheduleButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Custom Modal Styles
  errorModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    marginTop: 16,
    marginBottom: 8,
  },
  errorModalMessage: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorModalButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  errorModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
  },
  secondaryButtonText: {
    color: colors.secondaryText,
  },
  successModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    marginTop: 16,
    marginBottom: 8,
  },
  successModalMessage: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successModalButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  serviceInfo1: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'flex-start'

  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
  },
  quantityBadge: {
    backgroundColor: 'rgba(240, 131, 131, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: 50,
    textAlign: 'center',
    marginLeft: 10
  },
  quantityText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlayAddress: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addressModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  addressModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 15,
    textAlign: 'center',
  },
  addressModalScroll: {
    maxHeight: 300,
  },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addressOptionText: {
    fontSize: 14,
    color: colors.primaryText,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 5,
  },
  addNewAddressText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  noAddressFoundText: {
    textAlign: 'center',
    padding: 20,
    color: colors.secondaryText,
  },
  addressModalCloseButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  addressModalCloseText: {
    color: colors.primaryText,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default SelectTimeSlot;