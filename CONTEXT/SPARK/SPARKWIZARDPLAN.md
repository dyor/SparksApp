# Spark Wizard Plan

## Overview
**Spark Wizard** is a meta-spark that allows users to submit ideas for new Sparks to be built. It acts as a product management interface where users define their vision, target customers, and potential pricing for their ideal Spark. Submitted ideas are saved to Firebase for review and potential implementation.

## Journey Flow & Narrative

The Spark Wizard journey uses a **wizard creating a dragon** theme to guide users through submitting their Spark idea. Each stage represents the wizard helping to bring their Spark to life.

| Page | Icon | Stage Name | Function | On-Screen Text |
|------|------|------------|----------|----------------|
| 0 | 🧙‍♂️ | Meet the Wizard | Introduction | "You are going to tell me about your Spark, and I will use my spells and potions to bring it to life before your eyes." |
| 1 | 🥚 | Dragon Egg | Spark Name | "Here is your Spark - so small, so much work to do - but do not worry about that. Let's just start by giving it a name." |
| 2 | 🐉 | Glorious Spark | Description | "Tell me what [spark name] will do when it is fully grown - what powers will it have?" |
| 3 | 🏰 | Loyal Villagers | Customer | "Who will this Spark help when it is fully grown?" |
| 4 | 💰 | [spark name] Riches | Customer Payment | "Will your Spark help people out of the kindness of your heart, or will the loyal villagers shower you with gold in honor of this Spark?" |
| 5 | 🪙 | Wizard's Gold | Creation Payment | "Would you be able to help an old wizard out with some gold? I could give your Spark some super powers if you do?" |
| 6 | 🍺 | Tavern | Email | "When the Spark is ready, where shall I find you?" |
| 7 | ✨ | Final Checkpoint | Review | "Let me review the magical incantations we have prepared for your Spark..." |
| 8 | 🎉 | Success! | Confirmation | "Your Spark has been summoned! The ancient magic flows through the lands..." |

### Navigation Flow
1. **Page 0** → User clicks "Let's Begin My Quest" → **Page 1**
2. **Pages 1-6** → User fills out form fields, clicks "Continue" → Advances to next page
3. **Page 7** → User reviews and clicks "Summon My Spark!" → **Page 8**
4. **Page 8** → User clicks "Return to Home" → Returns to Spark Wizard home

### Validation Requirements
- **Spark Name**: Minimum 3 characters
- **Description**: Minimum 50 characters
- **Customer**: Minimum 20 characters
- **Customer Payment**: Minimum 2 characters
- **Creation Payment**: Must select from dropdown (Nothing, About $100, Maybe $500-$1000, Over $1000)
- **Email**: Must be valid email format (e.g., user@example.com)

## Purpose
- Empower users to propose new Spark ideas
- Collect structured product requirements
- Validate market demand and willingness to pay
- Create a feedback loop for product development

## User Flow

### Page 0: Meet the Wizard (Introduction)
**Screen Text:**
- **Wizard Icon**: 🧙‍♂️
- **Title**: "Greetings, Traveler!"
- **Main Message**: "I am the Spark Wizard, and you have come to me with a vision. You are going to tell me about your Spark, and I will use my spells and potions to bring it to life before your eyes."
- **Subtitle**: "Together, we will summon a magical Spark that will solve real problems for real people."

**Buttons:**
- **Primary**: "Let's Begin My Quest" (enabled)
- **Secondary**: "Close Spark Wizard" (enabled)

---

### Page 1: Dragon Egg (Spark Name)
**Screen Text:**
- **Egg Icon**: 🥚
- **Title**: "Behold Your Dragon Egg"
- **Main Message**: "Here is your Spark - so small, so much work to do - but do not worry about that. Let's just start by giving it a name."
- **Subtitle**: "Every great dragon needs a name. What shall we call yours?"

**Input Field:**
- Placeholder: "e.g., Restaurant Finder, Study Timer, Habit Tracker"
- Validation: Required, minimum 3 characters

