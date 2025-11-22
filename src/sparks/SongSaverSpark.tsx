import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Dimensions,
    Linking,
    TouchableWithoutFeedback,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { SettingsContainer, SettingsScrollView, SettingsHeader, SettingsFeedbackSection } from '../components/SettingsComponents';

const { width: screenWidth } = Dimensions.get('window');

interface SpotifyTrack {
    id: string;
    url: string;
    isEmbed: boolean;
    title?: string;
    addedAt: number;
    category?: string;
    name?: string;
    color?: string;
}

interface SongSaverSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
    onStateChange?: (state: any) => void;
    onComplete?: (result: any) => void;
}

const SongSaverSpark: React.FC<SongSaverSparkProps> = ({
    showSettings = false,
    onCloseSettings,
    onStateChange,
    onComplete,
}) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();
    const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [filteredTracks, setFilteredTracks] = useState<SpotifyTrack[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTrack, setEditingTrack] = useState<SpotifyTrack | null>(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editUrl, setEditUrl] = useState('');
    const [embedInput, setEmbedInput] = useState('');
    const [embedCategory, setEmbedCategory] = useState('');
    const [embedName, setEmbedName] = useState('');
    const isInitializing = useRef(true);

    // Load saved tracks on mount
    useEffect(() => {
        const data = getSparkData('song-saver');
        if (data?.tracks && data.tracks.length > 0) {
            setTracks(data.tracks);
        } else {
            // Initialize with default track
            const defaultTrack: SpotifyTrack = {
                id: '3w3qWhplVQcO5aGU6Ipdhq',
                url: 'https://open.spotify.com/track/3w3qWhplVQcO5aGU6Ipdhq',
                isEmbed: false,
                addedAt: Date.now(),
                category: 'Example',
                name: 'Sample Song',
                color: generateColorFromString('https://open.spotify.com/track/3w3qWhplVQcO5aGU6Ipdhq'),
            };

            const initialTracks = [defaultTrack];
            setTracks(initialTracks);
            setSparkData('song-saver', { tracks: initialTracks });
        }

        setTimeout(() => {
            isInitializing.current = false;
        }, 100);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save tracks to storage whenever tracks change
    useEffect(() => {
        if (isInitializing.current) {
            return;
        }

        if (tracks.length === 0) {
            return;
        }

        setSparkData('song-saver', { tracks });
    }, [tracks, setSparkData]);

    // Update filtered tracks when tracks or selectedCategory changes
    useEffect(() => {
        if (selectedCategory) {
            setFilteredTracks(tracks.filter(track => track.category === selectedCategory));
        } else {
            setFilteredTracks(tracks);
        }
    }, [tracks, selectedCategory]);

    // Generate consistent color from string (URL)
    const generateColorFromString = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Use HSL for vibrant colors with good contrast
        const hue = Math.abs(hash % 360);
        const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
        const lightness = 45 + (Math.abs(hash >> 8) % 15); // 45-60%

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    // Get all unique categories from tracks
    const getCategories = (): string[] => {
        const categories = tracks.map(track => track.category).filter(Boolean) as string[];
        return Array.from(new Set(categories)).sort();
    };

    // Parse category and URL/embed from input
    const parseCategoryAndInput = (input: string): { category?: string; content: string } => {
        // Find the last ':' that is not followed by '//' or part of HTML
        let separatorIndex = -1;
        for (let i = input.length - 1; i >= 0; i--) {
            if (input[i] === ':' && !input.substring(i).startsWith('://')) {
                separatorIndex = i;
                break;
            }
        }

        if (separatorIndex > 0) {
            const potentialCategory = input.substring(0, separatorIndex).trim();
            const remainingContent = input.substring(separatorIndex + 1).trim();

            // Check if the remaining part looks like a URL or iframe
            if (remainingContent.startsWith('http') || remainingContent.startsWith('<iframe') ||
                remainingContent.includes('spotify.com')) {
                return {
                    category: potentialCategory,
                    content: remainingContent
                };
            }
        }

        // Fallback: check if it's just a URL/iframe without category
        if (input.startsWith('http') || input.startsWith('<iframe') || input.includes('spotify.com')) {
            return { content: input };
        }

        return { content: input };
    };

    // Detect if input is an embed iframe
    const isEmbedIframe = (input: string): boolean => {
        return input.trim().startsWith('<iframe') && input.includes('spotify.com/embed');
    };

    // Parse Spotify URL or embed to extract track ID
    const parseSpotifyInput = (input: string): { trackId: string | null; isEmbed: boolean } => {
        const isEmbed = isEmbedIframe(input);

        if (isEmbed) {
            // Extract track ID from embed iframe src
            const srcMatch = input.match(/src="https:\/\/open\.spotify\.com\/embed\/track\/([a-zA-Z0-9]+)/);
            return {
                trackId: srcMatch ? srcMatch[1] : null,
                isEmbed: true
            };
        } else {
            // Extract track ID from regular URL
            const urlMatch = input.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
            return {
                trackId: urlMatch ? urlMatch[1] : null,
                isEmbed: false
            };
        }
    };

    // Add new track
    const handleAddTrack = async () => {
        if (!newUrl.trim()) {
            Alert.alert('Error', 'Please enter a Spotify URL or embed code');
            return;
        }

        // Parse category and content
        const { category, content } = parseCategoryAndInput(newUrl.trim());
        const { trackId, isEmbed } = parseSpotifyInput(content);

        if (!trackId) {
            Alert.alert('Error', 'Please enter a valid Spotify URL or embed code');
            return;
        }

        // Check if track already exists
        if (tracks.some(track => track.id === trackId)) {
            Alert.alert('Error', 'This track is already saved');
            return;
        }

        setIsAdding(true);
        HapticFeedback.light();

        try {
            const newTrack: SpotifyTrack = {
                id: trackId,
                url: content,
                isEmbed: isEmbed,
                addedAt: Date.now(),
                category: category || 'Uncategorized',
                color: isEmbed ? undefined : generateColorFromString(content),
            };

            const updatedTracks = [...tracks, newTrack];
            setTracks(updatedTracks);
            setNewUrl('');

            HapticFeedback.success();
        } catch (error) {
            console.error('Error adding track:', error);
            Alert.alert('Error', 'Failed to add track. Please try again.');
        } finally {
            setIsAdding(false);
        }
    };

    // Play track in Spotify
    const handlePlayTrack = (track: SpotifyTrack) => {
        const spotifyAppUrl = `spotify:track:${track.id}`;
        const spotifyWebUrl = `https://open.spotify.com/track/${track.id}`;

        Linking.canOpenURL(spotifyAppUrl).then((supported) => {
            if (supported) {
                Linking.openURL(spotifyAppUrl);
            } else {
                Linking.openURL(spotifyWebUrl);
            }
        }).catch(() => {
            Linking.openURL(spotifyWebUrl);
        });

        HapticFeedback.light();
    };

    // Handle category filter selection
    const handleCategorySelect = (category: string | null) => {
        setSelectedCategory(category);
        HapticFeedback.light();
    };

    // Handle category pill tap to populate input
    const handleCategoryPillTap = (category: string) => {
        setNewUrl(`${category}: `);
        HapticFeedback.light();
    };

    // Handle long press on track to open management modal
    const handleTrackLongPress = (track: SpotifyTrack) => {
        setEditingTrack(track);
        setEditName(track.name || '');
        setEditCategory(track.category || '');

        // Reconstruct the \"Category: URL\" format for editing
        const categoryUrl = track.category ? `${track.category}: ${track.url}` : track.url;
        setEditUrl(categoryUrl);

        setShowModal(true);
        HapticFeedback.medium();
    };

    // Handle modal close
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTrack(null);
        setEditName('');
        setEditCategory('');
        setEditUrl('');
    };

    // Handle save track changes
    const handleSaveTrack = () => {
        if (!editingTrack) return;

        const { category, content } = parseCategoryAndInput(editUrl);
        const { trackId, isEmbed } = parseSpotifyInput(content);

        if (!trackId) {
            Alert.alert('Error', 'Please enter a valid Spotify URL or embed code');
            return;
        }

        const updatedTrack = {
            ...editingTrack,
            name: editName.trim() || undefined,
            category: category || 'Uncategorized',
            url: content,
            id: trackId,
            isEmbed: isEmbed,
            color: isEmbed ? undefined : generateColorFromString(content),
        };

        const updatedTracks = tracks.map(t => t.id === editingTrack.id ? updatedTrack : t);
        setTracks(updatedTracks);
        handleCloseModal();
        HapticFeedback.success();
    };

    // Handle delete track
    const handleDeleteTrack = () => {
        if (!editingTrack) return;

        Alert.alert(
            'Delete Track',
            'Are you sure you want to delete this track?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const updatedTracks = tracks.filter(track => track.id !== editingTrack.id);
                        setTracks(updatedTracks);
                        handleCloseModal();
                        HapticFeedback.medium();
                    }
                }
            ]
        );
    };

    // Handle add embed from settings
    const handleAddEmbed = async () => {
        if (!embedInput.trim()) {
            Alert.alert('Error', 'Please paste the Spotify embed code');
            return;
        }

        const { trackId, isEmbed } = parseSpotifyInput(embedInput.trim());

        if (!trackId || !isEmbed) {
            Alert.alert('Error', 'Please paste a valid Spotify embed iframe code');
            return;
        }

        // Check if track already exists
        if (tracks.some(track => track.id === trackId)) {
            Alert.alert('Error', 'This track is already saved');
            return;
        }

        HapticFeedback.light();

        try {
            const newTrack: SpotifyTrack = {
                id: trackId,
                url: embedInput.trim(),
                isEmbed: true,
                addedAt: Date.now(),
                category: embedCategory.trim() || 'Uncategorized',
                name: embedName.trim() || undefined,
            };

            const updatedTracks = [...tracks, newTrack];
            setTracks(updatedTracks);

            // Clear inputs
            setEmbedInput('');
            setEmbedCategory('');
            setEmbedName('');

            HapticFeedback.success();
            Alert.alert('Success', 'Embed track added successfully!');
        } catch (error) {
            console.error('Error adding embed:', error);
            Alert.alert('Error', 'Failed to add embed. Please try again.');
        }
    };

    // Track Card Component - Shows either colored card or embed
    const TrackCard: React.FC<{ track: SpotifyTrack; index: number }> = ({ track, index }) => (
        <TouchableOpacity
            style={[
                track.isEmbed ? styles.embedTrackCard : styles.trackCard,
                { backgroundColor: colors.surface, borderColor: colors.border }
            ]}
            onPress={() => handlePlayTrack(track)}
            onLongPress={() => handleTrackLongPress(track)}
            activeOpacity={0.7}
        >
            {track.isEmbed ? (
                <View style={styles.embedContainer}>
                    <WebView
                        source={{ html: track.url }}
                        style={styles.embedWebView}
                        scrollEnabled={false}
                        pointerEvents="none"
                    />
                </View>
            ) : (
                <View style={[styles.coloredCard, { backgroundColor: track.color || colors.primary }]}>
                    <Text style={styles.musicIcon}>🎵</Text>
                </View>
            )}

            {/* Name pill overlay - top */}
            {track.name && (
                <View style={[styles.namePill, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.namePillText, { color: colors.background }]}>
                        {track.name}
                    </Text>
                </View>
            )}

            {/* Category pill overlay - bottom */}
            {track.category && (
                <View style={[styles.categoryPill, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.categoryPillText, { color: colors.background }]}>
                        {track.category}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            padding: 20,
            borderBottomWidth: 0,
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            color: colors.textSecondary,
        },
        inputContainer: {
            flexDirection: 'row',
            marginTop: 16,
            marginBottom: 20,
            gap: 12,
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            borderWidth: 0,
        },
        urlInput: {
            flex: 1,
            height: 40,
            borderWidth: 0,
            borderRadius: 8,
            paddingHorizontal: 16,
            fontSize: 16,
            color: colors.text,
            backgroundColor: colors.border,
        },
        addButton: {
            height: 40,
            paddingHorizontal: 16,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        addButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        scrollContainer: {
            flex: 1,
        },
        tracksContainer: {
            padding: 20,
            paddingTop: 0,
        },
        tracksGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 12,
        },
        emptyState: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
        },
        emptyIcon: {
            fontSize: 48,
            marginBottom: 16,
        },
        emptyTitle: {
            fontSize: 20,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
            textAlign: 'center',
        },
        emptySubtitle: {
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
        },
        trackCard: {
            width: (screenWidth - 52) / 2,
            aspectRatio: 1, // Square for album-like appearance
            borderRadius: 12,
            borderWidth: 1,
            overflow: 'hidden',
        },
        embedTrackCard: {
            width: screenWidth - 40, // Full width with padding
            height: 200, // Fixed height for embeds
            borderRadius: 12,
            borderWidth: 1,
            overflow: 'hidden',
            marginBottom: 12,
        },
        coloredCard: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
        },
        musicIcon: {
            fontSize: 48,
            opacity: 0.8,
        },
        embedContainer: {
            width: '100%',
            height: '100%',
        },
        embedWebView: {
            flex: 1,
            backgroundColor: 'transparent',
        },
        categoryContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            borderWidth: 0,
        },
        categoryPill: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
        },
        categoryPillText: {
            fontSize: 12,
            fontWeight: '600',
            textAlign: 'center',
        },
        categoryFilterPill: {
            position: 'relative',
            borderWidth: 1,
        },
        categoryFilterText: {
            fontSize: 14,
            fontWeight: '600',
        },
        namePill: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
        },
        namePillText: {
            fontSize: 11,
            fontWeight: '600',
            textAlign: 'center',
        },
        settingsButtonContainer: {
            padding: 20,
            paddingTop: 0,
        },
        settingsCloseButton: {
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
            borderWidth: 1,
            backgroundColor: 'transparent',
        },
        settingsCloseButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        modalContainer: {
            flex: 1,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: '600',
            flex: 1,
            marginRight: 16,
        },
        closeButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        closeButtonText: {
            fontSize: 16,
            fontWeight: 'bold',
        },
        modalContent: {
            flex: 1,
            padding: 20,
        },
        inputGroup: {
            marginBottom: 20,
        },
        inputLabel: {
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8,
        },
        modalInput: {
            height: 50,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 16,
            fontSize: 16,
        },
        multilineInput: {
            height: 120,
            textAlignVertical: 'top',
            paddingTop: 12,
        },
        trackPreview: {
            marginTop: 20,
        },
        previewLabel: {
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 12,
        },
        previewCard: {
            width: 200,
            height: 200,
            borderRadius: 12,
            borderWidth: 1,
            overflow: 'hidden',
            alignSelf: 'center',
        },
        modalActions: {
            flexDirection: 'row',
            padding: 20,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 12,
        },
        modalButton: {
            flex: 1,
            paddingVertical: 16,
            borderRadius: 8,
            alignItems: 'center',
        },
        cancelButton: {
            borderWidth: 1,
            backgroundColor: 'transparent',
        },
        deleteButton: {
            // Error color applied via backgroundColor
        },
        saveButton: {
            // Primary color applied via backgroundColor
        },
        modalButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        settingsSection: {
            padding: 20,
            paddingTop: 0,
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: '700',
            marginBottom: 8,
        },
        sectionSubtitle: {
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 20,
        },
        settingsInputGroup: {
            marginBottom: 16,
        },
        settingsInputLabel: {
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 8,
        },
        settingsInput: {
            height: 50,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 16,
            fontSize: 16,
        },
        settingsMultilineInput: {
            height: 150,
            textAlignVertical: 'top',
            paddingTop: 12,
        },
        addEmbedButton: {
            paddingVertical: 16,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 8,
        },
        addEmbedButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
    });

    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title="Song Saver Settings"
                        subtitle="Manage your saved Spotify tracks"
                        icon="🎵"
                        sparkId="song-saver"
                    />

                    <SettingsFeedbackSection sparkName="Song Saver" sparkId="song-saver" />

                    {/* Add Embed Section */}
                    <View style={styles.settingsSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Add Song as Embed
                        </Text>
                        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                            Paste the full Spotify embed iframe code below
                        </Text>

                        <View style={styles.settingsInputGroup}>
                            <Text style={[styles.settingsInputLabel, { color: colors.text }]}>
                                Category (Optional)
                            </Text>
                            <TextInput
                                style={[styles.settingsInput, {
                                    borderColor: colors.border,
                                    color: colors.text,
                                    backgroundColor: colors.surface
                                }]}
                                placeholder="e.g., Workout, Chill, etc."
                                placeholderTextColor={colors.textSecondary}
                                value={embedCategory}
                                onChangeText={setEmbedCategory}
                            />
                        </View>

                        <View style={styles.settingsInputGroup}>
                            <Text style={[styles.settingsInputLabel, { color: colors.text }]}>
                                Name (Optional)
                            </Text>
                            <TextInput
                                style={[styles.settingsInput, {
                                    borderColor: colors.border,
                                    color: colors.text,
                                    backgroundColor: colors.surface
                                }]}
                                placeholder="Give this track a custom name"
                                placeholderTextColor={colors.textSecondary}
                                value={embedName}
                                onChangeText={setEmbedName}
                            />
                        </View>

                        <View style={styles.settingsInputGroup}>
                            <Text style={[styles.settingsInputLabel, { color: colors.text }]}>
                                Embed Code *
                            </Text>
                            <TextInput
                                style={[styles.settingsInput, styles.settingsMultilineInput, {
                                    borderColor: colors.border,
                                    color: colors.text,
                                    backgroundColor: colors.surface
                                }]}
                                placeholder='<iframe src="https://open.spotify.com/embed/track/..." ...'
                                placeholderTextColor={colors.textSecondary}
                                value={embedInput}
                                onChangeText={setEmbedInput}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.addEmbedButton, { backgroundColor: colors.primary }]}
                            onPress={handleAddEmbed}
                        >
                            <Text style={[styles.addEmbedButtonText, { color: colors.background }]}>
                                Add Embed Track
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.settingsButtonContainer}>
                        <TouchableOpacity
                            style={[styles.settingsCloseButton, { borderColor: colors.border }]}
                            onPress={() => onCloseSettings?.()}
                        >
                            <Text style={[styles.settingsCloseButtonText, { color: colors.text }]}>
                                Close
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>🎵 Song Saver</Text>
                        <Text style={styles.subtitle}>Save and organize your favorite Spotify tracks</Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.urlInput}
                                placeholder="Category: spotify URL or embed code"
                                placeholderTextColor={colors.textSecondary}
                                value={newUrl}
                                onChangeText={setNewUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                multiline
                                numberOfLines={2}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                            />
                            <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: colors.primary }]}
                                onPress={handleAddTrack}
                                disabled={isAdding}
                            >
                                <Text style={[styles.addButtonText, { color: colors.background }]}>
                                    {isAdding ? 'Adding...' : 'Add'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Category Filter Pills */}
                        {getCategories().length > 0 && (
                            <View style={styles.categoryContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.categoryPill,
                                        styles.categoryFilterPill,
                                        {
                                            backgroundColor: selectedCategory === null ? colors.primary : colors.surface,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => handleCategorySelect(null)}
                                >
                                    <Text style={[
                                        styles.categoryFilterText,
                                        { color: selectedCategory === null ? colors.background : colors.text }
                                    ]}>
                                        All
                                    </Text>
                                </TouchableOpacity>

                                {getCategories().map((category) => (
                                    <TouchableOpacity
                                        key={category}
                                        style={[
                                            styles.categoryPill,
                                            styles.categoryFilterPill,
                                            {
                                                backgroundColor: selectedCategory === category ? colors.primary : colors.surface,
                                                borderColor: colors.border
                                            }
                                        ]}
                                        onPress={() => {
                                            handleCategorySelect(category);
                                            handleCategoryPillTap(category);
                                        }}
                                    >
                                        <Text style={[
                                            styles.categoryFilterText,
                                            { color: selectedCategory === category ? colors.background : colors.text }
                                        ]}>
                                            {category}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Tracks Content */}
                    <View style={styles.tracksContainer}>
                        {filteredTracks.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>🎵</Text>
                                <Text style={styles.emptyTitle}>
                                    {tracks.length === 0 ? 'No Tracks Saved Yet' : 'No Tracks in This Category'}
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    {tracks.length === 0
                                        ? 'Add your favorite Spotify tracks by pasting URLs or embed codes above'
                                        : 'Try selecting a different category or add more tracks'
                                    }
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Embeds - Full Width at Top */}
                                {filteredTracks.filter(track => track.isEmbed).map((track, index) => (
                                    <TrackCard key={track.id} track={track} index={index} />
                                ))}

                                {/* Simple Cards - 2 Column Grid */}
                                {filteredTracks.filter(track => !track.isEmbed).length > 0 && (
                                    <View style={styles.tracksGrid}>
                                        {filteredTracks.filter(track => !track.isEmbed).map((track, index) => (
                                            <TrackCard key={track.id} track={track} index={index} />
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>

                {/* Edit Modal */}
                <Modal
                    visible={showModal}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={handleCloseModal}
                >
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Track</Text>
                            <TouchableOpacity
                                style={[styles.closeButton, { backgroundColor: colors.border }]}
                                onPress={handleCloseModal}
                            >
                                <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Name (Optional)</Text>
                                <TextInput
                                    style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
                                    placeholder="Give this track a name"
                                    placeholderTextColor={colors.textSecondary}
                                    value={editName}
                                    onChangeText={setEditName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>URL or Embed Code</Text>
                                <TextInput
                                    style={[styles.modalInput, styles.multilineInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
                                    placeholder="Category: spotify URL or embed code"
                                    placeholderTextColor={colors.textSecondary}
                                    value={editUrl}
                                    onChangeText={setEditUrl}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            {editingTrack && (
                                <View style={styles.trackPreview}>
                                    <Text style={[styles.previewLabel, { color: colors.text }]}>Preview</Text>
                                    <View style={[styles.previewCard, { borderColor: colors.border }]}>
                                        {parseSpotifyInput(parseCategoryAndInput(editUrl).content).isEmbed ? (
                                            <View style={styles.embedContainer}>
                                                <WebView
                                                    source={{ html: parseCategoryAndInput(editUrl).content }}
                                                    style={styles.embedWebView}
                                                    scrollEnabled={false}
                                                    pointerEvents="none"
                                                />
                                            </View>
                                        ) : (
                                            <View style={[styles.coloredCard, {
                                                backgroundColor: generateColorFromString(parseCategoryAndInput(editUrl).content)
                                            }]}>
                                                <Text style={styles.musicIcon}>🎵</Text>
                                            </View>
                                        )}

                                        {editName && (
                                            <View style={[styles.namePill, { backgroundColor: colors.secondary }]}>
                                                <Text style={[styles.namePillText, { color: colors.background }]}>
                                                    {editName}
                                                </Text>
                                            </View>
                                        )}

                                        {parseCategoryAndInput(editUrl).category && (
                                            <View style={[styles.categoryPill, { backgroundColor: colors.primary }]}>
                                                <Text style={[styles.categoryPillText, { color: colors.background }]}>
                                                    {parseCategoryAndInput(editUrl).category}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                                onPress={handleCloseModal}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.deleteButton, { backgroundColor: colors.error }]}
                                onPress={handleDeleteTrack}
                            >
                                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Delete</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                                onPress={handleSaveTrack}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.background }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </TouchableWithoutFeedback>
    );
};

export default SongSaverSpark;
