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
            // We calculate the new state (Cash, etc.) based on the new entries to ensure strict correctness.
            let nextState = LedgerEngine.applyEntries(state, turnResponse.journal_entries);

            // 4. Update Operational State (from AI)
            nextState = {
                ...nextState,
                week: state.week + 1, // Or use ops_updates.new_week_number
                inventory_kg: state.inventory_kg + (turnResponse.ops_updates?.inventory_mass_change_kg || 0),
                machine_health: Math.max(0, Math.min(100, state.machine_health + (turnResponse.ops_updates?.machine_health_change || 0))),
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

    return {
        state,
        error,
        processTurn,
        resetGame
    };
};
