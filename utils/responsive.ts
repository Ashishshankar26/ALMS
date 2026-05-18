import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Based on standard ~5" screen mobile device (e.g., iPhone 11/12/13/14 normal size)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scales a dimension horizontally (width, paddingHorizontal, marginHorizontal)
 */
export const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Scales a dimension vertically (height, paddingVertical, marginVertical)
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Moderately scales a dimension (useful for padding/margins where pure scaling might be too extreme on iPads)
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Scales fonts according to screen size and device PixelRatio
 */
export const scaleFont = (size: number) => {
  const newSize = size * (SCREEN_WIDTH / guidelineBaseWidth);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
