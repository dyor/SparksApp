import { JournalEntry, BusinessState, VALID_ACCOUNTS } from '../types';

export const LedgerEngine = {
    /**
     * Validates that a transaction is double-entry compliant.
     * 1. Total Debits must equal Total Credits.
     * 2. Accounts must be valid.
     */
    validateTransaction: (entries: JournalEntry[]): { valid: boolean; error?: string } => {
        let totalDebits = 0;
        let totalCredits = 0;

        for (const entry of entries) {
            if (!VALID_ACCOUNTS.includes(entry.debit_account as any)) {
                return { valid: false, error: `Invalid Debit Account: ${entry.debit_account}` };
            }
            if (!VALID_ACCOUNTS.includes(entry.credit_account as any)) {
                return { valid: false, error: `Invalid Credit Account: ${entry.credit_account}` };
            }
            totalDebits += entry.amount;
            totalCredits += entry.amount;
        }

        // Floating point math check (within 1 cent)
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            return {
                valid: false,
                error: `Unbalanced Transaction: Debits $${totalDebits.toFixed(2)} != Credits $${totalCredits.toFixed(2)}`
            };
        }

        return { valid: true };
    },

    /**
     * Applies a list of journal entries to the current state to produce a new state.
     * This is a pure function.
     */
    applyEntries: (state: BusinessState, entries: JournalEntry[]): BusinessState => {
        let newCash = state.cash;
        const newLedger = [...state.ledger, ...entries];

        // Re-calculate Cash specifically (quick lookup)
        // In a real double-entry system, we'd sum (Dr Cash - Cr Cash) + Starting Cash.
        // For simplicity here, we iteratively update.

        // We can also just sum up the entire ledger for perfect accuracy, 
        // but incremental update is faster for UI if history is long.
        // Let's do a strict recalculation from the ledger for robustness.

        newCash = 1000; // Reset to initial
        for (const entry of newLedger) {
            if (entry.debit_account === 'Cash') newCash += entry.amount;
            if (entry.credit_account === 'Cash') newCash -= entry.amount;
        }

        // Determine if game over (Bankruptcy)
        const isGameOver = newCash < 0; // Simple bankruptcy rule

        return {
            ...state,
            cash: newCash,
            ledger: newLedger,
            game_over: isGameOver || state.game_over,
        };
    },

    /**
     * Helper to format currency
     */
    formatCurrency: (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }
};
