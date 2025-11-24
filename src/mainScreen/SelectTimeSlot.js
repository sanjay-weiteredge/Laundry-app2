import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, Alert, ActivityIndicator, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTimeSlots, bookService } from '../services/booking';
import { fetchAddresses } from '../services/address';
import { rescheduleOrder } from '../services/orders';

const { width } = Dimensions.get('window');

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
  const modalAnimValue = useRef(new Animated.Value(0)).current;
  
  const { service, isReschedule, orderId, onRescheduleComplete } = route.params || {};
  
  
  useEffect(() => {
    navigation.setOptions({
      title: isReschedule ? 'Reschedule Order' : 'Select Time Slot',
      headerTitleAlign: 'center',
    });
  }, [navigation, isReschedule]);
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  
  const showSuccessModalAnimated = (data) => {
    console.log('showSuccessModalAnimated called with data:', data);
    setBookingData(data);
    setShowSuccessModal(true);
    console.log('showSuccessModal set to true');
    Animated.timing(modalAnimValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

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

  const fetchTimeSlots = useCallback(async () => {
    if (!service?.id) {
      console.log('No service selected');
      return;
    }
    
    try {
      setLoadingSlots(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Please log in again');
      }
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      const slots = await getTimeSlots(dateStr, service.id, token);
      
 
      const mappedSlots = slots.map((slot, index) => ({
        id: index + 1,
        time: slot.display,
        start: slot.start,
        end: slot.end,
        available: slot.isAvailable
      }));
      
      setTimeSlots(mappedSlots);
      console.log('Mapped time slots:', mappedSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setErrorMessage('Failed to load time slots. Please try again.');
      setShowErrorModal(true);
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, service]);

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
    if (service?.id) {
      fetchTimeSlots();
    }
  }, [selectedDate, service?.id, fetchTimeSlots]);
  

  
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !service) {
      setErrorMessage('Please select a time slot');
      setShowErrorModal(true);
      return;
    }
    
    try {
      setBookingInProgress(true);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Please log in again');
      }
      
      if (isReschedule) {
       
        console.log('Rescheduling order:', orderId, 'with slot:', selectedSlot);
        
        const rescheduleData = {
          pickupSlotStart: selectedSlot.start,
          pickupSlotEnd: selectedSlot.end
        };
        
        const rescheduleResult = await rescheduleOrder(orderId, rescheduleData.pickupSlotStart, rescheduleData.pickupSlotEnd, token);
        console.log('Reschedule API Response:', rescheduleResult);
        
        // Call the callback function if provided
        if (onRescheduleComplete && typeof onRescheduleComplete === 'function') {
          onRescheduleComplete(orderId, selectedSlot);
        }
        
        setShowRescheduleSuccessModal(true);
      } else {
        // Handle new booking
        const addresses = await fetchAddresses();
        if (!addresses || addresses.length === 0) {
          setShowNoAddressModal(true);
          return;
        }
        
        const selectedAddress = addresses[0];
        
        const bookingData = {
          serviceId: service.id,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          addressId: selectedAddress.id,
          notes: '' 
        };
        
        console.log('Making booking with data:', bookingData);
        
        const bookingResult = await bookService(bookingData, token);
        console.log('Booking API Response:', bookingResult);
        
        // Show animated success modal instead of alert
        showSuccessModalAnimated(bookingResult);
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
          setSelectedSlot(null); // Reset selected slot when date changes
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

    return (
      <View style={styles.timeSlotsGrid}>
        {timeSlots.map((slot) => (
          <TouchableOpacity
            key={slot.id}
            style={[
              styles.timeSlot,
              selectedSlot?.id === slot.id && styles.selectedTimeSlot,
              !slot.available && styles.unavailableSlot,
            ]}
            onPress={() => setSelectedSlot(slot)}
            disabled={!slot.available}
          >
            <Text
              style={[
                styles.timeSlotText,
                selectedSlot?.id === slot.id && styles.selectedTimeSlotText,
              ]}
            >
              {slot.time}
            </Text>
            {!slot.available && <View style={styles.overlay} />}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const BookingSuccessModal = () => {
    console.log('BookingSuccessModal rendering, showSuccessModal:', showSuccessModal, 'bookingData:', bookingData);
    if (!showSuccessModal || !bookingData) return null;

    const formatDateTime = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    const formatTimeRange = (startDateString, endDateString) => {
      if (!startDateString || !endDateString) return 'N/A';
      const startDate = new Date(startDateString);
      const endDate = new Date(endDateString);
      
      const dateStr = startDate.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      
      const startTime = startDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      });
      
      const endTime = endDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      });
      
      return `${dateStr}, ${startTime} - ${endTime}`;
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
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service:</Text>
                <Text style={styles.detailValue}>{service?.name || 'Service'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Store:</Text>
                <Text style={styles.detailValue}>{bookingData.store?.name || 'N/A'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Distance:</Text>
                <Text style={styles.detailValue}>{bookingData.store?.distance || 'N/A'}</Text>
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
                navigation.navigate('Profile', { screen: 'Myorder' });
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
      <BookingSuccessModal />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
       

          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service?.name}</Text>
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

          <Text style={styles.sectionTitle}>Available Time Slots</Text>
          {renderTimeSlots()}

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
      </SafeAreaView>
      
      {/* Error Modal */}
      <Modal
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
      </Modal>
      
      {/* No Address Modal */}
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
                  navigation.navigate('Profile', { screen: 'Address' });
                }}
              >
                <Text style={styles.errorModalButtonText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Reschedule Success Modal */}
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
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
    backgroundColor: 'rgba(240, 131, 131, 0.2)',
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
    fontWeight: '600',
  },
  // Time Slots Styles
  timeSlotsContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 20,
    marginLeft: 5,
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
    backgroundColor: colors.cardcolor,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: '600',
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
  // Modal styles
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
});

export default SelectTimeSlot;