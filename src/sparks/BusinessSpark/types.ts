export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

// The Allowed Chart of Accounts (to prevent AI hallucinating "Magic Dust" account)
export const VALID_ACCOUNTS = [
    'Cash', 'Accounts Receivable', 'Inventory', 'Equipment', // Assets
    'Accounts Payable', 'Loans Payable',                     // Liabilities
    'Owner\'s Equity', 'Retained Earnings',                  // Equity
    'Sales Revenue',                                         // Revenue
    'COGS', 'Rent', 'Marketing', 'Maintenance', 'Salaries', 'Depreciation' // Expenses
] as const;

export type ValidAccount = typeof VALID_ACCOUNTS[number];

export interface JournalEntry {
    debit_account: string;  // Must match VALID_ACCOUNTS
    credit_account: string; // Must match VALID_ACCOUNTS
    amount: number;
    description: string;
}

// Low-level metrics for UI visualization
export interface MetricUpdate {
    label: string;
    value: string; // e.g., "+$500" or "-10% Health"
    trend: 'up' | 'down' | 'neutral';
}

export interface NextOption {
    id: string;
    label: string;
    type: 'strategic' | 'operational' | 'crisis';
    estimated_cost_preview: string;
}

// The Strict JSON Response from Gemini
export interface GameTurnResponse {
    narrative_outcome: string;        // The flavor text (What happened?)
    mentor_feedback: string;          // The lesson (Why did cash go down but profit up?)

    journal_entries: JournalEntry[];  // The accounting TRUTH

    // Operational State Updates (Non-monetary)
    ops_updates: {
        inventory_mass_change_kg: number;
        machine_health_change: number;  // Delta e.g. -5
        new_week_number: number;
    };

    // Next available distinct paths
    next_options: NextOption[];
}

export interface BusinessState {
    // Financial State
    cash: number;
    ledger: JournalEntry[]; // Full history

    // Operational State
    week: number;
    inventory_kg: number;
    machine_health: number; // 0-100

    // Game History
    turn_history: GameTurnResponse[];

    // Status
    is_loading: boolean;
    game_over: boolean;
}

export const INITIAL_BUSINESS_STATE: BusinessState = {
    cash: 1000, // Starting capital
    ledger: [],
    week: 1,
    inventory_kg: 0,
    machine_health: 100,
    turn_history: [],
    is_loading: false,
    game_over: false,
};
