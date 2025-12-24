import React, { useRef, useEffect, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-swiper';
import { getActivePosters } from '../services/poster';

const { width } = Dimensions.get('window');

const fallbackImages = [
  require('../assests/poster/1.jpg'),
  require('../assests/poster/2.jpg'),
  require('../assests/poster/3.jpg'),
  require('../assests/poster/4.jpg'),
];

const AutoSwiper = () => {
  const swiperRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      if (swiperRef.current) {
        swiperRef.current.scrollBy(1, true);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchPosters = async () => {
      try {
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
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Swiper
        ref={swiperRef}
        style={styles.wrapper}
        showsButtons={false}
        autoplay={false}
        loop={true}
        showsPagination={true}
        dotStyle={styles.paginationDot}
        activeDotStyle={styles.paginationActiveDot}
        paginationStyle={styles.pagination}
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
    height: 200,
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
    borderRadius: 10,
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