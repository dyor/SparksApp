import Constants from 'expo-constants';
import { sparkMetadata } from '../components/sparkMetadata';

export type AppVariant = 'full' | 'golf';

export const variant: AppVariant =
  (process.env.EXPO_PUBLIC_APP_VARIANT as AppVariant) ||
  ((Constants.expoConfig?.extra as { variant?: AppVariant } | undefined)?.variant) ||
  'full';

// Sparks not tagged category: "golf" but included in the Golf Sparks app.
// See CONTEXT/GENERAL/GOLFSPARKSPLAN.md §"The Golf Subset".
const GOLF_EXTRA_SPARK_IDS = ['card-score'];

const golfIds = [
  ...Object.values(sparkMetadata)
    .filter((m) => m.category === 'golf')
    .map((m) => m.id),
  ...GOLF_EXTRA_SPARK_IDS,
];

export const allowedSparkIds: ReadonlySet<string> | null =
  variant === 'golf' ? new Set(golfIds) : null; // null = allow all

export const isAllowed = (id: string): boolean =>
  allowedSparkIds === null || allowedSparkIds.has(id);
