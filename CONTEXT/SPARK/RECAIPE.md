# RecAIpe Spark - Implementation Plan

## Overview
AI-powered recipe generator using Gemini API with shopping list and step-by-step cooking modes.

## Data Structures

### Recipe Interface
```typescript
interface Recipe {
  id: string;
  title: string;
  originalPrompt: string;  // User's initial description
  ingredients: string;     // Plain text, line-separated
  instructions: string;    // Plain text, paragraph-separated
  createdAt: string;       // ISO timestamp
  shoppingChecked: Set<number>;  // Indices of checked shopping ingredients
  cookingChecked: Set<number>;   // Indices of completed instruction steps
}

interface RecAIpeData {
  recipes: Recipe[];
}
```

## State Management

### Main States
- `recipes: Recipe[]` - All saved recipes
- `selectedRecipe: Recipe | null` - Currently viewing/editing
- `mode: 'list' | 'create' | 'view' | 'shop' | 'cook'`
- `createPrompt: string` - User input for generation
- `isGenerating: boolean` - AI loading state
- `generatedRecipe: Partial<Recipe> | null` - Temp storage before saving
- `cookingPage: number` - Current instruction page (0-indexed)

## UI Flow & Screens

### 1. Home Screen (mode: 'list')
**Layout:**
- Header: "🍳 RecAIpe" + Add button (+)
- Recipe list: Card for each recipe showing title
- Tap card → View mode
- Empty state: "No recipes yet"

### 2. Create Screen (mode: 'create')
**Layout:**
- Large text input: "Describe your recipe..."
- Placeholder: "e.g., oatmeal cookies - no nuts, hint of vanilla!"
- Generate button (disabled if empty)
- Cancel button → back to list

**Flow:**
1. User types description → tap Generate
2. Call Gemini API with prompt
3. Show loading spinner
4. Parse response → show preview

### 3. Preview Screen (after generation)
**Layout:**
- Recipe title (editable TextInput)
- Ingredients section (bullet list)
- Instructions section (paragraphs)
- Three buttons:
  - "Edit Recipe" → Edit mode
  - "Refine Recipe" → Refine mode
  - "Save & Make" → Save recipe + go to shopping

### 4. Edit Recipe Screen
**Layout:**
- Title input
- Large text area with full recipe text (plain text format):
  ```
  Ingredients
  1/4 cup sugar
  2 tablespoons butter
  
  Instructions
  Add the butter (2 tablespoons)...
  ```
- Save button
- Pattern: Like MinuteMinderSpark edit mode

### 5. Refine Recipe Screen
**Layout:**
- Show current recipe (read-only)
- Text input: "What would you like to change?"
- Examples: "Make it spicier", "Use less salt", "Add more vegetables"
- Refine button → calls AI with refinement prompt
- Cancel button

### 6. View Recipe Screen (mode: 'view')
**Layout:**
- Recipe title
- Ingredients (bulleted list)
- Instructions (paragraphs)
- Buttons:
  - "Edit Recipe"
  - "Refine Recipe"  
  - "Make Recipe" → Shopping mode
  - "Share Recipe"
  - "Delete Recipe" (destructive)

### 7. Shopping Screen (mode: 'shop')
**Layout:**
- Header: Recipe title
- Ingredient checkboxes (like PackingListSpark)
- Each ingredient as text with checkbox
- Bottom button: "Finish Shopping" → Cooking mode + uncheck all

**State:**
- Checked items persisted in recipe.shoppingChecked
- Leaving and returning preserves state

### 8. Cooking Screen (mode: 'cook')
**Layout:**
- Paginated instructions (like GolfWisdomSpark)
- One paragraph per page with checkbox
- Checkbox + instruction text (strikethrough when checked)
- Left/right arrows for navigation
- Page indicator: "Step 2 of 5"
- "Finish Recipe" button → Clears all cooking checkmarks + back to View mode
- Exit button → back to View mode (preserves checkmarks)

**State:**
- Checked steps persisted in recipe.cookingChecked
- Leaving and returning preserves checkbox state
- "Finish Recipe" clears all cookmarks (recipe.cookingChecked = new Set())
- Strikethrough styling for completed steps

---

## AI Integration

### Gemini API Setup

