import { GeminiService } from '../../../services/GeminiService';
import { BusinessState, GameTurnResponse, VALID_ACCOUNTS } from '../types';

export const BusinessGeminiSystem = {
    /**
     * Generates the next turn based on the current state and user action.
     */
    generateTurn: async (currentState: BusinessState, userAction: string): Promise<GameTurnResponse> => {

        const context = `
    You are the **Business Spark Engine**, an expert forensic accountant and business simulation master.
    
    **GOAL:** Teach the user accounting intuition (Cash Flow vs Profit, Balance Sheets) via a 3D printing business simulation.
    
    **RULES:**
    1. Time: Each turn = 1 week.
    2. Logic: Events must be realistic. Machines break, clients pay late.
    3. Accounting: Return ONLY valid double-entry bookkeeping moves.
    4. Output: STRICT JSON. No markdown.
    
    **ACCOUNTS ALLOWED:**
    ${VALID_ACCOUNTS.join(', ')}
    
    **INSTRUCTIONS:**
    1. Analyze the User's Action + Current State.
    2. Determine outcome probability.
    3. Generate "narrative_outcome" (The Story).
    4. Generate "journal_entries" (The Math).
       - If buying assets: Dr Asset, Cr Cash.
       - If selling: Dr Cash/AR, Cr Revenue AND Dr COGS, Cr Inventory.
       - If making a profit: Balance Sheet MUST balance.
    5. Generate "mentor_feedback" (The Lesson). Explain clearly why the cash/profit changed.
    6. Generate "next_options" (3 choices: Safe, Risky, Admin).
    
    **CURRENT STATE:**
    Week: ${currentState.week}
    Cash: ${currentState.cash}
    Inventory: ${currentState.inventory_kg} kg
    Machine Health: ${currentState.machine_health}%
    Last Turn: ${currentState.turn_history.length > 0 ? currentState.turn_history[currentState.turn_history.length - 1].narrative_outcome : 'Start of Game'}
    
    **USER ACTION:**
    "${userAction}"

    **REQUIRED JSON STRUCTURE (Example):**
    {
      "narrative_outcome": "You bought new equipment...",
      "mentor_feedback": "Assets increased, Cash decreased. No P&L impact yet.",
      "journal_entries": [
        {
           "debit_account": "Equipment",
           "credit_account": "Cash",
           "amount": 500,
           "description": "Purchase of high-speed nozzle"
        }
      ],
      "ops_updates": {
        "inventory_mass_change_kg": 0,
        "machine_health_change": 10,
        "new_week_number": ${currentState.week + 1}
      },
      "next_options": [
        {
          "id": "opt_1",
          "label": "Buy materials",
          "type": "operational",
          "estimated_cost_preview": "$200"
        }
      ]
    }
    `;

        try {
            const response = await GeminiService.generateJSON<GameTurnResponse>(context);

            // Basic runtime validation of structure
            if (!response.journal_entries || !Array.isArray(response.journal_entries)) {
                throw new Error("Invalid response: Missing journal_entries");
            }

            return response;
        } catch (error) {
            console.error("Gemini Business Generation Failed:", error);
            throw error;
        }
    }
};
