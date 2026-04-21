import React, { useRef, useEffect, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-swiper';
import { getActivePosters } from '../services/poster';

const { width } = Dimensions.get('window');

const fallbackImages = [
  require('../assests/poster/1.png'),
  require('../assests/poster/2.png'),
  require('../assests/poster/3.png'),
  require('../assests/poster/4.png'),
];

const AutoSwiper = ({ refreshKey }) => {
  const swiperRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic height based on screen width (slightly taller for posters)
  const swiperHeight = width * 0.65;

  useEffect(() => {
    let isMounted = true;
    const fetchPosters = async () => {
      try {
        setLoading(true);
        const posters = await getActivePosters();
        const urls = posters.map(p => p.image_url).filter(Boolean);
        if (isMounted) {
          setImages(urls.length > 0 ? urls : fallbackImages);
        }
      } catch (error) {
        if (isMounted) {
          setImages(fallbackImages);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPosters();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { height: swiperHeight }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: swiperHeight }]}>
      <Swiper
        ref={swiperRef}
        style={styles.wrapper}
        showsButtons={false}
        autoplay={true}
        autoplayTimeout={3.5}
        loop={true}
        showsPagination={true}
        dotStyle={styles.paginationDot}
        activeDotStyle={styles.paginationActiveDot}
        paginationStyle={styles.pagination}
        removeClippedSubviews={false} // Helps with Android rendering glitches
      >
        {images.map((image, index) => (
          <View key={index} style={styles.slide}>
            <Image
              source={typeof image === 'string' ? { uri: image } : image}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        ))}
      </Swiper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: {},
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    // Removed specific border radius if full bleed is preferred, 
    // or set a subtle one to match the card theme
    borderRadius: 8,
  },
  pagination: {
    bottom: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  paginationActiveDot: {
    width: 20,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    backgroundColor: '#fff',
  },
});

export default AutoSwiper;