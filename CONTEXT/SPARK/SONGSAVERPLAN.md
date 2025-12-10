# Song Saver Spark - Implementation Plan

## Overview
Song Saver is a Spotify track organizer that allows users to save and categorize their favorite songs for quick access. It's nearly identical to Short Saver but adapted for Spotify URLs instead of YouTube Shorts.

## Reference Implementation
Based on: `src/sparks/ShortSaverSpark.tsx`

## Core Features

### 1. Save Spotify Tracks
- Accept Spotify track URLs in format: `https://open.spotify.com/track/{track-id}?si={share-id}`
- Parse track ID from URL
- Support category prefix format: `Category: https://open.spotify.com/track/...`
- Store tracks with metadata (title, category, added date)

### 2. Category Organization
- Same category system as Short Saver
- Category pills for filtering
- Tap category pill to populate input field
- "All" filter to show all tracks
- Auto-categorize as "Uncategorized" if no category provided

### 3. Track Display
- Grid layout (2 columns, like Short Saver)
- Album art thumbnails
- Category pill overlay (bottom)
- Optional name pill overlay (top)
- Long-press to edit/delete

### 4. Playback
- Tap track to open in Spotify app
- Fallback to web player if app not installed
- Deep link format: `spotify:track:{track-id}`
- Web fallback: `https://open.spotify.com/track/{track-id}`

### 5. Track Management
- Long-press opens edit modal
- Edit: name, category, URL
- Delete with confirmation
- Live preview of changes

## Technical Implementation

### Data Structure
```typescript
interface SpotifyTrack {
  id: string;           // Spotify track ID
  url: string;          // Full Spotify URL
  title: string;        // Track title (optional, for display)
  albumArt?: string;    // Album artwork URL
  addedAt: number;      // Timestamp
  category?: string;    // User-defined category
  name?: string;        // User-defined name/label
}
```

### URL Parsing
Parse Spotify URLs to extract track ID:
- Pattern: `/track/([a-zA-Z0-9]+)`
- Example: `https://open.spotify.com/track/3VP78k3jzm0Q5OM08E383k?si=8d09a114e636472f`
- Extract: `3VP78k3jzm0Q5OM08E383k`

### Album Art
Spotify doesn't provide direct thumbnail URLs like YouTube. Options:
1. **Use Spotify Web API** (requires auth) - NOT RECOMMENDED for this use case
2. **Use placeholder** - Simple colored background with 🎵 emoji
3. **Embed preview** - Use Spotify's embed player (heavier, but shows album art)

**Recommendation**: Start with placeholder, optionally add embed preview later.

### Playback Implementation
```typescript
const handlePlayTrack = (track: SpotifyTrack) => {
  const spotifyAppUrl = `spotify:track:${track.id}`;
  const spotifyWebUrl = `https://open.spotify.com/track/${track.id}`;
  
  Linking.canOpenURL(spotifyAppUrl).then((supported) => {
    if (supported) {
      Linking.openURL(spotifyAppUrl);
    } else {
      Linking.openURL(spotifyWebUrl);
    }
  }).catch(() => {
    Linking.openURL(spotifyWebUrl);
  });
};
```

## File Structure

### New Files
- `src/sparks/SongSaverSpark.tsx` - Main component (clone of ShortSaverSpark)

### Modified Files
- `src/components/SparkRegistry.tsx` - Add Song Saver entry
- `src/types/spark.ts` - No changes needed (uses existing interfaces)

## Implementation Steps

### Phase 1: Core Functionality
1. Clone `ShortSaverSpark.tsx` to `SongSaverSpark.tsx`
2. Update component name and references
3. Change data structure from `ShortVideo` to `SpotifyTrack`
4. Update URL parsing for Spotify format
5. Update playback to use Spotify deep links
6. Replace YouTube thumbnails with placeholder/emoji
7. Update text/labels (Short → Song, YouTube → Spotify)
8. Update storage key (`song-saver` instead of `short-saver`)

### Phase 2: UI Polish
1. Update icon to 🎵 or 🎶
2. Update placeholder thumbnail styling
3. Test category system
4. Test edit/delete functionality
5. Verify persistence

### Phase 3: Registry & Testing
1. Add to SparkRegistry with metadata
2. Test on iOS simulator
3. Test Spotify app integration
4. Test web fallback
5. Verify all CRUD operations

## Questions to Resolve

### 1. Embed Player Option?
Should we support Spotify's iframe embed player as an alternative to opening the app?

**Pros:**
- Shows album art automatically
- In-app playback
- Rich preview

**Cons:**
- Heavier/slower
- Takes up more space
- Requires webview

**Recommendation**: Start without embed, add as optional feature later if desired.

### 2. Track Metadata
Should we try to fetch track title/artist from Spotify?

**Options:**
- Use Spotify Web API (requires auth setup)
- Let users manually name tracks
- Use track ID as fallback title

**Recommendation**: Manual naming only (like Short Saver), no API calls.

### 3. Default Track
Should we include a default example track like Short Saver does?

**Recommendation**: Yes, include one popular track as example (e.g., a classic hit).

## Differences from Short Saver

| Feature | Short Saver | Song Saver |
|---------|-------------|------------|
| Platform | YouTube | Spotify |
| URL Format | `youtube.com/shorts/{id}` | `spotify.com/track/{id}` |
| Thumbnail | YouTube API | Placeholder/Emoji |
| Deep Link | `vnd.youtube://` | `spotify:track:` |
| Aspect Ratio | 9:16 (vertical) | 1:1 (square album) |
| Icon | 🎬 | 🎵 |

## Testing Checklist

- [ ] Add track with category
- [ ] Add track without category
- [ ] Filter by category
- [ ] Tap category pill to populate input
- [ ] Play track (opens Spotify app)
- [ ] Play track (web fallback)
- [ ] Long-press to edit
- [ ] Edit track name
- [ ] Edit track category
- [ ] Edit track URL
- [ ] Delete track
- [ ] Persistence across app restarts
- [ ] Settings page
- [ ] Feedback submission

## Future Enhancements

1. **Playlist Support**: Save entire Spotify playlists
2. **Album Art**: Integrate Spotify API for real album artwork
3. **Embed Player**: Optional in-app playback
4. **Shuffle**: Shuffle within categories
5. **Search**: Search saved tracks by name/category
6. **Export**: Export track list as text/JSON

## Notes

- Keep implementation as close to Short Saver as possible for consistency
- Use same UI patterns and interactions
- Maintain same settings structure
- Follow existing code style and patterns
