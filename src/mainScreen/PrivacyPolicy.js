import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';

const PrivacyPolicy = ({ navigation }) => {
  const privacySections = [
    {
      title: 'Information We Collect',
      content: 'We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes personal information like your name, email address, phone number, and service preferences.'
    },
    {
      title: 'How We Use Your Information',
      content: 'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and communicate with you about products, services, and promotional offers.'
    },
    {
      title: 'Information Sharing',
      content: 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share your information with service providers who assist us in operating our business.'
    },
    {
      title: 'Data Security',
      content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.'
    },
    {
      title: 'Your Rights',
      content: 'You have the right to access, update, or delete your personal information. You can also opt out of receiving marketing communications from us by following the unsubscribe instructions in our emails.'
    },
    {
      title: 'Contact Us',
      content: 'If you have any questions about this Privacy Policy, please contact us at privacy@laundryservice.com or call our customer support team.'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>


      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.policyContainer}>
          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>Last Updated: November 2024</Text>
          </View>

          <View style={styles.introSection}>
            <Text style={styles.introText}>
              At Laundry Service, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our mobile application and services.
            </Text>
          </View>

          {privacySections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By using our services, you agree to the collection and use of information in accordance with this policy.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '94%',
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  policyContainer: {
    padding: 20,
  },
  lastUpdated: {
    marginBottom: 24,
  },
  lastUpdatedText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  introSection: {
    marginBottom: 32,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.primaryText,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.primaryText,
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondaryText,
    textAlign: 'center',
  },
});

export default PrivacyPolicy;
