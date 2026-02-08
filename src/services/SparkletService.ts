import { WebFirebaseService } from './WebFirebaseService';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp,
    doc,
    getDoc,
    setDoc,
    orderBy
} from 'firebase/firestore';
import { Sparklet, SparkletMetadata } from '../types/sparklet';
import { GeminiService } from './GeminiService';
import { SimpleAnalyticsService } from './SimpleAnalyticsService';

const SPARKLETS_COLLECTION = 'sparklets';

const SPARKLET_SYSTEM_PROMPT = `
You are the Sparklet Weaver, a master AI architect that drafts interactive "Sparklets".
A Sparklet is a self-contained logic and UI definition stored as a JSON object.

### The Infinite Schema:
1. metadata: { title, icon, description, category }
2. initialState: A JSON object for starting state (e.g., { score: 0, active: false }).
3. actions: A map of JS strings. 
   - Each string MUST be the FUNCTION BODY ONLY.
   - Available variables: 'state' (latest data), 'params' (from UI call), 'helpers' (utility proxy).
   - IMPORTANT: Always return a NEW state object. Use the spread operator: return { ...state, ...updates }.
   - SCHEDULING: Use 'helpers.scheduleAction(actionName, params, delayMs)' for timers, loops, or delayed responses.
   - CANCELLATION: Use 'helpers.cancelAction(actionName)' to stop a scheduled action.
4. view: A UI schema:
   - elements: An array of element objects.
   - SUPPORTED TYPES: 
     - 'text': Display value. Supports interpolations like {{state.key}} or {{state.list.length}}.
     - 'button': label, onPress (action name), params (object).
     - 'input': placeholder, binding (path like 'state.text'), secureTextEntry.
     - 'container' or 'view': A layout box that can nest other 'elements' inside it.
     - 'grid': dataSource (array path), onPress (receives {index}).
   - COMMON PROPS: 
     - 'style': string name corresponding to a key in the styles map.
     - 'hidden': boolean or {{expression}} to hide element (e.g. "{{state.lives <= 0}}").
   - STYLES: A map of style names to React Native-compatible style objects. 
     - Supports absolute positioning (top, left, right, bottom, zIndex).
     - Supports 'transform' strings (e.g. "translate(-50%, -50%)").
     - Supports 'boxShadow' strings (e.g. "0px 4px 8px rgba(0,0,0,0.2)").
     - Dimensions: Use Numbers for sizes. Web units like 'px' or 'em' are allowed but Numbers are preferred.

### Your Mission:
Generate a functional, robust, and visually polished Sparklet JSON. For games, implement the core game loop in 'actions' and handle ghost/timer cycles via 'scheduleAction'. Use 'container' nesting to create structured layouts.

Your output must be a single JSON object with two fields:
1. "definition": The full Sparklet JSON object as described above.
2. "summary": A concise (1-2 sentence) human-readable summary of the specific code changes or enhancements made.
`;

export class SparkletService {
    private static getOwnerId(): string {
        return SimpleAnalyticsService.getUserId() || SimpleAnalyticsService.getDeviceId() || 'anonymous';
    }

    /**
     * Get all available sparklets from Firestore.
     * Only shows sparklets owned by the user or those officially published.
     */
    static async getAllSparklets(): Promise<Sparklet[]> {
        console.log('🔍 [SparkletService] getAllSparklets started');
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) throw new Error('Firestore not available');

        const ownerId = this.getOwnerId();
        console.log('🔍 [SparkletService] ownerId:', ownerId);

        // Note: Firestore doesn't support OR queries across different fields easily without complex setup 
        // or a union of results. For now, we'll fetch both and merge them client-side.
        const qPublished = query(
            collection(db, SPARKLETS_COLLECTION),
            where('status', '==', 'published')
        );

        const qOwned = query(
            collection(db, SPARKLETS_COLLECTION),
            where('ownerId', '==', ownerId)
        );

