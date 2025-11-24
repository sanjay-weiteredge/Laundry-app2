import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllServicePricing, transformServiceData } from '../services/servicePricing';
import colors from '../component/color';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

const ServicePriceList = ({ navigation }) => {
  const [priceList, setPriceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState('all');
  const [filteredPriceList, setFilteredPriceList] = useState([]);

 
  const fetchServicePricing = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiData = await getAllServicePricing();
      const transformedData = transformServiceData(apiData);
      setPriceList(transformedData);
      
      // Extract unique service types
      const uniqueTypes = ['all', ...new Set(transformedData
        .filter(service => service.serviceType)
        .map(service => service.serviceType))];
      setServiceTypes(uniqueTypes);
      
      // Initially show all services
      setFilteredPriceList(transformedData);
      
    } catch (error) {
      console.error('Error fetching service pricing:', error);
      setError(error.message || 'Failed to fetch services');
      
      const mockData = [
        { id: 1, name: 'Regular Cleaning', price: 299, duration: '2 hours', serviceType: 'Cleaning' },
        { id: 2, name: 'Deep Cleaning', price: 599, duration: '4 hours', serviceType: 'Cleaning' },
        { id: 3, name: 'Kitchen Deep Clean', price: 499, duration: '3 hours', serviceType: 'Kitchen' },
        { id: 4, name: 'Bathroom Deep Clean', price: 399, duration: '2.5 hours', serviceType: 'Bathroom' },
        { id: 5, name: 'Carpet Cleaning', price: 399, duration: '2 hours', serviceType: 'Cleaning' },
        { id: 6, name: 'Bedroom Cleaning', price: 249, duration: '1.5 hours', serviceType: 'Bedroom' },
      ];
      setPriceList(mockData);
      
      // Extract unique service types from mock data
      const uniqueTypes = ['all', ...new Set(mockData
        .filter(service => service.serviceType)
        .map(service => service.serviceType))];
      setServiceTypes(uniqueTypes);
      setFilteredPriceList(mockData);
    } finally {
      setLoading(false);
    }
  };

  // Filter services based on selected service type
  const handleServiceTypeChange = (serviceType) => {
    setSelectedServiceType(serviceType);
    
    if (serviceType === 'all') {
      setFilteredPriceList(priceList);
    } else {
      const filtered = priceList.filter(service => 
        service.serviceType === serviceType
      );
      setFilteredPriceList(filtered);
    }
  };

 
  useFocusEffect(
    React.useCallback(() => {
      fetchServicePricing();
    }, [])
  );

  const formatPrice = (price) => {
    return `₹${price}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Price List</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Service Type Dropdown */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Filter by Service Type:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedServiceType}
              onValueChange={handleServiceTypeChange}
              style={styles.picker}
              mode="dropdown"
            >
              {serviceTypes.map((type, index) => (
                <Picker.Item 
                  key={index} 
                  label={type === 'all' ? 'All Services' : type.toUpperCase()} 
                  value={type} 
                />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.priceList}>
          {filteredPriceList.map((service) => (
            <View key={service.id} style={styles.priceItem}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={styles.serviceMeta}>
                  <View style={styles.durationContainer}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.duration}>{service.duration}</Text>
                  </View>
                  {service.serviceType && (
                    <View style={styles.typeContainer}>
                      <Ionicons name="pricetag-outline" size={14} color="#666" />
                      <Text style={styles.typeText}>{service.serviceType}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.price}>{formatPrice(service.price)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '95%',
    backgroundColor: '#f8f9fa',
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
    textAlign: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  priceList: {
    padding: 20,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  serviceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  typeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default ServicePriceList;