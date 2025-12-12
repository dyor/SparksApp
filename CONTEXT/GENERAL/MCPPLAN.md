# MCP Plan: Scaling Speak Spark to All Sparks

## Current Architecture

### Overview
Speak Spark uses a **two-stage pipeline** to process voice commands:

1. **Stage 1: GeminiCommandParser** (LLM-based)
   - Converts natural language → structured JSON command
   - Uses hardcoded system prompt with Spark descriptions
   - Returns: `{ targetSpark, action, params, confidence }`

2. **Stage 2: CommandExecutor** (Code-based)
   - Executes structured command against app data store
   - Manual switch/case handlers for each Spark
   - Directly manipulates Zustand store

### Current Implementation

**Spark Information** is provided via hardcoded prompt in `GeminiCommandParser.ts`:

```typescript
const SYSTEM_PROMPT = `
Supported Sparks:
1. "todo" (Todo List): creating tasks. 
   - Keywords: "add todo", "remind me", "buy", "task"
   - Params: { text, category, dueDate }

2. "weight-tracker" (Weight Tracker): logging weight.
   - Keywords: "weight is", "weighed", "add weight"
   - Params: { weight, unit }

3. "toview" (ToView List): tracking movies/shows.
   - Keywords: "to view", "watch", "movie", "show"
   - Params: { title, type, provider, watchWith }
`;
```

### Disambiguation Logic

For edge cases like "remember to watch X-men" (todo vs toview):
- LLM uses **keyword matching**: "watch" → `toview`
- **Contextual hints**: "movie" context → `toview`
- **Few-shot examples** in prompt guide classification
- Returns **confidence score** (0-1)

### Current Limitations

- **Only 3/31 Sparks supported**: todo, weight-tracker, toview
- **Manual scaling required**: Each new Spark needs:
  1. Prompt updates in `GeminiCommandParser.ts`
  2. Handler function in `CommandExecutor.ts`
  3. Understanding Spark's data schema
- **No central registry**: Capabilities scattered across files
- **Prompt bloat risk**: With 31 Sparks, token limit becomes an issue

---

## Scaling Recommendations

### Option A: Enhanced Prompt-Based (Short Term)

**Best for**: 10-15 high-value Sparks

#### Implementation
1. Add `voiceCapabilities` to Spark metadata in `sparkRegistryData.tsx`:

```typescript
{
  metadata: {
    id: 'ideas',
    title: 'Ideas',
    description: 'Capture and organize your brilliant ideas',
    icon: '💡',
    category: 'productivity',
    voiceCapabilities: {
      enabled: true,
      keywords: ['idea', 'thought', 'remember', 'think of'],
      actions: ['add', 'create'],
      parameters: {
        content: { type: 'string', required: true, description: 'The idea text' }
      },
      examples: [
        'I have an idea about solar panels',
        'Remember this: coffee with almond milk is better'
      ]
    }
  }
}
```

2. **Auto-generate system prompt** from registry:

```typescript
function buildSystemPrompt(): string {
  const sparks = getAllSparks().filter(s => s.metadata.voiceCapabilities?.enabled);
  return `Supported Sparks:\n${sparks.map((s, i) => 
    `${i+1}. "${s.metadata.id}" (${s.metadata.title}): ${s.metadata.description}
       - Keywords: ${s.metadata.voiceCapabilities.keywords.join(', ')}
       - Actions: ${s.metadata.voiceCapabilities.actions.join(', ')}
       - Params: ${JSON.stringify(s.metadata.voiceCapabilities.parameters)}`
  ).join('\n\n')}`;
}
```

3. Keep manual `CommandExecutor` handlers for each Spark

#### Pros
- Quick to implement (~2-3 hours)
- Minimal refactoring
- Single source of truth (Spark registry)

#### Cons
- Still requires manual handler per Spark
- Prompt can get large (token cost)
- Not fully self-documenting

---

### Option B: MCP-Like Tool Interface (Recommended for Full Scale)

**Best for**: Supporting most/all 31 Sparks

#### Implementation

1. **Define Tool Interface**:

```typescript
// src/types/sparkTools.ts
import { JSONSchema7 } from 'json-schema';

export interface SparkTool {
  name: string;                    // e.g., "add_idea"
  sparkId: string;                 // e.g., "ideas"
  description: string;             // What this tool does
  parameters: JSONSchema7;         // Tool parameter schema
  execute: (params: any) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}
```

2. **Each Spark exports its tools**:

```typescript
// src/sparks/IdeasSpark.tools.ts
import { SparkTool } from '../types/sparkTools';
import { useSparkStore } from '../store';

export const IdeasTools: SparkTool[] = [
  {
    name: 'add_idea',
    sparkId: 'ideas',
    description: 'Capture and save a new idea',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The idea content/text to save'
        }
      },
      required: ['content']
    },
    execute: async ({ content }) => {
      const { getSparkData, setSparkData } = useSparkStore.getState();
      const data = getSparkData('ideas') || {};
      const ideas = data.ideas || [];
      
      const newIdea = {
        id: Date.now().toString(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      
      setSparkData('ideas', {
        ...data,
        ideas: [newIdea, ...ideas]
      });
      
      return {
        success: true,
        message: `Saved idea: "${content.substring(0, 50)}..."`,
        data: { ideaId: newIdea.id }
      };
    }
  }
];
```

