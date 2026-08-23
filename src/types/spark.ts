export interface SparkMetadata {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconImage?: any; // Image source (require or uri)
  category: 'productivity' | 'travel' | 'food' | 'golf' | 'game' | 'media' | 'utility' | 'community' | 'health' | 'social' | 'spanish';
  createdAt: string; // ISO date string
  rating: number; // 1-5 stars
  archived?: boolean; // Optional flag for archived sparks
  properties?: string[]; // Optional properties like 'AI', 'Shareable', etc.
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
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export interface BaseSpark {
  metadata: SparkMetadata;
  component: React.ComponentType<SparkProps>;
}