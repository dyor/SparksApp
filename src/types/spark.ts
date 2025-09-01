export interface SparkMetadata {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'game' | 'utility' | 'creative' | 'education';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
  available: boolean;
}

export interface SparkConfig {
  [key: string]: any;
}

export interface SparkState {
  [key: string]: any;
}

export interface SparkProps {
  config?: SparkConfig;
  onStateChange?: (state: SparkState) => void;
  onComplete?: (result: any) => void;
}

export interface BaseSpark {
  metadata: SparkMetadata;
  component: React.ComponentType<SparkProps>;
}