3. **Use Gemini Function Calling** (native feature):

```typescript
// src/services/GeminiCommandParser.ts
import { getAllSparkTools } from './SparkToolRegistry';

export const parseAndExecute = async (transcript: string) => {
  const tools = getAllSparkTools();
  
  // Convert to Gemini function calling format
  const functionDeclarations = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
  
  const response = await GeminiService.generateContent({
    contents: [{ text: transcript }],
    tools: [{ functionDeclarations }]
  });
  
  // Gemini returns which function to call + params
  if (response.functionCall) {
    const tool = tools.find(t => t.name === response.functionCall.name);
    return await tool.execute(response.functionCall.args);
  }
  
  return { success: false, message: "Couldn't understand command" };
};
```

4. **Central Tool Registry**:

```typescript
// src/services/SparkToolRegistry.ts
import { IdeasTools } from '../sparks/IdeasSpark.tools';
import { TodoTools } from '../sparks/TodoSpark.tools';
// ... import all Spark tools

export function getAllSparkTools(): SparkTool[] {
  return [
    ...IdeasTools,
    ...TodoTools,
    ...WeightTrackerTools,
    ...ToviewTools,
    // ... auto-import or manually list
  ];
}
```

#### Pros
- **True scalability**: Add new Spark = add one `.tools.ts` file
- **Type-safe**: TypeScript enforces schemas
- **Self-documenting**: Tools describe themselves
- **Native LLM integration**: Gemini handles function selection
- **Testable**: Each tool is independently testable
- **No prompt bloat**: Gemini manages function catalog internally

#### Cons
- More upfront work (~1-2 days initial setup)
- Requires creating `.tools.ts` for each Spark
- Slight learning curve for tool pattern

---

### Option C: Hybrid Approach (Pragmatic)

**Recommendation**: Start with Option A, migrate to Option B incrementally

#### Phase 1 (Now - ~3 hours)
1. Add `voiceCapabilities` metadata to Spark registry
2. Auto-generate prompt from registry for top 10-15 Sparks
3. Keep manual `CommandExecutor` handlers
4. Ship and validate with users

#### Phase 2 (Later - ongoing)
1. Create `SparkTool` interface and registry
2. Migrate high-usage Sparks to `.tools.ts` pattern
3. Switch to Gemini function calling
4. Gradually convert remaining Sparks as needed
5. Deprecate old `CommandExecutor` when all migrated

#### Benefits
- **Ship fast**: Get value immediately
- **Validate approach**: Learn which Sparks users actually want
- **Smooth migration**: Build Option B alongside Option A
- **Backward compatible**: No breaking changes

---

## Specific Recommendations

### For Disambiguation (e.g., "watch X-men" → toview vs todo)

**Current**: LLM keyword matching works but is fragile with 31 Sparks

**Improved** (Option A):
- Add explicit **action verbs** to metadata:
  - `toview`: watch, see, view
  - `todo`: do, buy, complete, accomplish
  - `ideas`: think, idea, remember (passive)
  
**Best** (Option B):
- Gemini function calling handles this natively
- LLM evaluates all tool descriptions and picks best match
- Returns confidence scores automatically

### Priority Sparks for Voice Support

Based on likely user value:

**Tier 1** (Implement first):
1. ✅ todo - Task management
2. ✅ weight-tracker - Quick logging
3. ✅ toview - Media tracking
4. ideas - Capture thoughts
5. packing-list - Travel prep
6. coming-up - Event reminders

**Tier 2** (High value):
7. food-cam - Meal logging
8. minute-minder - Schedule creation
9. trip-story - Travel notes
10. spanish-friend - Language practice

**Tier 3** (Lower priority):
- Sparks requiring complex input (trip-survey, business-sim)
- Read-only Sparks (spark-stats, golf-wisdom)
- Settings/utility Sparks (share-sparks, spark-wizard)

---

## Implementation Guidance

### Starting Point (Recommended: Hybrid Option C, Phase 1)

1. **Add voice metadata** to 10-15 Sparks in `sparkRegistryData.tsx`
2. **Auto-generate prompt** in `GeminiCommandParser.ts`
3. **Add handlers** in `CommandExecutor.ts` for new Sparks
4. **Test with users** and iterate

**Estimated effort**: 3-4 hours

### Future Migration (Option B)

1. Design `SparkTool` interface
2. Create tool registry system
3. Implement 2-3 Sparks as `.tools.ts` to validate pattern
4. Integrate Gemini function calling
5. Migrate remaining Sparks incrementally

**Estimated effort**: 1-2 days initially, then 15-30 min per Spark

---

## Open Questions

1. **Should all Sparks be voice-enabled?** Or just high-value ones?
2. **Multi-step workflows?** e.g., "Add todo to buy milk and watch X-men"
3. **Voice feedback?** Should app speak responses back?
4. **Conversational context?** Track multi-turn conversations?
5. **User preferences?** Learn which Sparks a user prefers for ambiguous commands?

---

## Related Files

- `src/services/GeminiCommandParser.ts` - Current LLM prompt logic
- `src/services/CommandExecutor.ts` - Current execution logic
- `src/components/sparkRegistryData.tsx` - Spark metadata registry
- `src/sparks/SpeakSpark.tsx` - Voice UI and orchestration
- `src/services/GeminiService.ts` - Gemini API wrapper
