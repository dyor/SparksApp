import { BaseSpark, SparkMetadata } from '../types/spark';

// Import actual spark components
import React from 'react';
import { BaseSpark as BaseSparkComponent } from './BaseSpark';
import { SpinnerSpark } from '../sparks/SpinnerSpark';
import { FlashcardsSpark } from '../sparks/FlashcardsSpark';
import { BusinessSpark } from '../sparks/BusinessSpark';
import { PackingListSpark } from '../sparks/PackingListSpark';
import { TodoSpark } from '../sparks/TodoSpark';
import ToviewSpark from '../sparks/ToviewSpark';
import { FoodCamSpark } from '../sparks/FoodCamSpark';
import { SpanishFriendSpark } from '../sparks/SpanishFriendSpark';
import { TeeTimeTimerSpark } from '../sparks/TeeTimeTimerSpark';
import { SoundboardSpark } from '../sparks/SoundboardSpark';
import { GolfTrackerSpark } from '../sparks/GolfTrackerSpark';
import QuickConvertSpark from '../sparks/QuickConvertSpark';
import SpanishReaderSpark from '../sparks/SpanishReaderSpark';
import TripStorySpark from '../sparks/TripStorySpark';
import ShortSaverSpark from '../sparks/ShortSaverSpark';
import SparkSpark from '../sparks/SparkSpark';
import { MinuteMinderSpark } from '../sparks/MinuteMinderSpark';
import { BuzzyBingoSpark } from '../sparks/BuzzyBingoSpark';
import styled from 'styled-components/native';

const PlaceholderContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const PlaceholderText = styled.Text`
  font-size: 18px;
  color: #666;
  text-align: center;
`;

const PlaceholderSpark: React.FC = () => (
  <BaseSparkComponent>
    <PlaceholderContainer>
      <PlaceholderText>This spark is under construction</PlaceholderText>
    </PlaceholderContainer>
  </BaseSparkComponent>
);

