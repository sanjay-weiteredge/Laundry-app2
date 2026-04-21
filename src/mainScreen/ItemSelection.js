import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../component/color';
import images from '../component/image';
import GlobalHeader from '../component/GlobalHeader';
import { getServicesByCategory } from '../services/catalogService';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = Math.floor((width - 75) / 3);

const ItemSelection = ({ route, navigation }) => {
  const { selectedServices, selectedCategories, selectedAddress } = route.params;

  const [loading, setLoading] = useState(true);
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [cart, setCart] = useState({});

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const categoryData = {};

      for (const category of selectedCategories) {
        console.log(`Fetching items for category: ${category.title} (ID: ${category.id}, Catalog: ${category.catalogId})`);
        const response = await getServicesByCategory(category.catalogId, category.id);

        if (response) {
          console.log('Received response keys:', Object.keys(response));
          const products = [];

          // 1. Try categoryItems
          if (response.categoryItems) {
            Object.values(response.categoryItems).forEach(itemList => {
              if (Array.isArray(itemList)) {
                itemList.forEach(item => {
                  products.push({
                    ...item,
                    price: item.salesRate || item.price || 0,
                    imageUri: item.image || item.imageUri
                  });
                });
              }
            });
          }

          // 2. Add group parents as standard items to utilize their main images
          if (response.groupCategoryItems && Array.isArray(response.groupCategoryItems)) {
            response.groupCategoryItems.forEach(group => {
              // If group price is 0, infer price from its first variant
              let groupPrice = group.salesRate || group.price || 0;
              if (groupPrice === 0 && group.items && group.items.length > 0) {
                groupPrice = group.items[0].salesRate || group.items[0].price || 0;
              }

              products.push({
                ...group,
                price: groupPrice,
                imageUri: group.image || group.imageUri
              });
            });
          }

          // 3. Last fallback: try response.objectList (Standard Fabklean list)
          if (products.length === 0 && response.objectList && Array.isArray(response.objectList)) {
            response.objectList.forEach(item => {
              if (item.id) {
                products.push({
                  ...item,
                  price: item.salesRate || item.price || 0,
                  // Fabklean uses 'icon' for product thumbnails in searching.json
                  imageUri: item.icon || item.image || item.imageUri,
                  name: item.name
                });
              }
            });
          }

          console.log(`Category ${category.title} now has ${products.length} products`);

          if (products.length > 0) {
            categoryData[category.id] = {
              parentService: category.parentService || 'Other',
              categoryName: category.title,
              colorCode: category.colorCode || '#ead1d1',
              textColor: category.textColor || '#232020',
              products: products
            };
          }
        }
      }

      setItemsByCategory(categoryData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategories]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateQuantity = (product, delta) => {
    setCart(prev => {
      const newCart = { ...prev };
      // Use both id and name for better keying
      const currentQty = newCart[product.id]?.quantity || 0;
      const newQty = Math.max(0, currentQty + delta);

      if (newQty === 0) {
        delete newCart[product.id];
      } else {
        newCart[product.id] = {
          ...product,
          quantity: newQty
        };
      }
      return newCart;
    });
  };

  const handleNext = () => {
    const cartItems = Object.values(cart);
    if (cartItems.length > 0) {
      navigation.navigate('SelectTimeSlot', {
        selectedServices,
        selectedCategories,
        selectedItems: cartItems,
        selectedAddress
      });
    } else {
      alert('Please select at least one item');
    }
  };

  const renderProduct = (product, categoryColor) => {
    const qty = cart[product.id]?.quantity || 0;
    const imageUrl = product.imageUri || product.image;

    return (
      <TouchableOpacity
        key={product.id || Math.random().toString()}
        style={styles.itemCard}
        onPress={() => updateQuantity(product, 1)}
        activeOpacity={0.8}
      >
        <View style={[styles.imageContainer, { backgroundColor: categoryColor || '#ead1d1' }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.itemImage}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="shirt-outline" size={40} color={colors.secondaryText} style={{ opacity: 0.5 }} />
          )}

          <View style={styles.quantityBar}>
            <Text style={styles.quantityText}>{qty}</Text>
            <TouchableOpacity
              style={styles.minusButton}
              onPress={() => updateQuantity(product, -1)}
              disabled={qty === 0}
            >
              <Ionicons name="remove" size={16} color={qty > 0 ? "#000" : "#ccc"} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemPrice}>₹{(product.price || 0).toFixed(2)}</Text>
          <Text style={styles.itemName} numberOfLines={1}>{product.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <GlobalHeader title="Select Items" showBack={true} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching items...</Text>
        </View>
      ) : Object.keys(itemsByCategory).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={60} color={colors.secondaryText} />
          <Text style={styles.emptyTitle}>No items available</Text>
          <Text style={styles.emptySubtitle}>We couldn't find any products for these categories.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {Object.entries(
            Object.values(itemsByCategory).reduce((acc, data) => {
              if (!acc[data.parentService]) acc[data.parentService] = [];
              acc[data.parentService].push(data);
              return acc;
            }, {})
          ).map(([parentService, categories]) => (
            <View key={parentService} style={styles.serviceGroupSection}>
              <View style={styles.serviceHeaderWrapper}>
                <Text style={styles.serviceHeaderText}>{parentService}</Text>
              </View>
              {categories.map((data, idx) => (
                <View key={idx} style={styles.categorySection}>
                  <Text style={styles.categoryHeader}>{data.categoryName}</Text>
                  <View style={styles.itemsGrid}>
                    {data.products.map(product => renderProduct(product, data.colorCode))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <View style={styles.cartSummary}>
          <View>
            <Text style={styles.cartTotalText}>Total Items: {Object.values(cart).reduce((sum, i) => sum + i.quantity, 0)}</Text>
            <Text style={styles.cartPriceText}>₹{Object.values(cart).reduce((sum, i) => sum + ((i.price || 0) * i.quantity), 0).toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.nextButton, Object.keys(cart).length === 0 && styles.disabledButton]}
            onPress={handleNext}
            disabled={Object.keys(cart).length === 0}
          >
            <Text style={styles.nextButtonText}>Schedule Pickup</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mainColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.secondaryText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 25,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
    paddingHorizontal: 20,
  },
  serviceGroupSection: {
    marginTop: 25,
  },
  serviceHeaderWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    paddingBottom: 8,
  },
  serviceHeaderText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categorySection: {
    marginTop: 20,
  },
  categoryHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 15,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  itemCard: {
    width: ITEM_WIDTH,
    marginBottom: 10,
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '70%',
    height: '70%',
  },
  quantityBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 24,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryText,
  },
  minusButton: {
    padding: 2,
  },
  itemInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  itemName: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 90, // Positioned above the 70px tab bar
    left: 15,
    right: 15,
  },
  cartSummary: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 10,
    paddingLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cartTotalText: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  cartPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});

export default ItemSelection;
