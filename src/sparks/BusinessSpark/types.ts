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
        new_week_number: number;
    };

    // Next available distinct paths
    next_options: NextOption[];
}

export interface Machine {
    id: string;
    model: string;
    health: number;         // 0-100
    maxHealth: number;      // Decreases after each repair (100 -> 90 -> 80...)
}

export interface BusinessState {
    // Financial State
    cash: number;
    ledger: JournalEntry[]; // Full history

    // Operational State
    week: number;
    inventory_kg: number;
    machines: Machine[];

    // Growth Engine
    customers_first_run_queue: number; // For the next 2 days after campaign
    active_repeat_customers: number;   // Orders every 3 days
    has_shopify: boolean;
    monthly_costs: number;             // e.g. $30 for Shopify

    // Game History
    turn_history: GameTurnResponse[];

    // Status
    is_loading: boolean;
    game_over: boolean;
}

export const INITIAL_BUSINESS_STATE: BusinessState = {
    cash: 0,
    ledger: [],
    week: 0,
    inventory_kg: 0,
    machines: [],
    customers_first_run_queue: 0,
    active_repeat_customers: 0,
    has_shopify: false,
    monthly_costs: 0,
    turn_history: [],
    is_loading: false,
    game_over: false,
};
