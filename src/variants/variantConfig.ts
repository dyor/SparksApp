import Constants from 'expo-constants';
import { sparkMetadata } from '../components/sparkMetadata';

export type AppVariant = 'full' | 'golf';

const fromEnv = process.env.EXPO_PUBLIC_APP_VARIANT as AppVariant | undefined;
const fromExtra = (Constants.expoConfig?.extra as { variant?: AppVariant } | undefined)?.variant;

export const variant: AppVariant = fromEnv || fromExtra || 'full';

// Startup log. If this prints 'full' when you expected 'golf', Metro is
// serving a bundle that was built without EXPO_PUBLIC_APP_VARIANT=golf —
// usually a stale Metro from an earlier session. Kill port 8081 and rerun.
console.log(
  `[variantConfig] variant=${variant} (from ${fromEnv ? 'env' : fromExtra ? 'extra' : 'default'})`,
  { fromEnv, fromExtra }
);

// Golf Sparks includes any spark whose primary category is "golf" OR whose
// optional secondaryCategory is "golf". Tag a spark in sparkMetadata.ts to
// surface it in the Golf variant without changing its primary category.
const golfIds = Object.values(sparkMetadata)
  .filter((m) => m.category === 'golf' || m.secondaryCategory === 'golf')
  .map((m) => m.id);

export const allowedSparkIds: ReadonlySet<string> | null =
  variant === 'golf' ? new Set(golfIds) : null; // null = allow all

export const isAllowed = (id: string): boolean =>
  allowedSparkIds === null || allowedSparkIds.has(id);
