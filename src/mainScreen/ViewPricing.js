import React from 'react';
import { View, SafeAreaView, StyleSheet, Image } from 'react-native';

const ViewPricing = () => {
    return (
        <SafeAreaView style={styles.mainContainer}>
            <View style={styles.imageContainer}>
                <Image
                    source={require('../../assets/Final_pricelist.jpeg')}
                    style={styles.pricingImage}
                    resizeMode="contain"
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 0,
        marginTop: -40,
        paddingBottom: 10,
    },
    pricingImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
});

export default ViewPricing;
