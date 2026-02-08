import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal, Clipboard } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { HapticFeedback } from '../../utils/haptics';
import { Sparklet } from '../../types/sparklet';
import { SparkletService } from '../../services/SparkletService';
import { SimpleAnalyticsService } from '../../services/SimpleAnalyticsService';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsSection,
    SettingsFeedbackSection,
    SettingsButton,
    SaveCancelButtons
} from '../../components/SettingsComponents';

interface SparkletEditorProps {
    sparklet: Sparklet;
    onSave: () => void;
    onCancel: () => void;
}

export const SparkletEditor: React.FC<SparkletEditorProps> = ({ sparklet, onSave, onCancel }) => {
    const { colors } = useTheme();

    // Format JSON for better readability if possible
    const initialDefinition = useMemo(() => {
        try {
            return JSON.stringify(JSON.parse(sparklet.definition || '{}'), null, 2);
        } catch (e) {
            return sparklet.definition || '';
        }
    }, [sparklet.definition]);

    const [definition, setDefinition] = useState(initialDefinition);
    const [previousDefinition, setPreviousDefinition] = useState<string | null>(null);
    const [lastSummary, setLastSummary] = useState<string | null>(null);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [refinement, setRefinement] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [status, setStatus] = useState<'draft' | 'pending' | 'published'>(sparklet.metadata.status || 'draft');
    const [isDuplicating, setIsDuplicating] = useState(false);

    const currentUserId = SimpleAnalyticsService.getUserId() || SimpleAnalyticsService.getDeviceId();
    const isOwner = sparklet.metadata.ownerId === currentUserId;
    const isPublished = status === 'published';
    const isPending = status === 'pending';
    const isReadOnly = isPublished && !isOwner; // Even owners must unpublish to edit, but for others it is strictly read-only

    const handleSave = async () => {
        if (isSaving || isRefining || isReadOnly) return;

        try {
            // Basic JSON validation
            JSON.parse(definition);
        } catch (e) {
            Alert.alert('Invalid JSON', 'Please ensure the definition is valid JSON.');
            return;
        }

        setIsSaving(true);
        HapticFeedback.success();
        try {
            await SparkletService.updateSparkletDefinition(sparklet.metadata.id, definition);
            onSave();
        } catch (error) {
            console.error('Failed to save sparklet:', error);
            Alert.alert('Save Failed', 'Unable to update sparklet definition.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRefine = async () => {
        if (!refinement.trim() || isRefining || isSaving || isReadOnly) return;

        setIsRefining(true);
        HapticFeedback.medium();

        try {
            // Save current version for revert
            setPreviousDefinition(definition);

            const vision = `CURRENT DEFINITION: ${definition}\n\nREFINEMENT INSTRUCTION: ${refinement}`;
            const result = await SparkletService.generateSparkletDefinition(vision);

            setDefinition(JSON.stringify(result.definition, null, 2));
            setLastSummary(result.summary);
            setRefinement('');
            HapticFeedback.success();
        } catch (error) {
            console.error('Refinement failed:', error);
            Alert.alert('Refinement Failed', 'The Wizard was unable to weave your changes.');
        } finally {
            setIsRefining(false);
        }
    };

    const handleRevert = () => {
        if (previousDefinition) {
            setDefinition(previousDefinition);
            setPreviousDefinition(null);
            setLastSummary(null);
            HapticFeedback.medium();
        }
    };

    const handleCopyCode = () => {
        Clipboard.setString(definition);
        HapticFeedback.success();
        Alert.alert('Copied', 'Sparklet definition copied to clipboard.');
    };

    const handleRequestPublication = async () => {
        HapticFeedback.medium();
        try {
            await SparkletService.requestPublication(sparklet.metadata.id);
            setStatus('pending');
            Alert.alert('Request Sent', 'Your sparklet has been submitted for review. It will remain private until approved.');
        } catch (error) {
            Alert.alert('Error', 'Failed to request publication.');
        }
    };

    const handleUnpublish = async () => {
        if (!isOwner) return;

        HapticFeedback.medium();
        try {
            await SparkletService.unpublish(sparklet.metadata.id);
            setStatus('draft');
            Alert.alert('Unpublished', 'Sparklet is now a draft and can be edited.');
        } catch (error) {
            Alert.alert('Error', 'Failed to unpublish sparklet.');
        }
    };

    const handleDuplicate = async () => {
        setIsDuplicating(true);
        HapticFeedback.medium();
        try {
            const newId = await SparkletService.duplicateSparklet(sparklet.metadata.id);
            Alert.alert(
                'Duplicate Created',
                'A copy has been added to "My Sparklets".',
                [{ text: 'OK', onPress: onSave }]
            );
        } catch (error) {
            console.error('Duplication failed:', error);
            Alert.alert('Error', 'Failed to duplicate sparklet.');
        } finally {
            setIsDuplicating(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title={`Edit ${sparklet.metadata.title}`}
                        subtitle={isPublished ? "Read-only (Published)" : "Modify logic, state, and UI"}
                        icon={sparklet.metadata.icon || '♾️'}
                        sparkId="infinite"
                    />

                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, {
                            backgroundColor: isPublished ? '#10b981' : (isPending ? colors.warning : colors.border)
                        }]}>
                            <Text style={styles.statusText}>{status.toUpperCase()}</Text>
                        </View>
                        {isPublished && (
                            <Text style={[styles.readOnlyWarning, { color: colors.textSecondary }]}>
                                🔒 Published sparklets are read-only for security. Unpublish to edit.
                            </Text>
                        )}
                    </View>

                    <SettingsFeedbackSection sparkId="infinite" sparkName={sparklet.metadata.title} />

                    <SettingsSection title="🧠 AI Refinement">
                        <View style={[styles.refineBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.refineInput, { color: colors.text }]}
                                placeholder="e.g., Change the grid to 4x4 or add a score tracker"
                                placeholderTextColor={colors.textSecondary}
                                value={refinement}
                                onChangeText={setRefinement}
                                multiline
                                editable={!isReadOnly}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.refineButton,
                                    { backgroundColor: (refinement.trim() && !isRefining && !isReadOnly) ? colors.primary : colors.border }
                                ]}
                                onPress={handleRefine}
                                disabled={!refinement.trim() || isRefining || isReadOnly}
                            >
                                {isRefining ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.refineButtonText}>Refine with AI ✨</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {lastSummary && (
                            <View style={[styles.summaryBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                                <Text style={[styles.summaryTitle, { color: colors.primary }]}>✨ AI Summary</Text>
                                <Text style={[styles.summaryText, { color: colors.text }]}>{lastSummary}</Text>
                                {previousDefinition && (
                                    <TouchableOpacity style={styles.revertButton} onPress={handleRevert}>
                                        <Text style={[styles.revertText, { color: colors.primary }]}>↺ Revert AI Changes</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {isRefining && (
                            <View style={styles.pendingContainer}>
                                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                                <Text style={[styles.pendingText, { color: colors.primary }]}>
                                    🪄 Weaving new magic...
                                </Text>
                            </View>
                        )}
                    </SettingsSection>

                    <SettingsSection title="📜 Definition (JSON)">
                        <View style={styles.codeButtonRow}>
                            <TouchableOpacity
                                style={[styles.codeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => setShowCodeModal(true)}
                            >
                                <Text style={[styles.codeButtonText, { color: colors.text }]}>👁️ View Code</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.codeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={handleCopyCode}
                            >
                                <Text style={[styles.codeButtonText, { color: colors.text }]}>📋 Copy Code</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1, marginTop: 10 }
                            ]}
                            onPress={handleDuplicate}
                            disabled={isDuplicating}
                        >
                            {isDuplicating ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={[styles.actionButtonText, { color: colors.primary }]}>👯 Duplicate Sparklet</Text>
                            )}
                        </TouchableOpacity>

                        <Text style={[styles.codeHelp, { color: colors.textSecondary }]}>
                            Edit code in full-screen view or use AI to refine logic.
                        </Text>
                    </SettingsSection>

                    <SettingsSection title="🌐 Visibility & Community">
                        {isPublished ? (
                            isOwner ? (
                                <TouchableOpacity style={[styles.unpublishButton, { borderColor: '#ef4444' }]} onPress={handleUnpublish}>
                                    <Text style={[styles.unpublishButtonText, { color: '#ef4444' }]}>Unpublish to Edit</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={[styles.readOnlyBadge, { backgroundColor: colors.border }]}>
                                    <Text style={[styles.readOnlyBadgeText, { color: colors.textSecondary }]}>COMMUNITY SPARKLET</Text>
                                </View>
                            )
                        ) : (
                            <TouchableOpacity
                                style={[styles.publishButton, { backgroundColor: isPending ? colors.border : colors.primary }]}
                                onPress={handleRequestPublication}
                                disabled={isPending}
                            >
                                <Text style={styles.publishButtonText}>
                                    {isPending ? "Waiting for Review..." : "Request Publication ✨"}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <Text style={[styles.communityHelp, { color: colors.textSecondary }]}>
                            {isPublished
                                ? (isOwner ? "This sparklet is live. Unpublish it if you need to make changes." : "You are viewing a published community sparklet. Duplicate it to make your own version.")
                                : "Publishing makes your sparklet discoverable by all users after it has been reviewed for safety."}
                        </Text>
                    </SettingsSection>

                    <View style={styles.footerActions}>
                        <SaveCancelButtons
                            onSave={handleSave}
                            onCancel={onCancel}
                            saveText={isSaving ? "Saving..." : "Save Changes"}
                            saveDisabled={isSaving || isRefining || isReadOnly}
                        />
                    </View>

                    <View style={styles.spacer} />
                </SettingsScrollView>
            </SettingsContainer>

            {/* Code Modal */}
            <Modal
                visible={showCodeModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={() => setShowCodeModal(false)} style={styles.closeButton}>
                            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>Close</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Definition Editor</Text>
                        <TouchableOpacity onPress={() => setShowCodeModal(false)} style={styles.saveButton}>
                            <Text style={[styles.saveButtonText, { color: colors.primary }]}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent}>
                        <TextInput
                            style={[styles.codeEditorLarge, {
                                backgroundColor: colors.surface,
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            value={definition}
                            onChangeText={setDefinition}
                            multiline
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            editable={!isReadOnly}
                        />
                    </ScrollView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    refineBox: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 8,
    },
    refineInput: {
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    refineButton: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    refineButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    pendingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    pendingText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    codeEditor: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 12,
        minHeight: 300,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        textAlignVertical: 'top',
    },
    footerActions: {
        marginTop: 10,
        marginBottom: 20,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 10,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    readOnlyWarning: {
        fontSize: 11,
        fontStyle: 'italic',
        flex: 1,
    },
    publishButton: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    publishButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    unpublishButton: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    unpublishButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    communityHelp: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    spacer: {
        height: 40,
    },
    summaryBox: {
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    summaryTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    summaryText: {
        fontSize: 13,
        lineHeight: 18,
    },
    revertButton: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    revertText: {
        fontSize: 12,
        fontWeight: '600',
    },
    codeButtonRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8,
    },
    codeButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    codeButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    codeHelp: {
        fontSize: 11,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 10 : 16,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        fontSize: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    saveButton: {
        padding: 8,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    codeEditorLarge: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 12,
        minHeight: 500,
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        textAlignVertical: 'top',
    },
    actionButton: {
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    readOnlyBadge: {
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    readOnlyBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
});
