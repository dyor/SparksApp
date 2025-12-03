import { createCommonStyles } from '../CommonStyles';
import { ThemeColors } from '../../contexts/ThemeContext';

// Mock theme colors for testing
const mockColors: ThemeColors = {
    primary: '#007AFF',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
};

describe('createCommonStyles', () => {
    let styles: ReturnType<typeof createCommonStyles>;

    beforeEach(() => {
        styles = createCommonStyles(mockColors);
    });

    it('creates a styles object', () => {
        expect(styles).toBeDefined();
        expect(typeof styles).toBe('object');
    });

    describe('container styles', () => {
        it('has container style with flex and background', () => {
            expect(styles.container).toBeDefined();
            expect(styles.container.flex).toBe(1);
            expect(styles.container.backgroundColor).toBe(mockColors.background);
        });

        it('has scrollContainer style', () => {
            expect(styles.scrollContainer).toBeDefined();
            expect(styles.scrollContainer.flexGrow).toBe(1);
            expect(styles.scrollContainer.padding).toBeGreaterThan(0);
        });
    });

    describe('typography styles', () => {
        it('has title style', () => {
            expect(styles.title).toBeDefined();
            expect(styles.title.fontSize).toBe(28);
            expect(styles.title.fontWeight).toBe('bold');
            expect(styles.title.color).toBe(mockColors.text);
        });

        it('has subtitle style', () => {
            expect(styles.subtitle).toBeDefined();
            expect(styles.subtitle.fontSize).toBe(16);
            expect(styles.subtitle.color).toBe(mockColors.textSecondary);
            expect(styles.subtitle.textAlign).toBe('center');
        });

        it('has sectionTitle style', () => {
            expect(styles.sectionTitle).toBeDefined();
            expect(styles.sectionTitle.fontSize).toBe(20);
            expect(styles.sectionTitle.fontWeight).toBe('600');
        });
    });

    describe('card styles', () => {
        it('has card style with surface background', () => {
            expect(styles.card).toBeDefined();
            expect(styles.card.backgroundColor).toBe(mockColors.surface);
            expect(styles.card.borderRadius).toBeGreaterThan(0);
            expect(styles.card.padding).toBeGreaterThan(0);
        });
    });

    describe('button styles', () => {
        it('has primaryButton style', () => {
            expect(styles.primaryButton).toBeDefined();
            expect(styles.primaryButton.backgroundColor).toBe(mockColors.primary);
            expect(styles.primaryButton.alignItems).toBe('center');
        });

        it('has primaryButtonText style', () => {
            expect(styles.primaryButtonText).toBeDefined();
            expect(styles.primaryButtonText.color).toBe('#fff');
            expect(styles.primaryButtonText.fontWeight).toBe('600');
        });

        it('has secondaryButton style', () => {
            expect(styles.secondaryButton).toBeDefined();
            expect(styles.secondaryButton.backgroundColor).toBe(mockColors.border);
        });
    });

    describe('input styles', () => {
        it('has input style', () => {
            expect(styles.input).toBeDefined();
            expect(styles.input.backgroundColor).toBe(mockColors.background);
            expect(styles.input.borderColor).toBe(mockColors.border);
            expect(styles.input.borderWidth).toBe(1);
            expect(styles.input.color).toBe(mockColors.text);
        });
    });

    describe('modal styles', () => {
        it('has modalOverlay style', () => {
            expect(styles.modalOverlay).toBeDefined();
            expect(styles.modalOverlay.flex).toBe(1);
            expect(styles.modalOverlay.backgroundColor).toBe('rgba(0, 0, 0, 0.5)');
            expect(styles.modalOverlay.justifyContent).toBe('center');
        });

        it('has modalContent style', () => {
            expect(styles.modalContent).toBeDefined();
            expect(styles.modalContent.backgroundColor).toBe(mockColors.surface);
            expect(styles.modalContent.width).toBe('90%');
        });

        it('has modalTitle style', () => {
            expect(styles.modalTitle).toBeDefined();
            expect(styles.modalTitle.fontWeight).toBe('bold');
            expect(styles.modalTitle.textAlign).toBe('center');
        });
    });

    describe('empty state styles', () => {
        it('has emptyState style', () => {
            expect(styles.emptyState).toBeDefined();
            expect(styles.emptyState.alignItems).toBe('center');
        });

        it('has emptyText style', () => {
            expect(styles.emptyText).toBeDefined();
            expect(styles.emptyText.color).toBe(mockColors.textSecondary);
            expect(styles.emptyText.textAlign).toBe('center');
        });
    });

    it('applies theme colors correctly', () => {
        const darkColors: ThemeColors = {
            ...mockColors,
            background: '#000000',
            text: '#FFFFFF',
        };

        const darkStyles = createCommonStyles(darkColors);

        expect(darkStyles.container.backgroundColor).toBe(darkColors.background);
        expect(darkStyles.title.color).toBe(darkColors.text);
    });
});
