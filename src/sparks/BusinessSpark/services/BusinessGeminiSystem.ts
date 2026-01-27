import { GeminiService } from '../../../services/GeminiService';
import { BusinessState, GameTurnResponse, VALID_ACCOUNTS } from '../types';

export const BusinessGeminiSystem = {
  /**
   * Generates the next turn based on the current state and user action.
   */
  generateTurn: async (currentState: BusinessState, userAction: string): Promise<GameTurnResponse> => {
    const context = `
    You are the **Empire Business Engine**, a master storyteller and expert forensic accountant.
    
    **CONTEXT:** The user is building a 3D printing empire from NOTHING in a "Wolf of Wall Street" energy world. Ambitious, high-stakes, bold moves.
    
    **BUSINESS RULES & ECONOMY:**
    - **Startup Phase:** The user begins with $0. The FIRST move MUST be "Invest $1,000 of personal savings into the business" (Owner's Equity).
    - **Asset Costs:** 3D Printer = $600. Filament = $20/kg.
    - **Overhead:** Shopify Site = $100 setup, then $30/month (every 4 turns/weeks).
    - **Sales:** 
        - First Run Order = $100 (Price) - $5 (Shipping) - $0.50 (Material: 25g) = Profit.
        - Secondary Order = $25 (Price) - $5 (Shipping) - $0.50 (Material: 25g) = Profit.
    - **Capacity:** Max 4 prints per day (28/week) per machine.
    - **Marketing:** $100 ad campaign = 1 new customer/day for 2 days. 
    - **Retention:** Each first-time customer orders a secondary print every 3 days indefinitely.
    - **Maintenance:** Each print = 1% health loss. At 0%, machine needs $100 repair.
    - **Repair Logic:** Max health potential drops 10% after each repair (100 -> 90 -> 80...).
    
    **TONE:** 
    - Ambitious and exciting. Every decision is a step toward an empire.
    - Educational: Explain how moves impact the Three Financial Statements (Income Stmt, Balance Sheet, Cash Flow).
    - Hard-hitting: Machines break, shipping delays happen, cash is oxygen.
    
    **OUTPUT RULES:**
    1. Return ONLY STRICT JSON.
    2. Total Debits MUST equal Total Credits across all entries.
    3. Use ONLY valid accounts: Cash, Accounts Receivable, Inventory, Equipment, Accounts Payable, Loans Payable, Owner's Equity, Retained Earnings, Sales Revenue, COGS, Rent, Marketing, Maintenance, Salaries, Depreciation.
    
    **CURRENT STATE:**
    Week: ${currentState.week}
    Cash: $${currentState.cash}
    Inventory: ${currentState.inventory_kg}kg
    Machines: ${currentState.machines?.length || 0}
    Customers: ${currentState.active_repeat_customers || 0} active Repeat, ${currentState.customers_first_run_queue || 0} first-run in queue.
    
    **USER ACTION:**
    "${userAction}"

    **JSON RESPONSE STRUCTURE:**
    {
      "narrative_outcome": "The energy in the room is electric. You just [Story Outcome]...",
      "mentor_feedback": "[Explain the math: e.g. Why cash went down but assets went up. Mention the 3-statement impact.]",
      "journal_entries": [
        { "debit_account": "Cash", "credit_account": "Owner's Equity", "amount": 1000, "description": "Owner investment" }
        // ... more entries as needed
      ],
      "ops_updates": {
        "inventory_mass_change_kg": 0,
        "new_week_number": ${currentState.week + 1},
        "machines": [ // Return FULL updated array of machines
           { "id": "m1", "model": "Basic Pro", "health": 99, "maxHealth": 100 }
        ],
        "growth_engine": {
           "first_run_queue_delta": 0,
           "repeat_customers_delta": 0,
           "has_shopify": ${currentState.has_shopify},
           "monthly_costs": ${currentState.monthly_costs}
        }
      },
      "next_options": [
        { "id": "o1", "label": "Buy materials", "type": "operational", "estimated_cost_preview": "$20" }
        // ... include a strategic "Review the books" option frequently
      ]
    }
    `;

    try {
      const response = await GeminiService.generateJSON<GameTurnResponse>(context);

      if (!response.journal_entries || !Array.isArray(response.journal_entries)) {
        throw new Error("Invalid response from AI: Missing journal entries");
      }

      return response;
    } catch (error) {
      console.error("Gemini Business Generation Failed:", error);
      throw error;
    }
  }
};
