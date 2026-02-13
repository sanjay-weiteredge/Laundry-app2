import { View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';

const ViewPricing = ({ navigation }) => {

    // We can keep a simple loading state if we want to show something while "opening" or if we add future logic, 
    // but for now, since it's just links, we might not strictly need it. 
    // However, I'll keep the basic structure clean.

    const openPdf = async (url) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                console.error("Don't know how to open this URL: " + url);
                alert("Cannot open this URL");
            }
        } catch (error) {
            console.error("An error occurred", error);
        }
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* PDF Buttons Section */}
                {/* <View style={styles.pdfSection}>
                    <TouchableOpacity
                        style={styles.pdfButton}
                        onPress={() => openPdf('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')}
                    >
                        <Ionicons name="document-text-outline" size={24} color="#fff" />
                        <Text style={styles.pdfButtonText}>Standard Pricing PDF</Text>
                    </TouchableOpacity> */}

                {/* <TouchableOpacity
                        style={[styles.pdfButton, styles.premiumButton]}
                        onPress={() => openPdf('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')}
                    >
                        <Ionicons name="document-text-outline" size={24} color="#fff" />
                        <Text style={styles.pdfButtonText}>Premium Pricing PDF</Text>
                    </TouchableOpacity> */}
                {/* </View> */}

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
        // justifyContent: 'center', // Removed to allow natural scrolling flow
        alignItems: 'center',
        paddingVertical: 20,
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