        console.log('🔍 [SparkletService] Fetching published and owned sparklets...');
        try {
            const [publishedSnap, ownedSnap] = await Promise.all([
                getDocs(qPublished),
                getDocs(qOwned)
            ]);
            console.log('🔍 [SparkletService] Fetch complete. Published:', publishedSnap.size, 'Owned:', ownedSnap.size);

            const allDocs = [...publishedSnap.docs, ...ownedSnap.docs];

            // Remove duplicates (a sparklet can be both owned and published)
            const uniqueDocs = Array.from(new Set(allDocs.map(d => d.id)))
                .map(id => allDocs.find(d => d.id === id)!);

            return uniqueDocs.map(doc => {
                const data = doc.data();
                return {
                    metadata: {
                        id: doc.id,
                        title: data.title,
                        description: data.description,
                        icon: data.icon,
                        category: data.category,
                        isBeta: data.isBeta,
                        ownerId: data.ownerId,
                        isPublished: data.status === 'published',
                        status: data.status || 'draft'
                    },
                    type: data.type,
                    definition: data.definition
                } as Sparklet;
            });
        } catch (error) {
            console.error('❌ [SparkletService] getAllSparklets query failed:', error);
            throw error;
        }
    }

    /**
     * Delete sparklets that have random IDs but same titles as our seeds.
     */
    static async cleanupLegacyDuplicates(): Promise<void> {
        console.log('🧹 [SparkletService] cleanupLegacyDuplicates started');
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) return;

        const protectedIds = ['tic-tac-toe', 'sparklets-wizard'];
        const seedTitles = ['Tic Tac Toe', 'Sparklets Wizard'];

        // Targeted query for duplicates
        const q = query(
            collection(db, SPARKLETS_COLLECTION),
            where('title', 'in', seedTitles)
        );

        const snapshot = await getDocs(q);

        const deletePromises = snapshot.docs
            .filter(doc => !protectedIds.includes(doc.id))
            .map(d => {
                console.log(`🗑️ Deleting legacy duplicate: ${d.id} (${d.data().title})`);
                // Note: Real deletion logic could be added here if needed
                return Promise.resolve();
            });

        await Promise.all(deletePromises);
        console.log('🧹 [SparkletService] cleanupLegacyDuplicates complete');
    }

    /**
     * Use AI to weave a new sparklet definition.
     */
    static async generateSparkletDefinition(userVision: string): Promise<{ definition: any; summary: string }> {
        const prompt = `${SPARKLET_SYSTEM_PROMPT}\n\nUSER VISION: ${userVision}\n\nGenerate the Sparklet JSON and Summary:`;
        return await GeminiService.generateJSON<{ definition: any; summary: string }>(prompt);
    }

    /**
     * Update an existing sparklet's definition.
     * Also updates the top-level database record fields (title, icon) if found in the definition's metadata.
     */
    static async updateSparkletDefinition(id: string, definition: string): Promise<void> {
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) throw new Error('Firestore not available');

        const docRef = doc(db, SPARKLETS_COLLECTION, id);

        // Try to pull metadata out of the definition (synchronize record with definition)
        const updates: any = { definition };
        try {
            const parsed = JSON.parse(definition);
            if (parsed.metadata?.title) updates.title = parsed.metadata.title;
            if (parsed.metadata?.icon) updates.icon = parsed.metadata.icon;
            if (parsed.metadata?.description) updates.description = parsed.metadata.description;
        } catch (e) {
            console.warn('Could not parse definition metadata for field synchronization:', e);
        }

        await setDoc(docRef, updates, { merge: true });
    }

    /**
     * Birth a new sparklet from AI definition
     */
    static async createDynamicSparklet(aiGeneratedDef: any): Promise<string> {
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) throw new Error('Firestore not available');

        // Extract metadata from the AI response or provide defaults
        return await addDoc(collection(db, SPARKLETS_COLLECTION), {
            title: aiGeneratedDef.metadata?.title || 'New Sparklet',
            description: aiGeneratedDef.metadata?.description || 'A sparklet birthed by AI.',
            icon: aiGeneratedDef.metadata?.icon || '⚡️',
            category: aiGeneratedDef.metadata?.category || 'community',
            isBeta: true,
            type: 'ai_generated',
            definition: JSON.stringify(aiGeneratedDef),
            ownerId: this.getOwnerId(),
            status: 'draft',
            createdAt: Timestamp.now()
        }).then(ref => ref.id);
    }

    /**
     * Duplicate an existing sparklet.
     */
    static async duplicateSparklet(sparkletId: string): Promise<string> {
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) throw new Error('Firestore not available');

        const docRef = doc(db, SPARKLETS_COLLECTION, sparkletId);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) throw new Error('Sparklet not found');

        const data = snapshot.data();
        const ownerId = this.getOwnerId();

        // Create copy with new title, owner, and status
        const newData: any = {
            ...data,
            title: `${(data as any).title || 'New Sparklet'} (Copy)`,
            ownerId: ownerId,
            status: 'draft',
            isPublished: false,
            createdAt: Timestamp.now()
        };

        // If definition is present, update its internal metadata too
        if (newData.definition) {
            try {
                const parsed = JSON.parse(newData.definition);
                if (parsed.metadata) {
                    parsed.metadata.title = `${parsed.metadata.title} (Copy)`;
                }
                newData.definition = JSON.stringify(parsed);
            } catch (e) {
                console.warn('Failed to update internal definition title during duplication');
            }
        }

        const newDocRef = await addDoc(collection(db, SPARKLETS_COLLECTION), newData);
        return newDocRef.id;
    }

    /**
     * Submit a new sparklet idea via the Wizard
     */
    static async submitSparkletSubmission(submission: any): Promise<string> {
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) throw new Error('Firestore not available');

        // Step 1: Log the raw submission for safety
        const submissionRef = await addDoc(collection(db, 'sparkletSubmissions'), {
            ...submission,
            createdAt: Timestamp.now(),
            status: 'processing'
        });

        try {
            // Step 2: Proceed with AI Generation (The "Weaving")
            const vision = `Title: ${submission.title}. Purpose: ${submission.purpose}. Similar To: ${submission.similarity || 'New unique concept'}.`;
            const definition = await this.generateSparkletDefinition(vision);

            // Step 3: Create the actual live sparklet
            // Note: generateSparkletDefinition returns { definition, summary }
            await this.createDynamicSparklet(definition.definition);

            // Step 4: Update submission status
            await setDoc(doc(db, 'sparkletSubmissions', submissionRef.id), { status: 'completed' }, { merge: true });
        } catch (e) {
            console.error('AI Generation failed:', e);
            await setDoc(doc(db, 'sparkletSubmissions', submissionRef.id), { status: 'failed' }, { merge: true });
            throw e;
        }

        return submissionRef.id;
    }

    /**
     * Request publication for a sparklet
     */
    static async requestPublication(id: string): Promise<void> {
        await this.updateSparkletStatus(id, 'pending');
    }

    /**
     * Unpublish a sparklet (revert to draft)
     */
    static async unpublish(id: string): Promise<void> {
        await this.updateSparkletStatus(id, 'draft');
    }

    /**
     * Internal status update
     */
    private static async updateSparkletStatus(id: string, status: 'draft' | 'pending' | 'published'): Promise<void> {
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) throw new Error('Firestore not available');

        const docRef = doc(db, SPARKLETS_COLLECTION, id);
        await setDoc(docRef, {
            status,
            isPublished: status === 'published'
        }, { merge: true });
    }

    /**
     * Add a new sparklet to the database
     */
    static async createSparklet(sparklet: Omit<Sparklet, 'metadata'> & { metadata: Omit<SparkletMetadata, 'id'> }): Promise<string> {
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) throw new Error('Firestore not available');

        const docRef = await addDoc(collection(db, SPARKLETS_COLLECTION), {
            title: sparklet.metadata.title,
            description: sparklet.metadata.description,
            icon: sparklet.metadata.icon,
            category: sparklet.metadata.category,
            isBeta: sparklet.metadata.isBeta || false,
            type: sparklet.type,
            createdAt: Timestamp.now()
        });

        return docRef.id;
    }

    /**
     * Seed initial sparklets if they don't exist.
     * Uses fixed IDs to prevent duplicates.
     */
    static async seedInitialSparklets(): Promise<void> {
        console.log('🌱 [SparkletService] seedInitialSparklets started');
        await WebFirebaseService.initialize();
        const db = (WebFirebaseService as any).db;
        if (!db) return;

        const seeds = [
            {
                id: 'tic-tac-toe',
                metadata: {
                    title: 'Tic Tac Toe',
                    description: 'Classic game of 3-in-a-row.',
                    icon: '❌⭕',
                    category: 'game',
                    isBeta: true,
                },
                type: 'game',
                definition: JSON.stringify({
                    initialState: {
                        board: Array(9).fill(''),
                        isXNext: true,
                        winner: null,
                        status: 'Next player: X'
                    },
                    helpers: {
                        calculateWinner: `
                            const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
                            for(let i=0; i<lines.length; i++){
                                const [a,b,c] = lines[i];
                                if(state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) return state.board[a];
                            }
                            return null;
                        `
                    },
                    actions: {
                        onCellPress: `
                            const { index } = params;
                            if (state.board[index] || state.winner) return state;

                            const newBoard = [...state.board];
                            newBoard[index] = state.isXNext ? 'X' : 'O';
                            const nextIsX = !state.isXNext;

                            // Check for winner using the helper
                            const winner = helpers.calculateWinner({ ...state, board: newBoard });
                            const isDraw = !winner && newBoard.every(s => s !== '');
                            const status = winner ? 'Winner: ' + winner : (isDraw ? 'It is a draw!' : 'Next player: ' + (nextIsX ? 'X' : 'O'));

                            return {
                                ...state,
                                board: newBoard,
                                isXNext: nextIsX,
                                winner,
                                status
                            };
                        `,
                        reset: `
                            return {
                                board: Array(9).fill(''),
                                isXNext: true,
                                winner: null,
                                status: 'Next player: X'
                            };
                        `
                    },
                    view: {
                        elements: [
                            { type: 'text', value: '{{state.status}}', style: 'status' },
                            {
                                type: 'grid',
                                rows: 3,
                                cols: 3,
                                dataSource: 'state.board',
                                onPress: 'onCellPress',
                                style: 'board'
                            },
                            { type: 'button', label: 'Play Again', onPress: 'reset', style: 'resetButton' }
                        ],
                        styles: {
                            status: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
                            board: { width: 300, height: 300 },
                            resetButton: { marginTop: 40, padding: 15, borderRadius: 25, backgroundColor: '#3b82f6' }
                        }
                    }
                })
            },
            {
                id: 'sparklets-wizard',
                metadata: {
                    title: 'Sparklets Wizard',
                    description: 'The meta-sparklet. Summon new sparklets into existence.',
                    icon: '🧙‍♂️✨',
                    category: 'meta',
                    isBeta: true,
                },
                type: 'meta',
                definition: JSON.stringify({
                    initialState: { prompt: '' },
                    view: {
                        elements: [
                            { type: 'text', value: 'What would you like to build?', style: 'title' },
                            { type: 'input', placeholder: 'e.g. A coin flip game', binding: 'state.prompt' },
                            { type: 'button', label: 'Summon Sparklet', onPress: 'generate' }
                        ]
                    }
                })
            }
        ];

        for (const seed of seeds) {
            const docRef = doc(db, SPARKLETS_COLLECTION, seed.id);

            // For Beta, we ALWAYS update seeds to ensure the latest definition logic is in DB
            console.log(`🌱 Seeding/Updating initial sparklet: ${seed.metadata.title}`);
            await setDoc(docRef, {
                title: seed.metadata.title,
                description: seed.metadata.description,
                icon: seed.metadata.icon,
                category: seed.metadata.category,
                isBeta: seed.metadata.isBeta || false,
                type: seed.type,
                definition: seed.definition,
                createdAt: Timestamp.now(),
                ownerId: 'system',
                status: 'published'
            });
        }
        console.log('🌱 [SparkletService] seedInitialSparklets complete');
    }
}
