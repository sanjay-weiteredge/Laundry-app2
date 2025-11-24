import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';


const HelpSupport = ({ navigation }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqSections = [
    {
      id: 'booking',
      title: 'Booking & Orders',
      icon: 'calendar-outline',
      questions: [
        {
          q: 'How do I book a laundry service?',
          a: 'Simply select your service, choose a pickup time slot, provide your address, and confirm your booking. You\'ll receive a confirmation with all the details.'
        },
        {
          q: 'Can I reschedule my pickup?',
          a: 'Yes! Go to "My Orders" in your profile, select the order you want to reschedule, and choose a new time slot.'
        },
        {
          q: 'How do I cancel an order?',
          a: 'Navigate to "My Orders", find the order you want to cancel, and tap the "Cancel Order" button. Your order will be cancelled immediately.'
        },
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major credit cards, debit cards, and digital wallets including UPI, Paytm, and Google Pay.'
        }
      ]
    },
    {
      id: 'services',
      title: 'Services',
      icon: 'shirt-outline',
      questions: [
        {
          q: 'What services do you offer?',
          a: 'We offer washing, dry cleaning, ironing, and special fabric care services for all types of clothing and household items.'
        },
        {
          q: 'How long does service take?',
          a: 'Standard washing takes 24-48 hours. Dry cleaning takes 2-3 days. Express service options are available at additional cost.'
        },
        {
          q: 'Do you offer pickup and delivery?',
          a: 'Yes, we offer free pickup and delivery for orders above ₹500. For smaller orders, a nominal fee applies.'
        }
      ]
    },
    {
      id: 'pricing',
      title: 'Pricing & Payment',
      icon: 'card-outline',
      questions: [
        {
          q: 'How is pricing calculated?',
          a: 'Pricing is based on the type of service, weight of clothes, and any special care requirements. You can see detailed pricing in the app before booking.'
        },
        {
          q: 'Are there any hidden charges?',
          a: 'No, we believe in transparent pricing. All charges including pickup, delivery, and service fees are shown upfront.'
        },
        {
          q: 'Can I get a refund?',
          a: 'Yes, if you\'re not satisfied with our service, please contact us within 24 hours of delivery. We\'ll either reprocess your items or provide a refund.'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Profile',
      icon: 'person-outline',
      questions: [
        {
          q: 'How do I update my profile information?',
          a: 'Go to your Profile section and tap "Edit Profile" to update your personal information, phone number, and preferences.'
        },
        {
          q: 'How do I add multiple addresses?',
          a: 'In the Profile section, tap "Saved Addresses" and add as many addresses as you need. You can select any address during booking.'
        },
        {
          q: 'Is my data secure?',
          a: 'Absolutely! We use industry-standard encryption and security measures to protect your personal and payment information.'
        }
      ]
    }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleContactSubmit = async () => {
    const { name, email, subject, message } = contactForm;
    
    if (!name || !email || !subject || !message) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Message Sent',
        'Thank you for contacting us. We\'ll get back to you within 24 hours.',
        [{ text: 'OK', onPress: () => setContactForm({ name: '', email: '', subject: '', message: '' }) }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const emergencyContacts = [
    { type: 'Phone', value: '1800-123-4567', icon: 'call-outline' },
    { type: 'Email', value: 'support@laundryservice.com', icon: 'mail-outline' },
    { type: 'WhatsApp', value: '+91 98765 43210', icon: 'logo-whatsapp' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Contacts */}
        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>Emergency Support</Text>
          <View style={styles.contactGrid}>
            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.contactCard}
                onPress={() => {
                  if (contact.type === 'Phone') {
                    Linking.openURL(`tel:${contact.value}`);
                  } else if (contact.type === 'Email') {
                    Linking.openURL(`mailto:${contact.value}`);
                  } else if (contact.type === 'WhatsApp') {
                    Linking.openURL(`whatsapp://send?phone=${contact.value.replace(/\s/g, '')}`);
                  }
                }}
              >
                <Ionicons name={contact.icon} size={24} color={colors.primary} />
                <Text style={styles.contactType}>{contact.type}</Text>
                <Text style={styles.contactValue}>{contact.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Sections */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqSections.map((section) => (
            <View key={section.id} style={styles.faqCategory}>
              <TouchableOpacity 
                style={styles.categoryHeader}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.categoryLeft}>
                  <Ionicons name={section.icon} size={20} color={colors.primary} />
                  <Text style={styles.categoryTitle}>{section.title}</Text>
                </View>
                <Ionicons 
                  name={expandedSection === section.id ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={colors.secondaryText} 
                />
              </TouchableOpacity>
              
              {expandedSection === section.id && (
                <View style={styles.questionsContainer}>
                  {section.questions.map((faq, qIndex) => (
                    <View key={qIndex} style={styles.questionItem}>
                      <Text style={styles.question}>{faq.q}</Text>
                      <Text style={styles.answer}>{faq.a}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact Form */}
        <View style={styles.contactFormSection}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              value={contactForm.name}
              onChangeText={(text) => setContactForm({...contactForm, name: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Your Email"
              value={contactForm.email}
              onChangeText={(text) => setContactForm({...contactForm, email: text})}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Subject"
              value={contactForm.subject}
              onChangeText={(text) => setContactForm({...contactForm, subject: text})}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="How can we help you?"
              value={contactForm.message}
              onChangeText={(text) => setContactForm({...contactForm, message: text})}
              multiline
              numberOfLines={4}
            />
            
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleContactSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '94%',
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 16,
  },
  emergencySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  contactType: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 8,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryText,
    marginTop: 4,
    textAlign: 'center',
  },
  faqSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqCategory: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
    marginLeft: 12,
  },
  questionsContainer: {
    marginTop: 12,
  },
  questionItem: {
    marginBottom: 16,
    paddingLeft: 32,
  },
  question: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondaryText,
  },
  contactFormSection: {
    padding: 20,
  },
  formContainer: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.secondaryText,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HelpSupport;
