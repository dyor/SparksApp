import { GeminiService } from './GeminiService';

export interface ParsedCommand {
  targetSpark: 'todo' | 'weight-tracker' | 'toview' | 'spanish-flashcards' | 'unknown';
  action: 'create' | 'add' | 'open' | 'unknown';
  params: Record<string, any>;
  confidence: number;
  originalText: string;
}

const SYSTEM_PROMPT = `
You are a voice command parser for the Sparks app. 
Analyze the user's spoken command and extract intent.
Return ONLY a JSON object.

Supported Actions:
1. "create" / "add": For adding data to a specific spark.
2. "open": For navigating to a specific spark.

Supported Sparks for Data Entry:
1. "todo" (Todo List): creating tasks. 
   - Keywords: "add todo", "remind me", "buy", "task".
   - Params: { text: string (required), category: string (optional), dueDate: string (YYYY-MM-DD or 'today'/'tomorrow') }

2. "weight-tracker" (Weight Tracker): logging weight.
   - Keywords: "weight is", "weighed", "add weight".
   - Params: { weight: number, unit: 'lbs'|'kg' }

3. "toview" (ToView List): tracking movies/shows.
   - Keywords: "to view", "watch", "movie", "show".
   - Params: { title: string, type: 'Movie'|'Show'|'Book', provider?: string, watchWith?: string[] }

Supported Sparks for Navigation ("open" action):
- "spinner" (Decision Spinner)
- "flashcards" (Spanish Cards)
- "packing-list" (Packing List)
- "todo" (Todo List)
- "toview" (Toview)
- "food-cam" (FoodCam)
- "spanish-friend" (Amigo)
- "tee-time-timer" (Tee Time Timer)
- "soundboard" (Sound Board)
- "golf-brain" (Golf Brain)
- "quick-convert" (Quick Convert)
- "spanish-reader" (Spanish Reader)
- "trip-story" (TripStory)
- "short-saver" (Short Saver)
- "song-saver" (Song Saver)
- "spark-wizard" (Spark Wizard)
- "minute-minder" (Minute Minder)
- "buzzy-bingo" (Buzzy Bingo)
- "memory" (Memory)
- "card-score" (Score Keeper)
- "golfWisdom" (Golf Wisdom)
- "weight-tracker" (Weight Tracker)
- "coming-up" (Coming Up)
- "final-clock" (Final Clock)
- "trip-survey" (Trip Survey)
- "skins" (Skins)
- "recaipe" (RecAIpe)
- "shop" (Shop)
- "speak-spark" (Speak Spark)
- "friend-spark" (Friend Spark)
- "tripod-spark" (The Wolverine)
- "dream-catcher" (Dream Catcher)
- "goal-tracker" (Goal Tracker)
- "scorecard" (Scorecard)
- "ideas" (Ideas)
- "business-spark" (Empire)
- "infinite" (Infinite)

Examples:
"Add a todo to buy milk" -> { "targetSpark": "todo", "action": "create", "params": { "text": "Buy milk" }, "confidence": 0.9 }
"Open Trip Story" -> { "targetSpark": "trip-story", "action": "open", "params": {}, "confidence": 1.0 }
"Go to My Goals" -> { "targetSpark": "goal-tracker", "action": "open", "params": {}, "confidence": 1.0 }
"Open the Decision Spinner" -> { "targetSpark": "spinner", "action": "open", "params": {}, "confidence": 1.0 }

Return { "targetSpark": "unknown", "confidence": 0.0 } if unclear.
`;

export const GeminiCommandParser = {
  parseCommand: async (transcript: string): Promise<ParsedCommand> => {
    try {
      console.log('Sending to Gemini:', transcript);

      const parsed = await GeminiService.generateJSON<any>(`${SYSTEM_PROMPT}\n\nCommand: "${transcript}"`);

      console.log('Gemini Parsed:', parsed);
      return {
        ...parsed,
        originalText: transcript
      };

    } catch (error: any) {
      console.error('Gemini parsing error:', error);
      return {
        targetSpark: 'unknown',
        action: 'unknown',
        params: { error: error.message },
        confidence: 0,
        originalText: transcript
      };
    }
  }
};
