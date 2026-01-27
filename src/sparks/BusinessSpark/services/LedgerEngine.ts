import { JournalEntry, BusinessState, VALID_ACCOUNTS } from '../types';

export interface FinancialStatementRow {
    label: string;
    value: number;
    subRows?: FinancialStatementRow[];
    isTotal?: boolean;
}

export const LedgerEngine = {
    validateTransaction: (entries: JournalEntry[]): { valid: boolean; error?: string } => {
        for (const entry of entries) {
            if (!VALID_ACCOUNTS.includes(entry.debit_account as any)) {
                return { valid: false, error: `Invalid Debit Account: ${entry.debit_account}` };
            }
            if (!VALID_ACCOUNTS.includes(entry.credit_account as any)) {
                return { valid: false, error: `Invalid Credit Account: ${entry.credit_account}` };
            }
            if (entry.amount < 0) {
                return { valid: false, error: `Negative amount in transaction: ${entry.description}` };
            }
        }
        return { valid: true };
    },

    applyEntries: (state: BusinessState, entries: JournalEntry[]): BusinessState => {
        const newLedger = [...state.ledger, ...entries];

        // Strict recalculation of Cash from ledger
        let newCash = 0;
        for (const entry of newLedger) {
            if (entry.debit_account === 'Cash') newCash += entry.amount;
            if (entry.credit_account === 'Cash') newCash -= entry.amount;
        }

        const isGameOver = newCash < 0 && state.week > 1;

        return {
            ...state,
            cash: newCash,
            ledger: newLedger,
            game_over: isGameOver,
        };
    },

    getAccountBalance: (ledger: JournalEntry[], accountName: string): number => {
        let balance = 0;
        for (const entry of ledger) {
            if (entry.debit_account === accountName) balance += entry.amount;
            if (entry.credit_account === accountName) balance -= entry.amount;
        }
        return balance;
    },

    getIncomeStatement: (ledger: JournalEntry[]): FinancialStatementRow[] => {
        const revenue = LedgerEngine.getAccountBalance(ledger, 'Sales Revenue') * -1; // Revenue is normally Credit
        const cogs = LedgerEngine.getAccountBalance(ledger, 'COGS');
        const grossProfit = revenue - cogs;

        const marketing = LedgerEngine.getAccountBalance(ledger, 'Marketing');
        const rent = LedgerEngine.getAccountBalance(ledger, 'Rent');
        const maintenance = LedgerEngine.getAccountBalance(ledger, 'Maintenance');
        const salaries = LedgerEngine.getAccountBalance(ledger, 'Salaries');
        const depreciation = LedgerEngine.getAccountBalance(ledger, 'Depreciation');

        const totalExpenses = marketing + rent + maintenance + salaries + depreciation;
        const netIncome = grossProfit - totalExpenses;

        return [
            { label: 'Revenue', value: revenue },
            { label: 'COGS', value: cogs },
            { label: 'Gross Profit', value: grossProfit, isTotal: true },
            {
                label: 'Operating Expenses', value: totalExpenses, subRows: [
                    { label: 'Marketing', value: marketing },
                    { label: 'Rent', value: rent },
                    { label: 'Maintenance', value: maintenance },
                    { label: 'Salaries', value: salaries },
                    { label: 'Depreciation', value: depreciation },
                ]
            },
            { label: 'Net Income', value: netIncome, isTotal: true }
        ];
    },

    getBalanceSheet: (ledger: JournalEntry[]): { assets: FinancialStatementRow[], liabilities: FinancialStatementRow[], equity: FinancialStatementRow[] } => {
        // Assets
        const cash = LedgerEngine.getAccountBalance(ledger, 'Cash');
        const ar = LedgerEngine.getAccountBalance(ledger, 'Accounts Receivable');
        const inventory = LedgerEngine.getAccountBalance(ledger, 'Inventory');
        const equipment = LedgerEngine.getAccountBalance(ledger, 'Equipment');

        // Liabilities
        const ap = LedgerEngine.getAccountBalance(ledger, 'Accounts Payable') * -1;
        const loans = LedgerEngine.getAccountBalance(ledger, 'Loans Payable') * -1;

        // Equity
        const capital = LedgerEngine.getAccountBalance(ledger, 'Owner\'s Equity') * -1;
        const retainedEarnings = LedgerEngine.getAccountBalance(ledger, 'Retained Earnings') * -1;
        // Simplified: Net Income from all years/weeks goes to Retained Earnings
        const incomeStatement = LedgerEngine.getIncomeStatement(ledger);
        const currentNetIncome = incomeStatement.find(r => r.label === 'Net Income')?.value || 0;

        return {
            assets: [
                { label: 'Cash', value: cash },
                { label: 'Accounts Receivable', value: ar },
                { label: 'Inventory', value: inventory },
                { label: 'Equipment', value: equipment },
                { label: 'Total Assets', value: cash + ar + inventory + equipment, isTotal: true }
            ],
            liabilities: [
                { label: 'Accounts Payable', value: ap },
                { label: 'Loans Payable', value: loans },
                { label: 'Total Liabilities', value: ap + loans, isTotal: true }
            ],
            equity: [
                { label: 'Owner\'s Capital', value: capital },
                { label: 'Retained Earnings', value: retainedEarnings + currentNetIncome },
                { label: 'Total Equity', value: capital + retainedEarnings + currentNetIncome, isTotal: true }
            ]
        };
    },

    getCashFlowStatement: (ledger: JournalEntry[]): FinancialStatementRow[] => {
        const incomeStatement = LedgerEngine.getIncomeStatement(ledger);
        const netIncome = incomeStatement.find(r => r.label === 'Net Income')?.value || 0;
        const depreciation = incomeStatement.find(r => r.subRows)?.subRows?.find(s => s.label === 'Depreciation')?.value || 0;

        // Operational changes
        const arChange = LedgerEngine.getAccountBalance(ledger, 'Accounts Receivable') * -1;
        const inventoryChange = LedgerEngine.getAccountBalance(ledger, 'Inventory') * -1;
        const apChange = LedgerEngine.getAccountBalance(ledger, 'Accounts Payable');

        const operatingCash = netIncome + depreciation + arChange + inventoryChange + apChange;

        // Investing
        const equipmentChange = LedgerEngine.getAccountBalance(ledger, 'Equipment') * -1;

        // Financing
        const capitalChange = LedgerEngine.getAccountBalance(ledger, 'Owner\'s Equity');
        const loanChange = LedgerEngine.getAccountBalance(ledger, 'Loans Payable');

        return [
            { label: 'Net Income', value: netIncome },
            { label: 'Depreciation (Non-Cash)', value: depreciation },
            {
                label: 'Changes in Working Capital', value: arChange + inventoryChange + apChange, subRows: [
                    { label: 'A/R Change', value: arChange },
                    { label: 'Inventory Change', value: inventoryChange },
                    { label: 'A/P Change', value: apChange },
                ]
            },
            { label: 'Cash from Operations', value: operatingCash, isTotal: true },
            {
                label: 'Cash from Investing', value: equipmentChange, isTotal: true, subRows: [
                    { label: 'Equipment Purchase', value: equipmentChange }
                ]
            },
            {
                label: 'Cash from Financing', value: capitalChange + loanChange, isTotal: true, subRows: [
                    { label: 'Owner Investment', value: capitalChange },
                    { label: 'Loans Taken/Paid', value: loanChange },
                ]
            },
            { label: 'Net Change in Cash', value: operatingCash + equipmentChange + capitalChange + loanChange, isTotal: true }
        ];
    },

    formatCurrency: (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }
};