**Environment Variable:**
```
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

**API Endpoint:**
```
POST https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent
```

**Response Format:** Plain text (not JSON) - will be parsed into sections

### Prompt Templates

#### Initial Generation Prompt
```typescript
const GENERATE_PROMPT = `You are a professional chef creating recipes. Generate a recipe based on this description:

"${userInput}"

IMPORTANT FORMATTING RULES:
1. The output must consist only of an 'Ingredients' section and an 'Instructions' section, with no introduction or concluding remarks.
2. In the 'Ingredients' section, each ingredient must be on a single line.
3. In the 'Instructions' section, the first time an ingredient is mentioned, include its quantity in parentheses immediately following the ingredient name.
4. Write instructions as clear paragraphs, with each major step as a separate paragraph.
5. Include cooking temperature and time where applicable.
6. Start with a recipe title on the first line.

Example format:

Chocolate Chip Oatmeal Cookies

Ingredients
1 cup (2 sticks) unsalted butter, softened
1 cup packed brown sugar
1/2 cup granulated sugar

Instructions
Preheat and Prepare: Preheat your oven to 375°F (190°C). Line two baking sheets with parchment paper.

Cream Butter and Sugars: In a large bowl, cream together the unsalted butter, softened (1 cup/2 sticks), the packed brown sugar (1 cup), and the granulated sugar (1/2 cup) using an electric mixer until light and fluffy.

Generate the recipe now:`;
```

#### Refinement Prompt
```typescript
const REFINE_PROMPT = `You are refining an existing recipe. Here is the current recipe:

${currentRecipe}

The user wants this change: "${refinementRequest}"

Generate the updated recipe using the SAME format as before. Keep the same structure and only modify what's needed for the requested change.`;
```

### Response Parsing
```typescript
function parseRecipe(aiResponse: string): { title: string, ingredients: string, instructions: string } {
  // Split by "Ingredients" and "Instructions" section headers
  // First line is title
  // Extract text between markers
  // Return structured data
}
```

---

## File Structure

```
RecAIpeSpark.tsx          # Main component
├── Interfaces           # Recipe, RecAIpeData types
├── State hooks         # useState declarations
├── AI functions        # generateRecipe(), refineRecipe()
├── Helper functions    # parseRecipe(), formatForDisplay()
├── Render functions    # renderList(), renderCreate(), etc.
└── Styles             # StyleSheet
```

---

## Starter Recipe (Included with New Installs)

```typescript
const STARTER_RECIPE: Recipe = {
  id: 'starter-1',
  title: 'Chocolate Chip Oatmeal Cookies',
  originalPrompt: 'Classic chocolate chip oatmeal cookies',
  ingredients: `1 cup (2 sticks) unsalted butter, softened
1 cup packed brown sugar
1/2 cup granulated sugar
2 large eggs
2 teaspoons pure vanilla extract
1 1/2 cups all-purpose flour
1 teaspoon baking soda
1 teaspoon ground cinnamon
1/2 teaspoon salt
3 cups old-fashioned rolled oats
1 cup semi-sweet chocolate chips`,
  instructions: `Preheat and Prepare: Preheat your oven to 375°F (190°C). Line two baking sheets with parchment paper.

Cream Butter and Sugars: In a large bowl, cream together the unsalted butter, softened (1 cup/2 sticks), the packed brown sugar (1 cup), and the granulated sugar (1/2 cup) using an electric mixer until light and fluffy.

Add Wet Ingredients: Beat in the large eggs (2), one at a time, followed by the pure vanilla extract (2 teaspoons).

Combine Dry Ingredients: In a separate medium bowl, whisk together the all-purpose flour (1 1/2 cups), the baking soda (1 teaspoon), the ground cinnamon (1 teaspoon), and the salt (1/2 teaspoon).

Mix Together: Gradually add the dry ingredient mixture to the wet ingredient mixture, mixing on low speed until just combined.

Fold in Add-ins: Stir in the old-fashioned rolled oats (3 cups) and the semi-sweet chocolate chips (1 cup) until evenly distributed throughout the dough.

Scoop and Bake: Drop rounded spoonfuls of dough onto the prepared baking sheets.

Bake: Bake in the preheated oven for 8 to 10 minutes, or until the edges are golden brown.

Cool: Let the cookies cool on the baking sheets for 5 minutes before transferring them to a wire rack to cool completely.`,
  createdAt: new Date().toISOString(),
  shoppingChecked: new Set(),
  cookingChecked: new Set()
};
```

---

## Component Implementation Order

### Phase 1: Basic Structure (MVP)
1. Create RecAIpeSpark.tsx with basic layout
2. Implement List view with starter recipe
3. Implement Create view with text input
4. Add SparkStore persistence

### Phase 2: AI Integration
5. Set up Gemini API service
6. Implement generateRecipe() function
7. Add prompt templates
8. Implement text parsing (not JSON)
9. Test generation flow

### Phase 3: Recipe Management
10. Implement View recipe screen
11. Add Edit recipe mode (like MinuteMinderSpark)
12. Implement Refine mode
13. Add Delete functionality

### Phase 4: Shopping & Cooking
14. Implement Shopping mode (like PackingListSpark)
15. Add checkbox state persistence
16. Implement Cooking mode (like GolfWisdomSpark)
17. Add page navigation

### Phase 5: Settings & Polish
18. Add Share recipe functionality
19. Add Settings page
20. Add loading states and error handling
21. Polish UI and test flows

---

## Settings Page

**Content:**
- SettingsHeader with 🍳 icon
- Info section: "Powered by Gemini AI"
- Share section: Export/import recipes
- SettingsFeedbackSection
- Done button

---

## Technical Notes

### API Key Security
- Store in .env: `EXPO_PUBLIC_GEMINI_API_KEY`
- Access via: `process.env.EXPO_PUBLIC_GEMINI_API_KEY`
- Never commit to git

### Gemini API Call
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  }
);
const data = await response.json();
const recipeText = data.candidates[0].content.parts[0].text;
```

