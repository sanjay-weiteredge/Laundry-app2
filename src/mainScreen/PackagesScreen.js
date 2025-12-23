import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import colors from '../component/color';

const PackagesScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Packages</Text>
        <Text style={styles.subtitle}>This feature will be implemented later.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mainColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
});

export default PackagesScreen;


