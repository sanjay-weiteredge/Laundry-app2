import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from '../authScreen/SplashScreen';

import LoginScreen from '../authScreen/LoginScreen';
import OtpScreen from '../authScreen/OtpScreen';
import BasicDetails from '../authScreen/BasicDetails';
import MainScreen from './MainScreen';

// Handle notifications when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received: ', notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification Response: ', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />

        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="BasicDetails" component={BasicDetails} />
        <Stack.Screen name="Main" component={MainScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;