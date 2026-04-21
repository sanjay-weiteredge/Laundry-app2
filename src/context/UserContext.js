import React, { createContext, useState, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/userService';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const userDataStr = await AsyncStorage.getItem('userData');

      if (isLoggedIn === 'true' && userDataStr) {
        const localData = JSON.parse(userDataStr);
        const response = await getUserProfile(localData.id);

        if (response && response.userInfo) {
          const profile = response.userInfo;
          // Always bust the image cache by adding a timestamp
          if (profile.imageUrl) {
            profile.image = `${profile.imageUrl}?t=${new Date().getTime()}`;
          }
          setUser(profile);
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
