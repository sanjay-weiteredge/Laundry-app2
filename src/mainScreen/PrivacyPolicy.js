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
      title: '1. Information We Collect',
      content: 'We may collect the following types of information when you use our services:\n\na. Personal Information\n• Name\n• Phone number\n• Email address\n• Pickup and delivery address\n\nb. Order & Transaction Information\n• Service details (wash, dry clean, ironing, etc.)\n• Order history\n• Payment details (processed securely via third-party payment providers)\n\nc. Device & Usage Information\n• IP address\n• Device type and operating system\n• Browser type\n• App/website usage data\n\nd. Communication Data\n• Messages, feedback, or queries you share with us via email, phone, chat, or social media\n• Call recordings (if applicable, for quality and training purposes)'
    },
    {
      title: '2. How We Collect Information',
      content: 'We collect information when:\n• You create an account or place an order\n• You contact us for support or inquiries\n• You browse our website or use our app\n• You interact with our advertisements or promotions\n\nWe may also receive limited data from third-party services such as payment providers or analytics tools.'
    },
    {
      title: '3. How We Use Your Information',
      content: 'We use your information to:\n• Provide pickup, cleaning, and delivery services\n• Process payments and manage orders\n• Communicate order updates and service notifications\n• Improve our services and user experience\n• Respond to customer support requests\n• Send offers, promotions, or updates (you can opt out anytime)\n• Prevent fraud and ensure platform security'
    },
    {
      title: '4. Sharing of Information',
      parts: [
        { text: 'We may share your information with:\n\n• ' },
        { text: 'Service partners', bold: true },
        { text: ' (delivery personnel, laundry facilities) to fulfill your order\n• ' },
        { text: 'Payment gateways', bold: true },
        { text: ' to process transactions securely\n• ' },
        { text: 'Technology providers', bold: true },
        { text: ' (hosting, analytics, communication tools)\n• ' },
        { text: 'Legal authorities', bold: true },
        { text: ' when required by law\n\nWe do ' },
        { text: 'not sell your personal information', bold: true },
        { text: ' to third parties.' },
      ]
    },
    {
      title: '5. Third-Party Services',
      content: 'We use trusted third-party services for:\n• Payment processing\n• Hosting and data storage\n• Analytics and performance tracking\n\nThese providers have their own privacy policies, and we encourage you to review them.'
    },
    {
      title: '6. Cookies & Tracking Technologies',
      content: 'We may use cookies and similar technologies to:\n• Enhance your browsing experience\n• Remember your preferences\n• Analyze website traffic and usage\n\nYou can control cookie settings through your browser.'
    },
    {
      title: '7. Data Security',
      content: 'We take reasonable technical and organizational measures to protect your information from unauthorized access, loss, or misuse.\n\nHowever, no digital system is completely secure, and we cannot guarantee absolute security.'
    },
    {
      title: '8. Data Retention',
      content: 'We retain your information only as long as necessary to:\n• Provide our services\n• Maintain records for legal and operational purposes\n• Resolve disputes'
    },
    {
      title: '9. Your Rights',
      content: 'You have the right to:\n• Access and review your personal information\n• Update or correct your details\n• Request deletion of your account and data\n• Opt out of marketing communications\n\nTo exercise these rights, please contact us using the details below.'
    },
    {
      title: "10. Children's Privacy",
      content: 'Our services are intended for users who are at least 18 years old.\nWe do not knowingly collect data from minors.'
    },
    {
      title: '11. Changes to This Privacy Policy',
      content: 'We may update this Privacy Policy from time to time.\nAny changes will be posted on this page with an updated effective date.'
    },
    {
      title: '12. Contact Us',
      content: 'If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:\n\n📧 Email: support@thelaundryguyz.com\n📞 Phone: +91 4079697735'
    }
  ];

  const renderContent = (section) => {
    if (section.parts) {
      return (
        <Text style={styles.sectionContent}>
          {section.parts.map((part, i) => (
            <Text key={i} style={part.bold ? styles.boldText : null}>{part.text}</Text>
          ))}
        </Text>
      );
    }
    return <Text style={styles.sectionContent}>{section.content}</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>


      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.policyContainer}>
          {/* <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>Last Updated: March 2025</Text>
          </View> */}

          <View style={styles.introSection}>
            <Text style={styles.introText}>
              Welcome to The Laundry Guyz ("we", "our", "us").{"\n"}We are committed to protecting your privacy and ensuring a safe and seamless experience when you use our website and services.{"\n"}This Privacy Policy explains how we collect, use, and safeguard your information.
            </Text>
          </View>

          {privacySections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {renderContent(section)}
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
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.primaryText,
  },
  boldText: {
    fontWeight: '700',
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
