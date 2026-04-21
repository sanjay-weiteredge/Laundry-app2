import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';
import GlobalHeader from '../component/GlobalHeader';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

const CategorySelection = ({ route, navigation }) => {
  const { selectedServices, selectedAddress } = route.params;

  // Flatten all categories from selected services and remove duplicates
  const allCategories = [];
  const categoryMap = new Map();

  selectedServices.forEach(service => {
    if (service.categories && Array.isArray(service.categories)) {
      service.categories.forEach(cat => {
        if (!categoryMap.has(cat.id)) {
          categoryMap.set(cat.id, {
            ...cat,
            parentService: service.title,
            catalogId: service.id
          });
          allCategories.push(categoryMap.get(cat.id));
        }
      });
    }
  });

  const [selectedCategories, setSelectedCategories] = useState({});

  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      const newSelected = { ...prev };
      if (newSelected[category.id]) {
        delete newSelected[category.id];
      } else {
        newSelected[category.id] = category;
      }
      return newSelected;
    });
  };

  const handleNext = () => {
    const categories = Object.values(selectedCategories);
    if (categories.length > 0) {
      navigation.navigate('SelectTimeSlot', {
        services: selectedServices,
        selectedCategories: categories,
        selectedAddress
      });
    } else {
      alert('Please select at least one category');
    }
  };

  const getCategoryIcon = (title) => {
    const t = title.toUpperCase();
    if (t.includes('MEN')) return 'man-outline';
    if (t.includes('WOMEN')) return 'woman-outline';
    if (t.includes('KID')) return 'shirt-outline';
    if (t.includes('HOUSE')) return 'home-outline';
    return 'basket-outline';
  };

  const renderCategoryCard = ({ item }) => {
    const isSelected = !!selectedCategories[item.id];
    const iconName = getCategoryIcon(item.title);

    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          { backgroundColor: item.colorCode || '#fff' },
          isSelected && styles.selectedCard
        ]}
        onPress={() => toggleCategory(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          {isSelected ? (
            <View style={styles.selectionBadge}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </View>
          ) : (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={30} color={item.textColor || colors.primaryText} opacity={0.6} />
            </View>
          )}
          <Text style={[styles.categoryTitle, { color: item.textColor || colors.primaryText }]}>
            {item.title}
          </Text>
          <Text style={styles.serviceSource}>{item.parentService}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <GlobalHeader title="Choose Category" showBack={true} />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introSection}>
          <Text style={styles.greeting}>What are we washing today?</Text>
          <Text style={styles.subGreeting}>Select from the categories below</Text>
        </View>

        <View style={styles.servicesRow}>
          {selectedServices.map(s => (
            <View key={s.id} style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>{s.title}</Text>
            </View>
          ))}
        </View>

        <FlatList
          data={allCategories}
          renderItem={renderCategoryCard}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.secondaryText} />
              <Text style={styles.emptyText}>No categories found for selected services</Text>
            </View>
          }
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, Object.keys(selectedCategories).length === 0 && styles.disabledButton]}
          onPress={handleNext}
          disabled={Object.keys(selectedCategories).length === 0}
        >
          <Text style={styles.nextButtonText}>Schedule Pickup</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mainColor,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  introSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryText,
  },
  subGreeting: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 8,
  },
  serviceBadge: {
    backgroundColor: 'rgba(240, 131, 131, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  serviceBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  gridContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  categoryCard: {
    width: COLUMN_WIDTH,
    height: 120,
    borderRadius: 20,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardContent: {
    gap: 4,
  },
  iconContainer: {
    marginBottom: 10,
  },
  selectionBadge: {
    position: 'absolute',
    top: -40,
    right: -5,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  serviceSource: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.5)',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding to clear the 70px absolute tab bar
  },
  nextButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    gap: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.secondaryText,
    fontSize: 16,
  }
});

export default CategorySelection;