### State Persistence
- Save to SparkStore on every recipe change
- Load on component mount
- Include starter recipe on first load
- Key: `'recaipe'`

---

## User Flow Diagram

```
List View (with starter recipe)
  ├─→ Tap + → Create View
  │              ├─→ Enter prompt → Generate
  │              └─→ Preview → Edit/Refine/Save
  │
  └─→ Tap recipe → View Recipe
                      ├─→ Edit → Edit mode
                      ├─→ Refine → Refine mode
                      ├─→ Make → Shopping mode
                      │            └─→ Finish → Cooking mode
                      └─→ Delete → Confirm → List View
```

---

## Recipe Text Format (User Editable)

When editing recipes, users will see and edit text in this format:

```
Chocolate Chip Oatmeal Cookies

Ingredients
1 cup (2 sticks) unsalted butter, softened
1 cup packed brown sugar
1/2 cup granulated sugar

Instructions
Preheat your oven to 375°F (190°C).

Cream together the butter (1 cup), brown sugar (1 cup), and granulated sugar (1/2 cup).
```

This plain text format is:
- Easy to read and edit
- Simple to parse programmatically
- Matches the AI output format
- No JSON or complex markup needed

Implementation Plan: Contextual Recipe Timers

1. Data & Prompt Engineering
To enable the app to "know" when a timer is needed, we must update the AI's output format.

System Prompt Update: Modify the GeminiService instructions to wrap time durations in a specific syntax.

Instruction: "Identify any durations (e.g., 'bake for 20 minutes', 'let rest for 1 hour') and wrap them in double curly braces like this: {{20 minutes}}."

Regex Pattern: The app will use const timerRegex = /\{\{(.*?)\}\}/g; to scan instruction text during rendering.

2. Component Architecture
We will move away from a static text display in Cook Mode to a dynamic row that can host a timer state.

A. The InstructionStep Component
A new sub-component that handles:

Text Parsing: Separating the instruction text from the {{time}} variable.

State Management: Tracking if a timer is active for this specific step.

Local Countdown: Using a useEffect interval to decrement time.

B. The TimerUI Element
A compact, inline UI that appears directly under the instruction text:

Idle State: A button labeled "Start [Time] Timer".

Active State: Shows MM:SS remaining with a progress bar.

Controls: "Pause", "+1 Min", and "Cancel".

Finished State: Pulsing highlight and "Dismiss" button.

3. New Features & Logic
Multiple Timer Support
Each timer is encapsulated within its own InstructionStep component.

Users can start a timer for "Bake" and simultaneously start a timer for "Prep Side Dish" without them interfering.

Timers will persist even if the user scrolls, as the state is held in the component tree of the ScrollView.

Alarm & Sound Logic
Sound Integration: Use react-native-sound or expo-av to trigger a "Ding" or "Chime" upon completion.

Settings Toggle: Add a new boolean to the Spark Settings: silentAlarms.

true: Uses Haptic Feedback and a screen flash only.

false: Plays the chime + Haptics.

Manual Overrides
An "+1 Min" button will be available on any active timer. This updates the local timeLeft state by 60 seconds without resetting the interval.

4. Proposed Updates to Code Structure
Updated Schema
Add a settings object to the RecAIpeData interface:

TypeScript
interface RecAIpeData {
    recipes: Recipe[];
    settings: {
        silentAlarms: boolean;
    };
}
Render Logic Update
In the Cook Mode section of RecAIpeSpark.tsx, the mapping logic will be updated:

TypeScript
{instructions.map((instruction, i) => (
    <View key={i}>
        <InstructionStep 
            text={instruction} 
            isChecked={selectedRecipe.cookingChecked.includes(i)}
            onToggle={() => toggleStep(i)}
            isSilent={data.settings.silentAlarms}
        />
    </View>
))}
5. Next Steps for Antigravity
Refactor Prompt: Update the systemPrompt in RecAIpeSpark.tsx to include the {{duration}} requirement.

Build InstructionStep: Create the component with internal useState for the countdown.

Add Assets: Include a short, high-quality "Timer Finished" audio file.

Update Settings UI: Add the "Silent Alarms" toggle to the existing SettingsScreen block.