// Registry of all available sparks
export const sparkRegistry: Record<string, BaseSpark> = {
  spinner: {
    metadata: {
      id: 'spinner',
      title: 'Decision Spinner',
      description: 'Make decisions with customizable spinning wheel',
      icon: '🎡',
      category: 'utility',
      difficulty: 'easy',
      estimatedTime: 2,
      available: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      rating: 4.2,
    },
    component: SpinnerSpark,
  },
  flashcards: {
    metadata: {
      id: 'flashcards',
      title: 'Spanish Flashcards',
      description: 'Study with interactive flip cards and progress tracking',
      icon: '🃏',
      category: 'education',
      difficulty: 'medium',
      estimatedTime: 10,
      available: true,
      createdAt: '2024-01-02T00:00:00.000Z',
      rating: 4.5,
    },
    component: FlashcardsSpark,
  },
  'business-sim': {
    metadata: {
      id: 'business-sim',
      title: 'Business Simulator',
      description: 'Run your own virtual company with strategic decisions',
      icon: '💼',
      category: 'game',
      difficulty: 'hard',
      estimatedTime: 30,
      available: true,
      createdAt: '2024-01-03T00:00:00.000Z',
      rating: 4.0,
    },
    component: BusinessSpark,
  },
  'packing-list': {
    metadata: {
      id: 'packing-list',
      title: 'Packing List',
      description: 'Organize and track your travel or trip packing items',
      icon: '🎒',
      category: 'utility',
      difficulty: 'easy',
      estimatedTime: 5,
      available: true,
      createdAt: '2024-01-04T00:00:00.000Z',
      rating: 4.3,
    },
    component: PackingListSpark,
  },
  'todo': {
    metadata: {
      id: 'todo',
      title: 'Todo List',
      description: 'Organize tasks with due dates and completion tracking',
      icon: '📝',
      category: 'utility',
      difficulty: 'easy',
      estimatedTime: 5,
      available: true,
      createdAt: '2024-01-05T00:00:00.000Z',
      rating: 4.7,
    },
    component: TodoSpark,
  },
  'toview': {
    metadata: {
      id: 'toview',
      title: 'Toview',
      description: 'Track movies, books, and shows to watch with view dates',
      icon: '👁️',
      category: 'utility',
      difficulty: 'easy',
      estimatedTime: 5,
      available: true,
      createdAt: '2024-01-06T00:00:00.000Z',
      rating: 4.1,
    },
    component: ToviewSpark,
  },
  'food-cam': {
    metadata: {
      id: 'food-cam',
      title: 'FoodCam',
      description: 'Visual food diary with photo timeline and camera integration',
      icon: '📸',
      category: 'utility',
      difficulty: 'medium',
      estimatedTime: 15,
      available: true,
      createdAt: '2024-01-07T00:00:00.000Z',
      rating: 4.4,
    },
    component: FoodCamSpark,
  },
  'spanish-friend': {
    metadata: {
      id: 'spanish-friend',
      title: 'Amigo',
      description: 'Practice Spanish conversation with Ana and Miguel',
      icon: '🇪🇸',
      category: 'education',
      difficulty: 'easy',
      estimatedTime: 10,
      available: true,
      createdAt: '2024-01-08T00:00:00.000Z',
      rating: 4.6,
    },
    component: SpanishFriendSpark,
  },
  'tee-time-timer': {
    metadata: {
      id: 'tee-time-timer',
      title: 'Tee Time Timer',
      description: 'Nail your golf prep routine',
      icon: '⛳',
      category: 'utility',
      difficulty: 'easy',
      estimatedTime: 5,
      available: true,
      createdAt: '2024-01-09T00:00:00.000Z',
      rating: 4.0,
    },
    component: TeeTimeTimerSpark,
  },
  'soundboard': {
    metadata: {
      id: 'soundboard',
      title: 'Sound Board',
      description: 'Record and play custom sound clips with categories',
      icon: '🎛️',
      category: 'utility',
      difficulty: 'medium',
      estimatedTime: 10,
      available: true,
      createdAt: '2024-01-10T00:00:00.000Z',
      rating: 3.8,
    },
    component: SoundboardSpark,
  },
      'golf-brain': {
        metadata: {
          id: 'golf-brain',
          title: 'Golf Brain',
          description: 'Track golf rounds with detailed shot analysis and course management',
          icon: '🏌️‍♂️',
          category: 'utility',
          difficulty: 'medium',
          estimatedTime: 20,
          available: true,
          createdAt: '2024-01-11T00:00:00.000Z',
          rating: 4.8,
        },
        component: GolfTrackerSpark,
      },
      'quick-convert': {
        metadata: {
          id: 'quick-convert',
          title: 'Quick Convert',
          description: 'Currency conversion tool with configurable exchange rates and denominations',
          icon: '💱',
          category: 'utility',
          difficulty: 'easy',
          estimatedTime: 5,
          available: true,
          createdAt: '2024-01-12T00:00:00.000Z',
          rating: 3.9,
        },
        component: QuickConvertSpark,
      },
      'spanish-reader': {
        metadata: {
          id: 'spanish-reader',
          title: 'Spanish Reader',
          description: 'Learn to read Spanish with interleaved English and Spanish text from "To Build a Fire"',
          icon: '📖',
          category: 'education',
          difficulty: 'medium',
          estimatedTime: 15,
          available: true,
          createdAt: '2024-01-13T00:00:00.000Z',
          rating: 4.3,
        },
        component: SpanishReaderSpark,
      },
      'trip-story': {
        metadata: {
          id: 'trip-story',
          title: 'TripStory',
          description: 'Plan, remember, and share your trip with pics...lots and lots of picsS',
          icon: '✈️',
          category: 'utility',
          difficulty: 'medium',
          estimatedTime: 20,
          available: true,
          createdAt: '2024-01-14T00:00:00.000Z',
          rating: 4.5,
        },
        component: TripStorySpark,
      },
      'short-saver': {
        metadata: {
          id: 'short-saver',
          title: 'Short Saver',
          description: 'Save and organize your favorite YouTubes',
          icon: '🎬',
          category: 'utility',
          difficulty: 'easy',
          estimatedTime: 3,
          available: true,
          createdAt: '2024-01-15T00:00:00.000Z',
          rating: 4.3,
        },
        component: ShortSaverSpark,
      },
      'spark-wizard': {
        metadata: {
          id: 'spark-wizard',
          title: 'Spark Wizard',
          description: 'Submit your own Spark idea and become a product manager',
          icon: '🧙‍♂️',
          category: 'utility',
          difficulty: 'easy',
          estimatedTime: 5,
          available: true,
          createdAt: '2024-01-16T00:00:00.000Z',
          rating: 4.5,
        },
        component: SparkSpark,
      },
      'minute-minder': {
        metadata: {
          id: 'minute-minder',
          title: 'Minute Minder',
          description: 'Track your daily activities with start times and countdown timers',
          icon: '⏳',
          category: 'utility',
          difficulty: 'easy',
          estimatedTime: 5,
          available: true,
          createdAt: '2024-01-17T00:00:00.000Z',
          rating: 4.0,
        },
        component: MinuteMinderSpark,
      },
      'buzzy-bingo': {
        metadata: {
          id: 'buzzy-bingo',
          title: 'Buzzy Bingo',
          description: 'Buzzword bingo game - mark squares as you hear tech terms',
          icon: '🎯',
          category: 'game',
          difficulty: 'easy',
          estimatedTime: 2,
          available: true,
          createdAt: new Date().toISOString(),
          rating: 4.5,
        },
        component: BuzzyBingoSpark as React.ComponentType<any>,
      },
};

export const getSparkById = (id: string): BaseSpark | undefined => {
  return sparkRegistry[id];
};

export const getAllSparks = (): BaseSpark[] => {
  return Object.values(sparkRegistry);
};

export const getAvailableSparks = (): BaseSpark[] => {
  return Object.values(sparkRegistry).filter(spark => spark.metadata.available);
};