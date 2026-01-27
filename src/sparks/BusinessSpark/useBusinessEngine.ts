import { useState, useCallback } from 'react';
import { BusinessState, INITIAL_BUSINESS_STATE, GameTurnResponse } from './types';
import { LedgerEngine } from './services/LedgerEngine';
import { BusinessGeminiSystem } from './services/BusinessGeminiSystem';

export const useBusinessEngine = () => {
    const [state, setState] = useState<BusinessState>(INITIAL_BUSINESS_STATE);
    const [error, setError] = useState<string | null>(null);

    const processTurn = useCallback(async (userAction: string) => {
        setState(prev => ({ ...prev, is_loading: true }));
        setError(null);

        try {
            // 1. Get AI decision
            const turnResponse: GameTurnResponse = await BusinessGeminiSystem.generateTurn(state, userAction);

            // 2. Validate Accounting
            const validation = LedgerEngine.validateTransaction(turnResponse.journal_entries);
            if (!validation.valid) {
                throw new Error(`AI Accountant Error: ${validation.error}`);
            }

            // 3. Apply Math (Ledger Update)
            let nextState = LedgerEngine.applyEntries(state, turnResponse.journal_entries);

            // 4. Update Operational State (from AI response)
            const ops = turnResponse.ops_updates as any; // Cast for now as we transition

            nextState = {
                ...nextState,
                week: state.week + 1,
                inventory_kg: state.inventory_kg + (ops.inventory_mass_change_kg || 0),
                machines: ops.machines || state.machines,
                customers_first_run_queue: state.customers_first_run_queue + (ops.growth_engine?.first_run_queue_delta || 0),
                active_repeat_customers: state.active_repeat_customers + (ops.growth_engine?.repeat_customers_delta || 0),
                has_shopify: ops.growth_engine?.has_shopify !== undefined ? ops.growth_engine.has_shopify : state.has_shopify,
                monthly_costs: ops.growth_engine?.monthly_costs !== undefined ? ops.growth_engine.monthly_costs : state.monthly_costs,
                turn_history: [...state.turn_history, turnResponse],
                is_loading: false
            };

            setState(nextState);

        } catch (e: any) {
            console.error("Turn Processing Error:", e);
            setError(e.message || "Something went wrong with the simulation.");
            setState(prev => ({ ...prev, is_loading: false }));
        }
    }, [state]);

    const resetGame = useCallback(() => {
        setState(INITIAL_BUSINESS_STATE);
        setError(null);
    }, []);

    const loadState = useCallback((loadedState: BusinessState) => {
        // Merge loaded state with initial state to ensure new properties (like machines[]) 
        // are present even if loading old data.
        // Also ensure we NEVER start in a loading state.
        setState({
            ...INITIAL_BUSINESS_STATE,
            ...loadedState,
            is_loading: false
        });
        setError(null);
    }, []);

    const stopLoading = useCallback(() => {
        setState(prev => ({ ...prev, is_loading: false }));
    }, []);

    return {
        state,
        error,
        processTurn,
        resetGame,
        loadState,
        stopLoading
    };
};
