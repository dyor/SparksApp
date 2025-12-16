import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
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
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { SettingsContainer, SettingsScrollView, SettingsHeader, SettingsFeedbackSection } from '../components/SettingsComponents';
import ShareableSparkService, { ShareableItem } from '../services/ShareableSparkService';
import { FriendSelectionModal } from '../components/FriendSelectionModal';
import { Friend } from '../services/FriendService';

const { width: screenWidth } = Dimensions.get('window');

interface ShortVideo {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  addedAt: number;
  category?: string;
  name?: string;
}

interface ShortSaverSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

const ShortSaverSpark: React.FC<ShortSaverSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredVideos, setFilteredVideos] = useState<ShortVideo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ShortVideo | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const isInitializing = useRef(true);

  // Register as shareable spark
  useEffect(() => {
    ShareableSparkService.registerSpark({
      sparkId: 'short-saver',
      sharingModel: 'copy',
      getShareableItems: async (): Promise<ShareableItem[]> => {
        return videos.map(video => ({
          id: video.id,
          title: video.name || video.title,
          description: video.category,
          preview: video.thumbnail,
          sparkId: 'short-saver',
          data: video,
        }));
      },
      onShareItem: async (itemId: string, friendId: string) => {
        const video = videos.find(v => v.id === itemId);
        if (!video) {
          throw new Error('Video not found');
        }
        await ShareableSparkService.shareItemCopy('short-saver', itemId, friendId, video);
      },
    });
  }, [videos]);

  // Load saved videos on mount
  useEffect(() => {
    const data = getSparkData('short-saver');
    if (data?.videos && data.videos.length > 0) {
      // Load saved videos
      setVideos(data.videos);
    } else {
      // Initialize with default video if no saved data exists
      const defaultVideo: ShortVideo = {
        id: 'ShKH1p_uWaA',
        url: 'https://www.youtube.com/shorts/ShKH1p_uWaA',
        title: 'Nate on fighting orangutan',
        thumbnail: 'https://img.youtube.com/vi/ShKH1p_uWaA/maxresdefault.jpg',
        addedAt: Date.now(),
        category: 'Funny',
        name: 'Nate on fighting orangutan'
      };

      const initialVideos = [defaultVideo];
      setVideos(initialVideos);
      setSparkData('short-saver', { videos: initialVideos });
    }

    // Mark initialization as complete after a brief delay to ensure state is set
    setTimeout(() => {
      isInitializing.current = false;
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Save videos to storage whenever videos change (but not on initial load)
  useEffect(() => {
    // Skip save during initialization
    if (isInitializing.current) {
      return;
    }

    // Skip save if videos array is empty
    if (videos.length === 0) {
      return;
    }

    // Save to persistent storage
    setSparkData('short-saver', { videos });
  }, [videos, setSparkData]);

  // Update filtered videos when videos or selectedCategory changes
  useEffect(() => {
    if (selectedCategory) {
      setFilteredVideos(videos.filter(video => video.category === selectedCategory));
    } else {
      setFilteredVideos(videos);
    }
  }, [videos, selectedCategory]);

  // Get all unique categories from videos
  const getCategories = (): string[] => {
    const categories = videos.map(video => video.category).filter(Boolean) as string[];
    return Array.from(new Set(categories)).sort();
  };

  // Parse category and URL from input
  const parseCategoryAndUrl = (input: string): { category?: string; url: string } => {
    // Find the last ':' that is not followed by '//'
    let separatorIndex = -1;
    for (let i = input.length - 1; i >= 0; i--) {
      if (input[i] === ':' && !input.substring(i).startsWith('://')) {
        separatorIndex = i;
        break;
      }
    }

    if (separatorIndex > 0) {
      const potentialCategory = input.substring(0, separatorIndex).trim();
      const remainingUrl = input.substring(separatorIndex + 1).trim();

      // Check if the remaining part looks like a URL
      if (remainingUrl.startsWith('http') || remainingUrl.includes('youtube.com') || remainingUrl.includes('youtu.be')) {
        return {
          category: potentialCategory,
          url: remainingUrl
        };
      }
    }

    // Fallback: check if it's just a URL without category
    if (input.startsWith('http') || input.includes('youtube.com') || input.includes('youtu.be')) {
      return { url: input };
    }

    return { url: input };
  };

  // Parse YouTube Short URL to extract video ID
  const parseYouTubeUrl = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // Generate YouTube thumbnail URL
  const getThumbnailUrl = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  // Add new video
  const handleAddVideo = async () => {
    if (!newUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube URL');
      return;
    }

    // Parse category and URL
    const { category, url } = parseCategoryAndUrl(newUrl.trim());
    const videoId = parseYouTubeUrl(url);

    if (!videoId) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    // Check if video already exists
    if (videos.some(video => video.id === videoId)) {
      Alert.alert('Error', 'This video is already saved');
      return;
    }

    setIsAdding(true);
    HapticFeedback.light();

    try {
      const newVideo: ShortVideo = {
        id: videoId,
        url: url,
        title: `YouTube Short ${videoId}`, // We'll try to get the real title later
        thumbnail: getThumbnailUrl(videoId),
        addedAt: Date.now(),
        category: category || 'Uncategorized',
      };

      const updatedVideos = [...videos, newVideo];
      setVideos(updatedVideos);
      setNewUrl('');

      HapticFeedback.success();
    } catch (error) {
      console.error('Error adding video:', error);
      Alert.alert('Error', 'Failed to add video. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };


  // Play video directly in YouTube
  const handlePlayVideo = (video: ShortVideo) => {
    // Try multiple URL formats to maximize autoplay success
    const youtubeAppUrl = `vnd.youtube://${video.id}?autoplay=1&mute=0`;
    const youtubeWebUrl = `https://www.youtube.com/watch?v=${video.id}&autoplay=1&mute=0&enablejsapi=1`;
    const youtubeShortUrl = `https://youtube.com/shorts/${video.id}?autoplay=1&mute=0`;

    // Try to open in YouTube app first (best experience)
    Linking.canOpenURL(youtubeAppUrl).then((supported) => {
      if (supported) {
        Linking.openURL(youtubeAppUrl);
      } else {
        // Try web version with multiple parameters
        Linking.openURL(youtubeWebUrl);
      }
    }).catch(() => {
      // Final fallback - try shorts URL format
      Linking.openURL(youtubeShortUrl);
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

  // Handle long press on video to open management modal
  const handleVideoLongPress = (video: ShortVideo) => {
    setEditingVideo(video);
    setEditName(video.name || '');
    setEditCategory(video.category || '');

    // Reconstruct the "Category: URL" format for editing
    const categoryUrl = video.category ? `${video.category}: ${video.url}` : video.url;
    setEditUrl(categoryUrl);

    setShowModal(true);
    HapticFeedback.medium();
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVideo(null);
    setEditName('');
    setEditCategory('');
    setEditUrl('');
  };

  // Handle save video changes
  const handleSaveVideo = () => {
    if (!editingVideo) return;

    const { category, url } = parseCategoryAndUrl(editUrl);
    const videoId = parseYouTubeUrl(url);

    if (!videoId) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    const updatedVideo = {
      ...editingVideo,
      name: editName.trim() || undefined,
      category: category || 'Uncategorized',
      url: url,
      id: videoId,
      thumbnail: getThumbnailUrl(videoId),
    };

    const updatedVideos = videos.map(v => v.id === editingVideo.id ? updatedVideo : v);
    setVideos(updatedVideos);
    handleCloseModal();
    HapticFeedback.success();
  };

  // Handle delete video
  const handleDeleteVideo = () => {
    if (!editingVideo) return;

    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedVideos = videos.filter(video => video.id !== editingVideo.id);
            setVideos(updatedVideos);
            handleCloseModal();
            HapticFeedback.medium();
          }
        }
      ]
    );
  };

  // Handle share video
  const handleShareVideo = () => {
    if (!editingVideo) return;
    setShowShareModal(true);
    HapticFeedback.light();
  };

  const handleSelectFriend = async (friend: Friend) => {
    if (!editingVideo) return;

    try {
      await ShareableSparkService.shareItemCopy(
        'short-saver',
        editingVideo.id,
        friend.userId,
        editingVideo
      );
      HapticFeedback.notification('success');
      Alert.alert('Success', `Video shared with ${friend.displayName}!`);
    } catch (error: any) {
      console.error('Error sharing video:', error);
      HapticFeedback.notification('error');
      Alert.alert('Error', error.message || 'Failed to share video');
    }
  };

  const handleAddFriend = () => {
    // Close modals and let user navigate to Friend Spark manually
    setShowShareModal(false);
    handleCloseModal();
    Alert.alert(
      'Add Friend',
      'Please go to Friend Spark to add friends, then come back to share videos.',
      [{ text: 'OK' }]
    );
  };



  // Video Card Component - Grid layout with thumbnails and category pills
  const VideoCard: React.FC<{ video: ShortVideo; index: number }> = ({ video, index }) => (
    <TouchableOpacity
      style={[styles.videoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handlePlayVideo(video)}
      onLongPress={() => handleVideoLongPress(video)}
      activeOpacity={0.7}
    >
      {video.thumbnail ? (
        <Image
          source={{ uri: video.thumbnail }}
          style={styles.cardThumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholderThumbnail, { backgroundColor: colors.border }]}>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            🎬
          </Text>
        </View>
      )}

      {/* Category pill overlay - Top */}
      {video.category && (
        <View style={[styles.categoryPill, { backgroundColor: 'rgba(30, 30, 30, 0.85)' }]}>
          <Text style={[styles.categoryPillText, { color: '#ffffff' }]}>
            {video.category}
          </Text>
        </View>
      )}

      {/* Name pill overlay - Bottom */}
      {video.name && (
        <View style={[styles.namePill, { backgroundColor: 'rgba(30, 30, 30, 0.85)' }]}>
          <Text style={[styles.namePillText, { color: '#ffffff' }]}>
            {video.name}
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
    videosContainer: {
      padding: 20,
      paddingTop: 0,
    },
    videosGrid: {
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
    videoCard: {
      width: (screenWidth - 52) / 2, // 2 columns with gap
      aspectRatio: 9 / 16, // YouTube Shorts aspect ratio
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    cardThumbnail: {
      width: '100%',
      height: '100%',
    },
    placeholderThumbnail: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 32,
    },
    // Category styles
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
      top: 12,
      alignSelf: 'center',
      zIndex: 10,
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
    // Name pill styles
    namePill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      position: 'absolute',
      bottom: 12,
      alignSelf: 'center',
      zIndex: 10,
    },
    namePillText: {
      fontSize: 12,
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
    // Modal styles
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
      height: 80,
      textAlignVertical: 'top',
      paddingTop: 12,
    },
    videoPreview: {
      marginTop: 20,
    },
    previewLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    previewCard: {
      width: (screenWidth - 52) / 2, // Match video card width
      aspectRatio: 9 / 16, // YouTube Shorts aspect ratio (match video card)
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
      alignSelf: 'center',
    },
    previewThumbnail: {
      width: '100%',
      height: '100%',
    },
    previewPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewPlaceholderText: {
      fontSize: 48,
    },
    previewCategoryPill: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
    },
    previewNamePill: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      right: 8,
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
    shareButton: {
      // Secondary color applied via backgroundColor
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Short Saver Settings"
            subtitle="Manage your saved YouTube Shorts"
            icon="🎬"
            sparkId="short-saver"
          />


          <SettingsFeedbackSection sparkName="Short Saver" sparkId="short-saver" />

          {/* Close Button */}
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
            <Text style={styles.title}>🎬 Short Saver</Text>
            <Text style={styles.subtitle}>Save and organize your favorite YouTubes</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.urlInput}
                placeholder="Category: https://youtube.com/shorts/..."
                placeholderTextColor={colors.textSecondary}
                value={newUrl}
                onChangeText={setNewUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleAddVideo}
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
                      // Always filter the category
                      handleCategorySelect(category);
                      // Always populate the input
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

          {/* Videos Content */}
          <View style={styles.videosContainer}>
            {filteredVideos.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎬</Text>
                <Text style={styles.emptyTitle}>
                  {videos.length === 0 ? 'No Shorts Saved Yet' : 'No Videos in This Category'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {videos.length === 0
                    ? 'Add your favorite YouTube Shorts by pasting their URLs above'
                    : 'Try selecting a different category or add more videos'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.videosGrid}>
                {filteredVideos.map((video, index) => (
                  <VideoCard key={video.id} video={video} index={index} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Video Edit Modal */}
        <Modal
          visible={showModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseModal}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Video
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.surface }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Video Name</Text>
                <TextInput
                  style={[styles.modalInput, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  placeholder="Enter a custom name for this video"
                  placeholderTextColor={colors.textSecondary}
                  value={editName}
                  onChangeText={setEditName}
                  autoCapitalize="words"
                  autoCorrect={true}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Category & URL</Text>
                <TextInput
                  style={[styles.modalInput, styles.multilineInput, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  placeholder="Category: https://youtube.com/shorts/..."
                  placeholderTextColor={colors.textSecondary}
                  value={editUrl}
                  onChangeText={setEditUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  multiline={true}
                  numberOfLines={2}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              {/* Video Preview */}
              {editingVideo && (
                <View style={styles.videoPreview}>
                  <Text style={[styles.previewLabel, { color: colors.text }]}>Preview</Text>
                  <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {editingVideo.thumbnail ? (
                      <Image
                        source={{ uri: editingVideo.thumbnail }}
                        style={styles.previewThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.previewPlaceholder, { backgroundColor: colors.border }]}>
                        <Text style={[styles.previewPlaceholderText, { color: colors.textSecondary }]}>
                          🎬
                        </Text>
                      </View>
                    )}

                    {/* Category pill overlay - Top (matching main card) */}
                    {parseCategoryAndUrl(editUrl).category && (
                      <View style={[styles.categoryPill, styles.previewCategoryPill, { backgroundColor: 'rgba(30, 30, 30, 0.85)' }]}>
                        <Text style={[styles.categoryPillText, { color: '#ffffff' }]}>
                          {parseCategoryAndUrl(editUrl).category}
                        </Text>
                      </View>
                    )}

                    {/* Name pill overlay - Bottom (matching main card) */}
                    {editName.trim() && (
                      <View style={[styles.namePill, styles.previewNamePill, { backgroundColor: 'rgba(30, 30, 30, 0.85)' }]}>
                        <Text style={[styles.namePillText, { color: '#ffffff' }]}>
                          {editName.trim()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.shareButton, { backgroundColor: colors.secondary }]}
                onPress={handleShareVideo}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>
                  Share
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton, { backgroundColor: colors.error }]}
                onPress={handleDeleteVideo}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>
                  Delete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveVideo}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Friend Selection Modal */}
        <FriendSelectionModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          onSelectFriend={handleSelectFriend}
          onAddFriend={handleAddFriend}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ShortSaverSpark;
