import { BaseSpark, SparkMetadata } from '../types/spark';

// Import actual spark components
import React from 'react';
import { BaseSpark as BaseSparkComponent } from './BaseSpark';
import { SpinnerSpark } from '../sparks/SpinnerSpark';
import { FlashcardsSpark } from '../sparks/FlashcardsSpark';
import { BusinessSpark } from '../sparks/BusinessSpark';
import { PackingListSpark } from '../sparks/PackingListSpark';
import { TodoSpark } from '../sparks/TodoSpark';
import { FoodCamSpark } from '../sparks/FoodCamSpark';
import { SpanishFriendSpark } from '../sparks/SpanishFriendSpark';
import { TeeTimeTimerSpark } from '../sparks/TeeTimeTimerSpark';
import { SoundboardSpark } from '../sparks/SoundboardSpark';
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
    },
    component: TodoSpark,
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
    },
    component: FoodCamSpark,
  },
  'spanish-friend': {
    metadata: {
      id: 'spanish-friend',
      title: 'Spanish Friend',
      description: 'Practice Spanish conversation with Ana and Miguel',
      icon: '🇪🇸',
      category: 'education',
      difficulty: 'easy',
      estimatedTime: 10,
      available: true,
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
    },
    component: TeeTimeTimerSpark,
  },
  'soundboard': {
    metadata: {
      id: 'soundboard',
      title: 'Soundboard',
      description: 'Record and play custom sound clips with categories',
      icon: '🎛️',
      category: 'utility',
      difficulty: 'medium',
      estimatedTime: 10,
      available: true,
    },
    component: SoundboardSpark,
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