**Navigation:**
- **Back**: "Previous" (always enabled)
- **Next**: "Continue" (disabled until valid input shows as "Continue...")

---

### Page 2: Glorious Spark (Description)
**Screen Text:**
- **Dragon Icon**: 🐉
- **Title**: "Envision Your Glorious Spark"
- **Main Message**: "Tell me what [spark name] will do when it is fully grown - what powers will it have?"
- **Subtitle**: "Describe the magic your Spark will wield. What problems will it solve? How will it make lives better?"

**Input Field:**
- Placeholder: "Describe the powers and abilities of your Spark..."
- Multiline: true
- Validation: Required, minimum 50 characters
- Show character counter (e.g., "47/50 characters")

**Navigation:**
- **Back**: "Previous" (always enabled)
- **Next**: "Continue" (disabled until valid input)

---

### Page 3: Loyal Villagers (Customer)
**Screen Text:**
- **Castle Icon**: 🏰
- **Title**: "Who Will Your Spark Serve?"
- **Main Message**: "Who will this Spark help when it is fully grown?"
- **Subtitle**: "Every Spark needs people who will benefit from its magic. Describe your loyal villagers."

**Input Field:**
- Placeholder: "e.g., College students studying late at night, Busy parents juggling schedules, Athletes tracking performance"
- Multiline: true
- Validation: Required, minimum 20 characters
- Show character counter

**Navigation:**
- **Back**: "Previous" (always enabled)
- **Next**: "Continue" (disabled until valid input)

---

### Page 4: [Spark Name] Riches (Customer Payment)
**Screen Text:**
- **Gold Coin Icon**: 💰
- **Title**: "The Economics of Your Spark"
- **Main Message**: "Will your Spark help people out of the kindness of your heart, or will the loyal villagers shower you with gold in honor of this Spark?"
- **Subtitle**: "Consider how [spark name] will sustain itself in the marketplace."

**Input Field:**
- Placeholder: "e.g., Yes, villagers would pay $2.99 for this Spark, or No, this should be free for all"
- Multiline: true
- Validation: Required, minimum 2 characters
- Show character counter

**Navigation:**
- **Back**: "Previous" (always enabled)
- **Next**: "Continue" (disabled until valid input)

---

### Page 5: Wizard's Gold (Creation Payment)
**Screen Text:**
- **Gold Bar Icon**: 🪙
- **Title**: "An Old Wizard Needs His Gold"
- **Main Message**: "Would you be able to help an old wizard out with some gold? I could give your Spark some super powers if you do?"
- **Subtitle**: "The more gold you provide, the more magnificent your Spark can become."

**Dropdown Options:**
- "Nothing"
- "About $100"
- "Maybe $500-$1000"
- "Over $1000"
- Default: "Nothing" (preselected)

**Validation:** Required

**Navigation:**
- **Back**: "Previous" (always enabled)
- **Next**: "Continue" (disabled until selection made)

---

### Page 6: Tavern (Email)
**Screen Text:**
- **Tavern/Mug Icon**: 🍺
- **Title**: "Where Shall I Find You?"
- **Main Message**: "When the Spark is ready, where shall I find you?"
- **Subtitle**: "I need a way to send you a scroll when your Spark is summoned."

**Input Field:**
- Placeholder: "your.email@example.com"
- Keyboard type: email
- Validation: Required, valid email format

**Navigation:**
- **Back**: "Previous" (always enabled)
- **Next**: "Continue to Review" (disabled until valid email)

---

### Page 7: Final Checkpoint (Review)
**Screen Text:**
- **Star Icon**: ✨
- **Title**: "Review the Magical Incantations"
- **Main Message**: "Let me review the magical incantations we have prepared for your Spark..."

**Display Card:**
- **Spark Name**: [value]
- **Description**: [value]
- **Who Will It Help**: [value]
- **Payment Model**: [value]
- **Your Contribution**: [value]
- **Where to Reach You**: [value]

