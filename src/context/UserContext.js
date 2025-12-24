import React, { createContext, useState, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '../services/userAuth';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await getProfile(token);
        if (response.success && response.data) {
          const userData = response.data;
          // Always bust the image cache by adding a timestamp
          if (userData.image) {
            userData.image = `${userData.image.split('?')[0]}?t=${new Date().getTime()}`;
          }
          setUser(userData);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user in context:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
