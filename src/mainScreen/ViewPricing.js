import { View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';

const ViewPricing = ({ navigation }) => {

    return (
        <SafeAreaView style={styles.mainContainer}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Pricing Images */}
                <View style={styles.imagesSection}>
                    <Image
                        source={require('../../assets/pricing_1.png')}
                        style={styles.pricingImage}
                        resizeMode="contain"
                    />
                    <Image
                        source={require('../../assets/pricing_2.png')}
                        style={styles.pricingImage}
                        resizeMode="contain"
                    />
                    <Image
                        source={require('../../assets/pricing_3.png')}
                        style={styles.pricingImage}
                        resizeMode="contain"
                    />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 20,
        paddingBottom: 60,
    },
    pdfSection: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
        gap: 20, // Add space between buttons
    },
    pdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2.5,
        width: '80%', // Make buttons wider
    },
    premiumButton: {
        backgroundColor: '#6c757d',
    },
    pdfButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 12,
        fontSize: 16,
    },
    imagesSection: {
        width: '100%',
        alignItems: 'center',
        gap: 20,
        marginBottom: 60,
    },
    pricingImage: {
        width: '95%',
        height: 500,
        borderRadius: 8,
    },
});

export default ViewPricing;
