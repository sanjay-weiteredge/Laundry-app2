import React from 'react';
import { Image, StyleSheet, View, Text, TouchableOpacity, StatusBar, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import colors from '../component/color';
import images from '../component/image';
import HomeScreen from '../mainScreen/HomeScreen';
import OrdersScreen from '../mainScreen/OrdersScreen';
import SelectTimeSlot from '../mainScreen/SelectTimeSlot';
import Addresss from '../mainScreen/Addresss';
import Myorder from '../mainScreen/Myorder';
import PrivacyPolicy from '../mainScreen/PrivacyPolicy';
import HelpSupport from '../mainScreen/HelpSupport';
import EditProfile from '../mainScreen/EditProfile';
import GlobalHeader from '../component/GlobalHeader';
import DrawerContent from '../component/DrawerContent';

import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import PackagesScreen from '../mainScreen/PackagesScreen';
import NotificationScreen from '../mainScreen/NotificationScreen';
import ServicePriceList from '../mainScreen/ServicePriceList';
const Tab = createBottomTabNavigator();
const HomeStackNavigator = createStackNavigator();
const Drawer = createDrawerNavigator();


const renderGradientHeader = ({ route, options, navigation, back }) => {
  const title =
    options.headerTitle !== undefined
      ? options.headerTitle
      : options.title !== undefined
      ? options.title
      : route.name;

  return (
    <LinearGradient
      colors={[colors.primary, '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.headerContainer}>
        {back && (
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>
    </LinearGradient>
  );
};

const HomeStack = ({ navigation }) => (
  <HomeStackNavigator.Navigator
    screenOptions={{
      header: renderGradientHeader,
    }}
  >
    <HomeStackNavigator.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'Home',
        headerShown: true,
        header: () => (
          <GlobalHeader title="Home" />
        ),
        headerTitleAlign: 'center',
      }}
    />
    <HomeStackNavigator.Screen
      name="Notification"
      component={NotificationScreen}
      options={{
        title: 'Notifications',
        headerTitleAlign: 'center',
      }}
    />
    <HomeStackNavigator.Screen
      name="SelectTimeSlot"
      component={SelectTimeSlot}
      options={{
        title: 'Select Time Slot',
        headerTitleAlign: 'center',
      }}
    />
    <HomeStackNavigator.Screen
      name="EditProfile"
      component={EditProfile}
      options={{
        title: 'Edit Profile',
        headerTitleAlign: 'center',
      }}
    />
    <HomeStackNavigator.Screen
      name="Myorder"
      component={Myorder}
      options={{
        title: 'My Orders',
        headerTitleAlign: 'center',
      }}
    />
    <HomeStackNavigator.Screen
      name="Address"
      component={Addresss}
      options={{
        title: 'Saved Addresses',
        headerTitleAlign: 'center',
      }}
    />
    <HomeStackNavigator.Screen
      name="PrivacyPolicy"
      component={PrivacyPolicy}
      options={{
        title: 'Privacy Policy',
        headerTitleAlign: 'center',
      }}
    />
    <HomeStackNavigator.Screen
      name="HelpSupport"
      component={HelpSupport}
      options={{
        title: 'Help & Support',
        headerTitleAlign: 'center',
      }}
    />
    <HomeStackNavigator.Screen
      name="PriceList"
      component={ServicePriceList}
      options={{
        title: 'Price List',
        headerTitleAlign: 'center',
      }}
    />
  </HomeStackNavigator.Navigator>
);


const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes
        .map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          if (route.name === 'Whatsapp') {
            const openWhatsApp = async () => {
              try {
                // Provided number: "95503 96999"
                const rawNumber = '95503 96999';
                const digitsOnly = rawNumber.replace(/\D/g, '');
                // If 10 digits (likely India), prefix +91. Otherwise assume it already includes country code.
                const phoneWithCC = digitsOnly.length === 10 ? `+91${digitsOnly}` : `+${digitsOnly}`;

                const appUrl = `whatsapp://send?phone=${phoneWithCC}`;
                const webUrl = `https://wa.me/${encodeURIComponent(phoneWithCC)}`;

                const canOpen = await Linking.canOpenURL(appUrl);
                if (canOpen) {
                  await Linking.openURL(appUrl);
                  return;
                }
                await Linking.openURL(webUrl);
              } catch (e) {
                Alert.alert('WhatsApp', 'Unable to open WhatsApp');
              }
            };
            openWhatsApp();
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const color = isFocused ? colors.stocke : colors.secondaryText;
        const renderIcon = () => {
          switch (route.name) {
            case 'Home':
              return <Ionicons name="home-outline" size={24} color={color} />;
            case 'Orders':
              return <Ionicons name="bag-handle-outline" size={24} color={color} />;
            case 'Whatsapp':
              return <Ionicons name="logo-whatsapp" size={24} color={color} />;
            case 'Packages':
              return <Ionicons name="cube-outline" size={24} color={color} />;
            default:
              return <Feather name="circle" size={24} color={color} />;
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
              styles.tabButton,
              isFocused && styles.tabButtonActive,
              index === 0 && isFocused && styles.firstTabActive,
            ]}
          >
            {renderIcon()}
            {isFocused && (
              <Text style={styles.tabLabelActive}>{label}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          headerShown: true,
          header: () => (
            <GlobalHeader title="Order History" />
          ),
        }}
      />
      <Tab.Screen
        name="Whatsapp"
        component={HomeStack}
        options={{
          title: 'Whatsapp',
        }}
      />
      <Tab.Screen
        name="Packages"
        component={PackagesScreen}
        options={{
          headerShown: true,
          header: () => (
            <GlobalHeader title="Packages" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const MainScreen = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          drawerLabel: 'Home',
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  // Header Styles
  headerGradient: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    position: 'absolute',
    left: 15,
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Same as back button for balance
  },
  // Tab Bar Styles
  tabBarContainer: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#FDE2E2',
    borderRadius: 35,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    minWidth: 60,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderRadius: 25,
  },
  firstTabActive: {
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
  },
  icon: {
    width: 24,
    height: 24,
  },
  tabLabelActive: {
    color: colors.stocke,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MainScreen;
