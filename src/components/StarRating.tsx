import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
  showLabel?: boolean;
  maxRating?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  size = 40,
  disabled = false,
  showLabel = true,
  maxRating = 5,
}) => {
  const { colors } = useTheme();
  const [animatedRating, setAnimatedRating] = useState(rating);
  const [scaleAnimations] = useState(
    Array.from({ length: maxRating }, () => new Animated.Value(1))
  );

  // Sync internal state with prop changes
  useEffect(() => {
    setAnimatedRating(rating);
  }, [rating]);

  const handleStarPress = (selectedRating: number) => {
    if (disabled) return;

    HapticFeedback.light();
    
    // Animate the pressed star
    Animated.sequence([
      Animated.timing(scaleAnimations[selectedRating - 1], {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimations[selectedRating - 1], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setAnimatedRating(selectedRating);
    onRatingChange(selectedRating);
  };

  const renderStar = (index: number) => {
    const starNumber = index + 1;
    const isFilled = starNumber <= animatedRating;
    const isHalfFilled = starNumber === Math.ceil(animatedRating) && animatedRating % 1 !== 0;

    return (
      <Animated.View
        key={index}
        style={[
          styles.starContainer,
          { transform: [{ scale: scaleAnimations[index] }] }
        ]}
      >
        <TouchableOpacity
          onPress={() => handleStarPress(starNumber)}
          disabled={disabled}
          style={styles.starButton}
          activeOpacity={0.7}
        >
          <View style={[styles.star, { width: size, height: size }]}>
            {/* Background star */}
            <Text
              style={[
                styles.starText,
                {
                  fontSize: size,
                  color: colors.border,
                },
              ]}
            >
              ★
            </Text>
            
            {/* Filled star overlay */}
            {isFilled && (
              <View style={styles.filledStarOverlay}>
                <Text
                  style={[
                    styles.starText,
                    {
                      fontSize: size,
                      color: colors.primary,
                    },
                  ]}
                >
                  ★
                </Text>
              </View>
            )}
            
            {/* Half-filled star overlay */}
            {isHalfFilled && (
              <View style={[styles.halfFilledStarOverlay, { width: size / 2 }]}>
                <Text
                  style={[
                    styles.starText,
                    {
                      fontSize: size,
                      color: colors.primary,
                    },
                  ]}
                >
                  ★
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const getRatingLabel = (rating: number): string => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    };
    return labels[rating as keyof typeof labels] || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
      </View>
      
      {showLabel && animatedRating > 0 && (
        <Text style={[styles.ratingLabel, { color: colors.text }]}>
          {getRatingLabel(animatedRating)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starContainer: {
    marginHorizontal: 2,
  },
  starButton: {
    padding: 4,
  },
  star: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  filledStarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfFilledStarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ratingLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