**Navigation:**
- **Back**: "Edit" (always enabled)
- **Submit**: "Summon My Spark!" (always enabled)

---

### Page 8: Success! (Confirmation)
**Screen Text:**
- **Celebration Icon**: 🎉
- **Title**: "Your Spark Has Been Summoned!"
- **Main Message**: "Your Spark has been summoned! The ancient magic flows through the lands. I have cast my spells and your Spark idea is now in the hands of the great engineers."
- **Subtitle**: "We will review your Spark and get back to you at [email]. Thank you for choosing the Spark Wizard!"

**Button:**
- **Done**: "Return to Home" (returns to Spark Wizard home)

## Technical Implementation

### Data Model (Firebase)
```typescript
interface SparkSubmission {
  id: string; // Auto-generated
  userId: string; // Current user's device ID
  timestamp: number; // Submission time
  sparkName: string;
  description: string;
  customer: string;
  customerPayment: string;
  creationPayment: string; // "Nothing" | "About $100" | "Maybe $500-$1000" | "Over $1000"
  email: string;
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'built';
  reviewNotes?: string;
}
```

### Firebase Collection
- Collection: `sparkSubmissions`
- Security: Authenticated users can create, read their own
- Admin can read all, update status

### State Management
```typescript
interface SparkSparkState {
  currentPage: number;
  formData: {
    sparkName: string;
    description: string;
    customer: string;
    customerPayment: string;
    creationPayment: string;
    email: string;
  };
  submitting: boolean;
  submitted: boolean;
}
```

### Navigation Logic
- `currentPage` (1-9) determines which screen to show
- Back button: `currentPage - 1` (minimum 1)
- Next button: `currentPage + 1` (maximum 9)
- Submit button triggers Firebase save and moves to confirmation

### Validation Rules
1. **Spark Name**: min 3 chars, required
2. **Description**: min 50 chars, required
3. **Customer**: min 20 chars, required
4. **Customer Payment**: min 10 chars, required
5. **Creation Payment**: Required, must be one of the dropdown options
6. **Email**: Valid email format, required

## Animations
- **Page Transitions**: Fade in/out (300ms)
- **Card Entrance**: Slide up from bottom with slight bounce
- **Button States**: Smooth opacity transitions on enabled/disabled
- **Success Confirmation**: Scale + fade animation with checkmark icon

## UI Components

### Card Component
```typescript
<View style={styles.card}>
  <Text style={styles.cardTitle}>{title}</Text>
  <Text style={styles.cardDescription}>{description}</Text>
  {children}
</View>
```

### Navigation Bar
```typescript
<View style={styles.navigationBar}>
  <TouchableOpacity 
    style={[styles.navButton, !canGoBack && styles.disabled]}
    onPress={handleBack}
    disabled={!canGoBack}
  >
    <Text style={styles.navButtonText}>Previous</Text>
  </TouchableOpacity>
  
  <Text style={styles.pageIndicator}>{currentPage} of 8</Text>
  
  <TouchableOpacity
    style={[styles.navButton, !canGoNext && styles.disabled]}
    onPress={handleNext}
    disabled={!canGoNext}
  >
    <Text style={styles.navButtonText}>Next</Text>
  </TouchableOpacity>
</View>
```

### Input Fields
- Large, clear labels
- Bold text styling
- Rounded corners
- Focus states with colored borders
- Validation messages

## Error Handling
- Network errors: Show retry option
- Validation errors: Inline messages below inputs
- Firebase errors: Alert with "Try Again" button

## Success States
- Loading indicator while submitting
- Confirmation screen with success animation
- Automatic navigation to confirmation page

## Accessibility
- Large touch targets (minimum 44x44)
- High contrast text
- Clear focus states
- Screen reader support for labels

## Future Enhancements
- Allow users to view their submitted Sparks
- Enable editing submissions before review
- Add image upload for visual mockups
- Community voting on submitted ideas
- Progress tracking for approved Sparks

