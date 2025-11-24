import React from 'react';
import { View, Text, StyleSheet, Image, StatusBar, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../component/color';
import images from '../component/image';

const OnboardingScreen = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  const windowDimensions = Dimensions.get('window');
  const screenWidth = typeof windowDimensions.width === 'number' ? windowDimensions.width : 0;
  const screenHeight = typeof windowDimensions.height === 'number' ? windowDimensions.height : 0;
  const overlayTop = screenHeight * 0.4;
  
  const backgroundImageStyle = {
    ...styles.backgroundImage,
    width: screenWidth,
    height: screenHeight-290,
  };
  
  const overlayStyle = {
    ...styles.overlay,
    top: overlayTop,
    width: screenWidth,
  };

  return (
    <View style={styles.container}>
     

            <Image 
        source={images.mainImage} 
        style={backgroundImageStyle}
        resizeMode="contain"
    />
        <LinearGradient
        colors={['transparent', 'rgba(245, 171, 171, 0.5)', 'rgba(240, 131, 131, 0.9)']}
        style={overlayStyle}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.headingText}>
            Let us take the load off your shoulders.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>Let's get started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  textContainer: {
    paddingHorizontal: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  headingText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 36,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 58,
    paddingVertical: 10,
    paddingHorizontal: 40,
    width: 343,
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
});

export default OnboardingScreen;
