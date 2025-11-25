import React from 'react';
import { Image, StyleSheet, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import colors from '../component/color';
import images from '../component/image';
import HomeScreen from '../mainScreen/HomeScreen';
import OrdersScreen from '../mainScreen/OrdersScreen';
import ProfileScreen from '../mainScreen/ProfileScreen';
import SelectTimeSlot from '../mainScreen/SelectTimeSlot';
import Addresss from '../mainScreen/Addresss';
import Myorder from '../mainScreen/Myorder';
import PrivacyPolicy from '../mainScreen/PrivacyPolicy';
import HelpSupport from '../mainScreen/HelpSupport';
import EditProfile from '../mainScreen/EditProfile';

import Feather from '@expo/vector-icons/Feather';
import ServicePriceList from '../mainScreen/ServicePriceList';
const Tab = createBottomTabNavigator();
const HomeStackNavigator = createStackNavigator();
const ProfileStackNavigator = createStackNavigator();


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

const HomeStack = () => (
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
        headerShown: false,
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
  </HomeStackNavigator.Navigator>
);

const ProfileStack = ({ navigation, route }) => {
  // Reset to ProfileHome when the tab is pressed
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // Prevent default behavior
      e.preventDefault();
      
      // Reset to ProfileHome when the tab is pressed
      navigation.navigate('Profile', { 
        screen: 'ProfileHome',
        params: { 
          resetStack: true 
        }
      });
    });

    return unsubscribe;
  }, [navigation]);

  // Check if we're coming from a deep link
  const isDeepLink = route.params?.fromDeepLink;
  
  return (
    <ProfileStackNavigator.Navigator
      initialRouteName={isDeepLink ? 'Address' : 'ProfileHome'}
      screenOptions={({ navigation, route }) => ({
        header: (props) => renderGradientHeader({ ...props, navigation, route }),
        headerShown: true,
        headerBackTitle: 'Back',
      })}
    >
    <ProfileStackNavigator.Screen
      name="ProfileHome"
      component={ProfileScreen}
      options={{
        title: 'Profile',
        headerTitleAlign: 'center',
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    />
    <ProfileStackNavigator.Screen
      name="Myorder"
      component={Myorder}
      options={{
        title: 'My Orders',
        headerTitleAlign: 'center',
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    />
    <ProfileStackNavigator.Screen
      name="Address"
      component={Addresss}
      options={{
        title: 'Saved Addresses',
        headerTitleAlign: 'center',
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    />
    <ProfileStackNavigator.Screen
      name="SelectTimeSlot"
      component={SelectTimeSlot}
      options={{
        title: 'Select Time Slot',
        headerTitleAlign: 'center',
      }}
    />
    <ProfileStackNavigator.Screen
      name="PrivacyPolicy"
      component={PrivacyPolicy}
      options={{
        title: 'Privacy Policy',
        headerTitleAlign: 'center',
      }}
    />
    <ProfileStackNavigator.Screen
      name="HelpSupport"
      component={HelpSupport}
      options={{
        title: 'Help & Support',
        headerTitleAlign: 'center',
      }}
    />
    <ProfileStackNavigator.Screen
      name="EditProfile"
      component={EditProfile}
      options={{
        title: 'Edit Profile',
        headerTitleAlign: 'center',
      }}
    />
    <ProfileStackNavigator.Screen
      name="PriceList"
      component={ServicePriceList}
      options={{
        title: 'Price List',
        headerTitleAlign: 'center',
      }}
    />
    </ProfileStackNavigator.Navigator>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
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

        let iconSource;
        if (route.name === 'Home') {
          iconSource = images.homeIcon;
        } else if (route.name === 'Orders') {
          iconSource = images.orderIcon;
        } else if (route.name === 'Profile') {
          iconSource = images.profileIcon;
        }

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
            <Image
              source={iconSource}
              resizeMode="contain"
              style={[
                styles.icon,
                { tintColor: isFocused ? colors.stocke : colors.secondaryText },
              ]}
            />
            {isFocused && (
              <Text style={styles.tabLabelActive}>{label}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const MainScreen = () => {
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
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{

          headerTitle: () => (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>Orders history</Text>
            </View>
          ),
          headerTitleAlign: 'center',
          headerShown: true,
          headerStyle: {
            backgroundColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerBackground: () => (
            <LinearGradient
              colors={[colors.primary, '#FFA07A']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          ),
          headerTintColor: '#fff',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
      />
    </Tab.Navigator>
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

