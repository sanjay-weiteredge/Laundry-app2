import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/apiRequest';

const NearByStore = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNearbyStores();
  }, []);

  const fetchNearbyStores = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setError('Please login again');
        setLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      let location = await Location.getLastKnownPositionAsync();
      if (!location) {
        location = await Location.getCurrentPositionAsync({});
      }

      const { latitude, longitude } = location.coords;

      const res = await axios.get(`${API}/users/nearby-stores`, {
        params: {
          latitude,
          longitude,
          radius_km: 3,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setStores(res.data.data);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError('Failed to fetch nearby stores');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const openDirections = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const callStore = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading nearby stores...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.name}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: item.is_active ? '#E6F7EC' : '#FFEAEA' },
          ]}
        >
          <Text
            style={{
              color: item.is_active ? '#1E9E5A' : '#D9534F',
              fontWeight: '600',
            }}
          >
            {item.is_active ? 'Available' : 'Closed'}
          </Text>
        </View>
      </View>

      <Text style={styles.address}>{item.address}</Text>

      {item.phone ? (
        <TouchableOpacity onPress={() => callStore(item.phone)}>
          <Text style={styles.phone}>📞 {item.phone}</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.distance}>
        Distance: {item.distance.toFixed(2)} km
      </Text>

      <TouchableOpacity
        style={styles.directionBtn}
        onPress={() => openDirections(item.latitude, item.longitude)}
      >
        <Text style={styles.directionText}>Get Directions</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>No nearby stores found</Text>
          </View>
        }
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    paddingHorizontal: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginTop: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  address: {
    marginTop: 6,
    color: '#555',
  },
  phone: {
    marginTop: 6,
    color: '#007AFF',
    fontWeight: '500',
  },
  distance: {
    marginTop: 6,
    color: '#777',
    fontSize: 13,
  },
  directionBtn: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default NearByStore;
