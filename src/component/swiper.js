import React, { useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Swiper from 'react-native-swiper';

const { width } = Dimensions.get('window');

const posterImages = [
  require('../assests/poster/1.jpg'),
  require('../assests/poster/2.jpg'),
  require('../assests/poster/3.jpg'),
  require('../assests/poster/4.jpg'),
];

const AutoSwiper = () => {
  const swiperRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (swiperRef.current) {
        swiperRef.current.scrollBy(1, true);
      }
    }, 2000); // Change slide every 2 seconds

    return () => clearInterval(timer);
  }, []);

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
        {posterImages.map((image, index) => (
          <View key={index} style={styles.slide}>
            <Image
              source={image}
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