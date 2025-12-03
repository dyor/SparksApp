# Trip Survey Plan

## Overview
Trip Survey 🧭 is a travel planning spark designed to help groups collaboratively decide on trip options. Users create a trip with various options (dates, locations, packages), invite people to respond via text, collect responses, and then finalize the trip based on the group's preferences.

## Core Features

### 1. Trip Creation
- Create a new trip with a name
- Add trip options: possible dates, blackout dates, locations, and packages
- Add people/participants to the trip
- Share options with participants via text message
- Collect and parse responses from participants
- Display responses in a matrix format for easy comparison
- Finalize trip with selected options

### 2. Trip Options

#### Possible Dates
- One or more date ranges that might work for the trip
- Format: Start date to End date
- Multiple ranges can be added (e.g., "June 1-7" and "July 15-22")

#### Blackout Dates
- Zero or more date ranges that will NOT work
- Format: Start date to End date
- Used to exclude unavailable dates

#### Locations
- One or more location options
- Each location is a text string (e.g., "Paris, France", "Tokyo, Japan")
- At least one location must be specified

#### Packages
- Zero or more package options
- Each package includes:
  - Name (e.g., "Caribbean Cruise", "All-Inclusive Resort")
  - Price (number)
  - Number of days (number)
- Examples: cruises, all-inclusive resorts, tour packages

#### People
- List of participant names
- Each person can respond to the survey
- Responses are tracked per person

## User Flow

### Step 1: Create Trip
1. User opens Trip Survey spark
2. Clicks "Create New Trip" button
3. Enters trip name
4. Saves trip

### Step 2: Add Options
1. User navigates to trip details
2. Adds possible date ranges (one or more)
3. Adds blackout date ranges (optional)
4. Adds location options (one or more)
5. Adds package options (optional, with price and days)

### Step 3: Add People
1. User adds participant names to the trip
2. Names are stored in the trip's people list

### Step 4: Share Options
1. User clicks "Share Survey" button
2. System generates a formatted text message with all options
3. User can send this via their device's messaging app
4. Text format should be clear and easy to parse

### Step 5: Collect Responses
1. Participants respond via text with their preferences
2. User clicks "Add Response" button on Trip Details screen
3. User selects which participant the response is for
4. User pastes the response text
5. System parses the response and extracts answers
6. Answers are stored in local storage associated with that participant

### Step 6: View Responses Matrix
1. User views the Trip Planning page
2. Matrix display:
   - **Rows (left side)**: Each option (dates, locations, packages)
   - **Columns (top)**: Each participant name
   - **Cells**: The participant's response for that option
3. Easy visual comparison of all responses

### Step 7: Finalize Trip
1. User clicks "Finalize Trip" button
2. User selects:
   - Final start date (from possible dates)
   - Final end date (from possible dates)
   - Final location(s) (from location options)
   - Final package(s) (if any, from package options)
3. Trip is marked as finalized
4. Finalized trip details are displayed

## Data Structure

### Trip
```typescript
interface Trip {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isFinalized: boolean;
  
  // Options
  possibleDates: DateRange[];
  blackoutDates: DateRange[];
  locations: string[];
  packages: Package[];
  people: string[]; // Participant names
  
  // Finalized selections (set during finalization)
  finalDate?: DateRange;
  finalLocations?: string[];
  finalPackages?: string[]; // Package IDs
}

interface DateRange {
  id: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

interface Package {
  id: string;
  name: string;
  price: number;
  days: number;
}

interface TripResponse {
  id: string;
  tripId: string;
  participantName: string;
  rawText: string; // Original response text
  parsedAnswers: ParsedAnswer[];
  receivedAt: string;
}

interface ParsedAnswer {
  optionType: 'date' | 'location' | 'package';
  optionId: string; // ID of the date range, location, or package
  answer: string; // User's response (e.g., "yes", "no", "maybe", or specific selection)
}
```

### Storage
- Trips stored in persistent data using `useSparkStore` (spark ID: `trip-survey`)
- Each trip contains all its options, people, and responses
- Responses are stored per trip, per participant

## UI Components

### Trip List View
- List of all trips
- Each trip shows:
  - Trip name
  - Number of participants
  - Number of responses received
  - Status (Planning / Finalized)
- "Create New Trip" button
- Tap trip to view details

