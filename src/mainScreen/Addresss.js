import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import colors from '../component/color';
import { fetchAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../services/address';

const ADDRESS_LABELS = ['Home', 'Work', 'Other'];
const REQUIRED_FIELDS = ['fullName', 'phone', 'pincode', 'state', 'city', 'house', 'street'];

const getAddressIdentifier = (address) =>
  address?.id?.toString() ??
  address?.address_id?.toString() ??
  address?._id?.toString() ??
  address?.uuid ??
  null;

const createInitialFormState = () => ({
  fullName: '',
  phone: '',
  altPhone: '',
  pincode: '',
  state: '',
  city: '',
  house: '',
  street: '',
  landmark: '',
  label: 'Home',
  instructions: '',
});

const Addresss = ({ navigation }) => {
  const [mode, setMode] = useState('list');
  const [form, setForm] = useState(createInitialFormState);
  const [coords, setCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAltPhone, setShowAltPhone] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSetDefaultModal, setShowSetDefaultModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const fetchSavedAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const addresses = await fetchAddresses();
      // console.log('Addresses:', addresses);
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

  useFocusEffect(
    useCallback(() => {
      fetchSavedAddresses();
    }, [fetchSavedAddresses])
  );

  const resetForm = () => {
    setForm(createInitialFormState());
    setCoords(null);
    setShowAltPhone(false);
    setEditingAddressId(null);
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddNew = () => {
    resetForm();
    setMode('form');
  };

  const handleUseCurrentLocation = async () => {
    if (mode !== 'form') {
      resetForm();
      setMode('form');
    }
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to fetch your current address.'
        );
        setLocationLoading(false);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      setCoords(currentPosition.coords);

      const reverseResults = await Location.reverseGeocodeAsync(currentPosition.coords);
      if (reverseResults.length > 0) {
        const place = reverseResults[0];
        setForm((prev) => ({
          ...prev,
          pincode: place.postalCode ?? prev.pincode,
          state: place.region ?? prev.state,
          city: place.city ?? place.subregion ?? prev.city,
          house: place.name ?? prev.house,
          street:
            [place.street, place.district, place.subregion].filter(Boolean).join(', ') ||
            prev.street,
          landmark: place.subregion ?? prev.landmark,
        }));
      }
    } catch (error) {
      console.error('Error fetching current location:', error);
      Alert.alert('Location Error', 'Unable to fetch your current location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const validateForm = () => {
    const missing = REQUIRED_FIELDS.filter((field) => !form[field]?.trim());
    if (missing.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return false;
    }

    if (form.phone && form.phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return false;
    }

    if (
      form.altPhone &&
      form.altPhone.replace(/\D/g, '').length > 0 &&
      form.altPhone.replace(/\D/g, '').length < 10
    ) {
      Alert.alert('Invalid Alternate Phone', 'Alternate phone should be 10 digits.');
      return false;
    }

    if (form.pincode && form.pincode.replace(/\D/g, '').length < 6) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit pincode.');
      return false;
    }

    return true;
  };

  const handleEditAddress = (address) => {
    const addressId = getAddressIdentifier(address);
    const addressLine = address?.address_line || address?.addressLine || '';
    const [houseFromLine, ...streetParts] = addressLine.split(',').map((part) => part.trim());
    const normalizedStreet = streetParts.join(', ');

    const normalized = {
      fullName: address?.fullName || address?.full_name || address?.name || '',
      phone: address?.phone || address?.phone_number || address?.phoneNumber || '',
      altPhone:
        address?.altPhone || address?.alt_phone || address?.alternatePhone || address?.otherPhone || '',
      pincode:
        address?.pincode ||
        address?.postal_code ||
        address?.postalCode ||
        '',
      state: address?.state || '',
      city: address?.city || address?.town || '',
      house: address?.house || address?.house_no || houseFromLine || '',
      street: address?.street || address?.area || normalizedStreet || '',
      landmark: address?.landmark || '',
      label: address?.label || 'Home',
      instructions: address?.instructions || '',
    };

    setForm({
      ...createInitialFormState(),
      ...normalized,
    });

    const latitude = address?.latitude ?? address?.coords?.latitude ?? null;
    const longitude = address?.longitude ?? address?.coords?.longitude ?? null;
    const location =
      latitude !== null || longitude !== null
        ? {
            latitude,
            longitude,
          }
        : address?.coords ?? null;

    setCoords(location);
    setShowAltPhone(Boolean(normalized.altPhone));
    setEditingAddressId(addressId);
    setMode('form');
  };

  const handleDeleteAddress = async (addressId) => {
    if (!addressId) {
      return;
    }
    setSelectedAddressId(addressId);
    setShowDeleteModal(true);
  };

  const confirmDeleteAddress = async () => {
    if (!selectedAddressId) {
      return;
    }

    try {
      await deleteAddress(selectedAddressId);
      setSavedAddresses((prev) =>
        prev.filter((address) => getAddressIdentifier(address) !== selectedAddressId)
      );
      setShowDeleteModal(false);
      setSelectedAddressId(null);
    } catch (error) {
      console.error('Delete address error:', error);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    if (!addressId) {
      return;
    }
    setSelectedAddressId(addressId);
    setShowSetDefaultModal(true);
  };

  const confirmSetDefaultAddress = async () => {
    if (!selectedAddressId) {
      return;
    }

    try {
      await setDefaultAddress(selectedAddressId);
      await fetchSavedAddresses();
      setShowSetDefaultModal(false);
      setSelectedAddressId(null);
    } catch (error) {
      console.error('Set default address error:', error);
    }
  };

  const handleAddressMenu = (address) => {
    setSelectedAddress(address);
    setSelectedAddressId(getAddressIdentifier(address));
    setShowActionSheet(true);
  };

  const handleActionSheetPress = (action) => {
    setShowActionSheet(false);
    switch (action) {
      case 'edit':
        handleEditAddress(selectedAddress);
        break;
      case 'setDefault':
        handleSetDefaultAddress(selectedAddressId);
        break;
      case 'delete':
        handleDeleteAddress(selectedAddressId);
        break;
      default:
        break;
    }
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) {
      return;
    }

    const timestamp = new Date().toISOString();

    if (editingAddressId) {
      const updatePayload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        altPhone: form.altPhone?.trim() || '',
        pincode: form.pincode.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        house: form.house.trim(),
        street: form.street.trim(),
        landmark: form.landmark?.trim() || '',
        label: form.label,
        instructions: form.instructions?.trim() || '',
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        postal_code: form.pincode.trim() || null,
        country: null,
        isDefault: false,
      };

      try {
        setSavingAddress(true);
        const updatedAddress = await updateAddress(editingAddressId, updatePayload);
        if (updatedAddress) {
          setSavedAddresses((prev) =>
            prev.map((address) =>
              getAddressIdentifier(address) === editingAddressId
                ? { ...updatedAddress, coords }
                : address
            )
          );
        } else {
          await fetchSavedAddresses();
        }
        setMode('list');
        resetForm();
      } catch (error) {
        console.error('Error updating address:', error);
      } finally {
        setSavingAddress(false);
      }
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      altPhone: form.altPhone?.trim() || '',
      pincode: form.pincode.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      house: form.house.trim(),
      street: form.street.trim(),
      landmark: form.landmark?.trim() || '',
      label: form.label,
      instructions: form.instructions?.trim() || '',
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      postal_code: form.pincode.trim() || null,
      country: null,
      isDefault: false,
    };

    try {
      setSavingAddress(true);
      const newAddress = await createAddress(payload);
      if (newAddress) {
        setSavedAddresses((prev) => [
          { ...newAddress, coords },
          ...prev,
        ]);
      } else {
        await fetchSavedAddresses();
      }
      setMode('list');
      resetForm();
    } catch (error) {
      console.error('Error saving address:', error);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setMode('list');
  };

  const renderHeader = ({ title, subtitle, leftAction, rightAction }) => (
    <View style={styles.headerWrapper}>
      <View style={styles.headerRow}>
        <View style={styles.headerActionSlotLeft}>
          {leftAction || <View style={styles.headerPlaceholder} />}
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerActionSlotRight}>
          {rightAction || <View style={styles.headerPlaceholder} />}
        </View>
      </View>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );

  const renderSavedAddressCard = (address, index) => {
    const cardKey =
      getAddressIdentifier(address) ??
      (address?.createdAt ? `created-${address.createdAt}` : `address-${index}`);
    const name = address?.fullName || address?.full_name || address?.name || 'Saved Address';
    const phone = address?.phone || address?.phone_number || address?.phoneNumber;
    const altPhone =
      address?.altPhone || address?.alt_phone || address?.alternatePhone || address?.otherPhone;
    const pincode =
      address?.pincode || address?.postalCode || address?.postal_code || address?.zip_code;
    const addressLine = address?.address_line || address?.addressLine || '';
    const primaryLine =
      [address?.house, address?.street].filter(Boolean).join(', ') ||
      addressLine ||
      '';
    const secondaryLine = [address.city, address.state, pincode].filter(Boolean).join(', ');
    const isDefault = address?.is_default || address?.isDefault;
    const iconName =
      address.label === 'Work'
        ? 'briefcase-outline'
        : address.label === 'Other'
        ? 'location-outline'
        : 'home-outline';

    return (
      <View key={cardKey} style={[styles.savedCard, isDefault && styles.defaultCard]}>
        <View style={styles.savedCardHeader}>
          <View style={styles.savedCardTitle}>
            <Ionicons name={iconName} size={18} color={colors.primary} />
            <Text style={styles.savedCardName}>{name}</Text>
            {isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => handleAddressMenu(address)}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>
        {primaryLine ? <Text style={styles.savedCardLine}>{primaryLine}</Text> : null}
        {secondaryLine ? <Text style={styles.savedCardLine}>{secondaryLine}</Text> : null}
        {address.landmark ? (
          <Text style={styles.savedCardMeta}>Landmark: {address.landmark}</Text>
        ) : null}
        {phone ? <Text style={styles.savedCardMeta}>{phone}</Text> : null}
        {altPhone ? <Text style={styles.savedCardMeta}>{altPhone}</Text> : null}
      </View>
    );
  };

  const renderListMode = () => (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerTopSpacing} />
      {renderHeader({
        leftAction: (
          <TouchableOpacity style={styles.headerAction} onPress={handleAddNew}>
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={styles.headerActionText}>Add New</Text>
          </TouchableOpacity>
        ),
        rightAction: null,
      })}
      <ScrollView contentContainerStyle={styles.listContent}>
        {loadingAddresses ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your saved addresses...</Text>
          </View>
        ) : savedAddresses.length > 0 ? (
          savedAddresses.map((address, index) => renderSavedAddressCard(address, index))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyTitle}>No addresses yet</Text>
            <Text style={styles.emptySubtitle}>
              Save your delivery locations for faster pickup and drop-off.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleAddNew}>
              <Text style={styles.primaryButtonText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderFormMode = () => (
    <SafeAreaView style={styles.screen}>
      {/* <StatusBar barStyle="dark-content" backgroundColor="transparent" /> */}
      <View style={styles.headerTopSpacing} />
      {renderHeader({
        title: editingAddressId ? 'Edit Delivery Address' : 'Add Delivery Address',
        subtitle: editingAddressId
          ? 'Update the details for this saved location'
          : 'Enter all required fields to save your address',
        leftAction: (
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setMode('list')}
            accessibilityRole="button"
            accessibilityLabel="Back to saved addresses"
          >
            {/* <Ionicons name="arrow-back" size={22} color={colors.primaryText} /> */}
          </TouchableOpacity>
        ),
        rightAction: (
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.headerActionText}>Cancel</Text>
          </TouchableOpacity>
        ),
      })}
      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Full Name (Required)"
              placeholderTextColor={colors.secondaryText}
              value={form.fullName}
              onChangeText={(value) => handleFieldChange('fullName', value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (Required)"
              placeholderTextColor={colors.secondaryText}
              keyboardType="phone-pad"
              maxLength={10}
              value={form.phone}
              onChangeText={(value) => handleFieldChange('phone', value.replace(/[^0-9]/g, ''))}
            />
            {!showAltPhone ? (
              <TouchableOpacity style={styles.linkRow} onPress={() => setShowAltPhone(true)}>
                <Text style={styles.linkText}>+ Add Alternate Phone Number</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Alternate Phone Number"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.altPhone}
                  onChangeText={(value) =>
                    handleFieldChange('altPhone', value.replace(/[^0-9]/g, ''))
                  }
                />
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => {
                    setShowAltPhone(false);
                    handleFieldChange('altPhone', '');
                  }}
                >
                  <Text style={styles.removeLinkText}>Remove alternate number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.locationHintRow}>
            <Text style={styles.locationHintText}>Please wait, while we get the details...</Text>
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowInput, styles.rowInputLeft]}
              placeholder="Pincode (Required)"
              placeholderTextColor={colors.secondaryText}
              keyboardType="number-pad"
              maxLength={6}
              value={form.pincode}
              onChangeText={(value) => handleFieldChange('pincode', value.replace(/[^0-9]/g, ''))}
            />
            <TouchableOpacity
              style={styles.useLocationButton}
              onPress={handleUseCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color={colors.stocke} />
              ) : (
                <>
                  <Ionicons name="locate" size={18} color={colors.stocke} />
                  <Text style={styles.useLocationText}>Use My Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowInput, styles.rowInputLeft]}
              placeholder="State (Required)"
              placeholderTextColor={colors.secondaryText}
              value={form.state}
              onChangeText={(value) => handleFieldChange('state', value)}
            />
            <TextInput
              style={[styles.input, styles.rowInput]}
              placeholder="City (Required)"
              placeholderTextColor={colors.secondaryText}
              value={form.city}
              onChangeText={(value) => handleFieldChange('city', value)}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="House No., Building Name (Required)"
            placeholderTextColor={colors.secondaryText}
            value={form.house}
            onChangeText={(value) => handleFieldChange('house', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Road name, Area, Colony (Required)"
            placeholderTextColor={colors.secondaryText}
            value={form.street}
            onChangeText={(value) => handleFieldChange('street', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Add Nearby Famous Shop/Mall/Landmark"
            placeholderTextColor={colors.secondaryText}
            value={form.landmark}
            onChangeText={(value) => handleFieldChange('landmark', value)}
          />
          <TextInput
            style={[styles.input, styles.instructionsInput]}
            placeholder="Delivery Instructions (optional)"
            placeholderTextColor={colors.secondaryText}
            value={form.instructions}
            onChangeText={(value) => handleFieldChange('instructions', value)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.sectionDivider} />

          <Text style={styles.typeOfAddressTitle}>Type of address</Text>
          <View style={styles.labelRow}>
            {ADDRESS_LABELS.map((label) => {
              const isActive = form.label === label;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.labelChip, isActive && styles.labelChipActive]}
                  onPress={() => handleFieldChange('label', label)}
                >
                  <Text style={[styles.labelChipText, isActive && styles.labelChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, savingAddress && styles.saveButtonDisabled]}
            activeOpacity={0.88}
            onPress={handleSaveAddress}
            disabled={savingAddress}
          >
            {savingAddress ? (
              <ActivityIndicator color={colors.stocke} />
            ) : (
              <MaterialIcons
                name="save-alt"
                size={20}
                color={colors.stocke}
                style={styles.saveButtonIcon}
              />
            )}
            <Text style={styles.saveButtonText}>
              {savingAddress
                ? editingAddressId
                  ? 'Updating...'
                  : 'Saving...'
                : editingAddressId
                ? 'Update Address'
                : 'Save Address'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return (
    <>
      {mode === 'form' ? renderFormMode() : renderListMode()}
      
      {/* Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <View style={styles.actionSheetOverlay}>
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle}>Manage Address</Text>
            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={() => handleActionSheetPress('edit')}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.actionSheetOptionText}>Edit Address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={() => handleActionSheetPress('setDefault')}
            >
              <Ionicons name="star-outline" size={20} color="#FF69B4" />
              <Text style={styles.actionSheetOptionText}>Set as Default</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetOption, styles.deleteOption]}
              onPress={() => handleActionSheetPress('delete')}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.actionSheetOptionText, styles.deleteOptionText]}>Delete Address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetOption, styles.cancelOption]}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={styles.cancelOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
              <Text style={styles.modalTitle}>Delete Address</Text>
            </View>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this address? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDeleteAddress}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Default Confirmation Modal */}
      <Modal
        visible={showSetDefaultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSetDefaultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="star-outline" size={24} color="#FF69B4" />
              <Text style={styles.modalTitle}>Set as Default</Text>
            </View>
            <Text style={styles.modalMessage}>
              Do you want to set this address as your default delivery address?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSetDefaultModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.setDefaultButton]}
                onPress={confirmSetDefaultAddress}
              >
                <Text style={styles.setDefaultButtonText}>Set Default</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    height: '90%',
    backgroundColor: colors.mainColor,
  },
  headerTopSpacing: {
    height: (Number(StatusBar.currentHeight) || 0) / 2,
  },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingTop: (Number(StatusBar.currentHeight)-25),
    paddingBottom: 16,
    backgroundColor: colors.mainColor,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerActionSlotLeft: {
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerActionSlotRight: {
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  headerSubtitle: {
    marginTop: 4,
    paddingHorizontal: 6,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondaryText,
    letterSpacing: 0.1,
  },
  headerPlaceholder: {
    width: 1,
    height: 1,
  },
  headerIconButton: {
    padding: 6,
    borderRadius: 20,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionText: {
    marginLeft: 6,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.secondaryText,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardcolor,
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    marginTop: 40,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.stocke,
    fontSize: 15,
    fontWeight: '600',
  },
  savedCard: {
    backgroundColor: colors.cardcolor,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  savedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  savedCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedCardName: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
  },
  savedCardLine: {
    fontSize: 14,
    color: colors.primaryText,
    marginBottom: 4,
  },
  savedCardMeta: {
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  formWrapper: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.cardcolor,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.primaryText,
    marginBottom: 12,
  },
  linkRow: {
    marginBottom: 12,
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  removeLinkText: {
    color: colors.secondaryText,
    fontSize: 13,
  },
  locationHintRow: {
    marginBottom: 12,
  },
  locationHintText: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowInput: {
    flex: 1,
  },
  rowInputLeft: {
    marginRight: 12,
  },
  useLocationButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  useLocationText: {
    color: colors.stocke,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  instructionsInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 16,
  },
  typeOfAddressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  labelChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 12,
    backgroundColor: colors.cardcolor,
  },
  labelChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  labelChipText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  labelChipTextActive: {
    color: colors.primary,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.8,
  },
  saveButtonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: colors.stocke,
    fontSize: 16,
    fontWeight: '600',
  },
  // Default address styling
  defaultCard: {
    backgroundColor: '#FFE4E1', // Light pink background
    borderColor: '#FF69B4',
    borderWidth: 1,
  },
  defaultBadge: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
    marginLeft: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: colors.secondaryText,
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  setDefaultButton: {
    backgroundColor: '#FF69B4',
  },
  setDefaultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Action sheet styles
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  actionSheetOptionText: {
    fontSize: 16,
    color: colors.primaryText,
    marginLeft: 16,
  },
  deleteOption: {
    borderBottomWidth: 0,
  },
  deleteOptionText: {
    color: '#FF6B6B',
  },
  cancelOption: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  cancelOptionText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});

export default Addresss;

