# TripStory Spark Plan

## Overview
**Name:** TripStory  
**Tagline:** Plan, remember, and share your trip.  
**Icon:** ✈️  
**Category:** Travel/Photography  
**Difficulty:** Medium  
**Estimated Time:** 20 minutes  

## Core Concept
A comprehensive trip planning and documentation tool that allows users to capture their journey through photos and create shareable visual stories.

## Features

### Pre-Trip Planning
- **Trip Creation**
  - Trip name/title
  - Start date and end date
  - Travel origin and destination
  - Lodging information
  - Planned activities (optional)

### During Trip
- **Photo Capture**
  - Camera integration (similar to FoodCam)
  - Automatic geolocation capture (when available)
  - Optional activity association
  - Date-based organization
  - Photo metadata (timestamp, location, activity)

### Post-Trip Sharing
- **Trip Story Generation**
  - Single image export
  - Trip title at top
  - Daily sections with activities
  - Photos organized by activity or date
  - Clean, Instagram-worthy layout

## Data Models

### Trip
```typescript
interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  origin: string;
  destination: string;
  lodging?: string;
  activities: Activity[];
  photos: TripPhoto[];
  createdAt: string;
  updatedAt: string;
}
```

### Activity
```typescript
interface Activity {
  id: string;
  tripId: string;
  name: string;
  date: string;
  description?: string;
  photos: TripPhoto[];
  createdAt: string;
}
```

### TripPhoto
```typescript
interface TripPhoto {
  id: string;
  tripId: string;
  activityId?: string;
  uri: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  caption?: string;
  createdAt: string;
}
```

## User Interface

### Main Screen
- List of trips (past, current, upcoming)
- "Create New Trip" button
- Trip cards showing title, dates, photo count

### Trip Detail Screen
- Trip information header
- Timeline view of days
- Activities for each day
- Photos organized by activity/date
- "Add Photo" floating action button

### Photo Capture
- Camera interface (similar to FoodCam)
- Activity selection dropdown
- Location display
- Caption input (optional)

### Trip Story Export
- Preview of generated story image
- Share options (save to photos, social media)
- Customization options (layout, colors)

## Technical Implementation

### Dependencies
- `expo-camera` - Photo capture
- `expo-location` - Geolocation services
- `expo-image-picker` - Photo selection
- `expo-file-system` - Photo storage
- `expo-sharing` - Share functionality
- `react-native-image-resizer` - Image processing for story generation

### Storage
- Local photo storage using Expo FileSystem
- Trip data stored in AsyncStorage
- Photo metadata in JSON format

### Image Processing
- Grid layout generation for trip stories
- Photo resizing and arrangement
- Text overlay for trip title and dates
- Single image export functionality

## Settings
- Default photo quality
- Location permission preferences
- Export image resolution
- Auto-backup to cloud (future feature)

## Future Enhancements
- Cloud sync across devices
- Collaborative trip planning
- Map integration showing trip route
- Video support
- Social sharing templates
- Trip statistics and insights

## Implementation Specifications

### Photo Organization
- **Day-first then activity** structure
- Activities are **single-day only** (cannot span multiple days)
- **Lodging** shown below the day (can span multiple days)
- Multiple lodging events on same day (check out/check in) shown together

### Activity Management
- **Both pre-planned and on-the-fly** creation
- Activities created during trip planning
- Activities added during trip via quick capture

### Story Layout
- **Pictures in grid** format (under activity or day)
- **Timeline structure** for days, lodging, and activity names
- Clean, organized visual hierarchy

### Photo Limits
- **Unlimited photos** per trip and activity
- No restrictions on photo count

### Location Services
- **Automatic capture** when possible
- Graceful handling when location unavailable
- Optional location display in photos

### Sharing Options
- **Single image** primary export
- **PDF export** as secondary option
- Future: Multiple image formats

### Trip Status
- **Planned trips** (future dates)
- **Active trips** (current dates)
- **Completed trips** (past dates)

### Photo Editing
- **Basic filters and cropping** for quick editing
- **Fast capture workflow** - edit after association
- Quick activity association during capture

## Ready for Implementation
All specifications clarified - ready to build the TripStory spark!

---

## Removed Features (Archived Code)

### Map View Functionality (Removed)
The map view feature was removed because it did not work well. The code has been archived here for reference.

**State Variables:**
```typescript
const [showMapView, setShowMapView] = useState(false);
const [selectedMapDay, setSelectedMapDay] = useState<string | null>(null);
const [showMapDayDropdown, setShowMapDayDropdown] = useState(false);
const [mapLoadError, setMapLoadError] = useState(false);
```

**Key Functionality:**
- Displayed trip photos and activities on a map using OpenStreetMap tiles
- Filtered markers by day
- Showed photo thumbnails and activity markers
- Calculated map bounds and zoom levels dynamically
- Positioned markers on static map image

**Removed Code Location:** Lines ~3176-3516 in TripStorySpark.tsx (renderMapViewModal function)

### Direct Camera Capture (Removed)
Direct camera capture was removed in favor of date-based photo search from the device library.

**Removed Functionality:**
- `ImagePicker.launchCameraAsync()` - Direct camera capture
- `renderPhotoCaptureModal()` - Camera capture modal
- `showPhotoCapture` state and related UI
- Camera permission handling

**Current Approach:** Users now add photos by searching their device library by date, which is more reliable and doesn't require camera permissions.