### Trip Details View
- Trip name (editable)
- Sections for:
  - Possible Dates (add/edit/remove date ranges)
  - Blackout Dates (add/edit/remove date ranges)
  - Locations (add/edit/remove locations)
  - Packages (add/edit/remove packages with price/days)
  - People (add/edit/remove participant names)
- "Share Survey" button (generates and shares text)
- "Add Response" button (opens response input modal)
- "View Responses Matrix" button (navigates to matrix view)
- "Finalize Trip" button (opens finalization modal)

### Add Response Modal
- Dropdown/selector for participant name
- Large text input for pasting response text
- "Parse and Save" button
- Shows preview of parsed answers before saving

### Response Matrix View
- Table/grid layout:
  - Left column: Option labels (grouped by type: Dates, Locations, Packages)
  - Top row: Participant names
  - Cells: Each participant's answer for that option
- Scrollable horizontally and vertically
- Visual indicators for responses (colors/icons for yes/no/maybe)

### Finalize Trip Modal
- Date selector (from possible dates)
- Location selector (multi-select from location options)
- Package selector (multi-select from package options, optional)
- "Finalize" button
- Shows summary before finalizing

### Share Survey View
- Formatted text preview of all options
- "Copy to Clipboard" button
- "Share via Text" button (opens device share sheet)
- Text format should be:
  ```
  Trip Survey: [Trip Name]
  
  Possible Dates:
  - [Date Range 1]
  - [Date Range 2]
  
  Locations:
  - [Location 1]
  - [Location 2]
  
  Packages:
  - [Package 1] - $[Price] - [Days] days
  - [Package 2] - $[Price] - [Days] days
  
  Please respond with your preferences for each above option by adding a yes, no, or maybe at the end of each line - do not change the value or add values - just add yes, no, or maybe to each option.
  
  If you have any Blackout Dates that you cannot travel, list them below:
  - None
  ```

## Response Parsing Logic

### Parsing Strategy
The system needs to parse free-form text responses and match them to options. Strategies:

1. **Keyword Matching**: Look for keywords like "yes", "no", "maybe"
2. **Option Name Matching**: When we specify Add Response, user will select the person from a dropdown. 
3. **Date Parsing**: The only date we are extracting is blackout dates (e.g., otherwise the recipient just says yes no or maybe)
4. **Packing Matching**: Users can just select from the options provided using yes, no, or maybe

### Response Format Suggestions
When sharing, suggest participants respond in a format like:
```
Dates: 
June 1-7 yes
July 1-15 no
Locations: 
Paris yes
Tokyo no
Packages: 
Caribbean Cruise - $500 - 5 days yes
Blackout Dates
I am committed to July 4
```

### Parsing Rules
- For dates: We are only accepting yes no or maybe for possible dates, and blackout dates is string (not date) type. 
- For locations: Match location names (case-insensitive, partial matching) - ideally the recipient will not change the text that the user sent them. 
- For packages: Match package names as mentioned (if user changes it, no match)
- Store raw text for manual review/correction if needed

## Technical Considerations

### Date Handling
- Use ISO date strings for storage - yes - the only person storing dates is the user (not recipient) so we can have structured date input validation
- Display dates in user-friendly format
- Handle timezone considerations
- Validate date ranges (start < end)

### Text Sharing
- Use React Native's `Linking` API or `expo-sharing` for sharing
- Format text clearly for easy reading
- Include instructions for participants

### Response Storage
- Store both raw text and parsed answers
- Allow manual correction of parsed answers
- Track which responses have been received

### Matrix Display
- Use `FlatList` or `ScrollView` for scrollable matrix
- Consider using a table library or custom grid component
- Handle long option names and participant names
- Responsive to different screen sizes

### State Management
- Use `useSparkStore` for persistent storage
- Local component state for UI interactions
- Optimistic updates for better UX

## Future Enhancements (Optional)
- Email sharing in addition to text
- Automatic response parsing via AI/NLP
- Response statistics (e.g., "5 people prefer Paris")
- Export trip details to PDF
- Integration with calendar apps
- Reminder notifications for pending responses
- Group chat integration
- Real-time response updates (if using backend)

## Settings
- Standard settings page with feedback section
- Option to clear all trips
- Export/import trips data

