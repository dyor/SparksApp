import { BaseSpark, SparkMetadata } from '../types/spark';

// Import actual spark components
import React from 'react';
import { BaseSpark as BaseSparkComponent } from './BaseSpark';
import { SpinnerSpark } from '../sparks/SpinnerSpark';
import { FlashcardsSpark } from '../sparks/FlashcardsSpark';
import { BusinessSpark } from '../sparks/BusinessSpark';
import { PackingListSpark } from '../sparks/PackingListSpark';
import { TodoSpark } from '../sparks/TodoSpark';
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
      title: 'Spinner',
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
      title: 'Flashcards',
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