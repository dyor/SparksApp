import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { WisdomQuote } from './wisdomData';
import { HapticFeedback } from '../../utils/haptics';

interface WisdomPageProps {
    quote: WisdomQuote;
    onShare?: () => void;
}

export const WisdomPage: React.FC<WisdomPageProps> = ({ quote, onShare }) => {
    const viewRef = useRef<View>(null);

    const handleShare = async () => {
        if (!viewRef.current) {
            Alert.alert('Error', 'Unable to capture image');
            return;
        }

        try {
            HapticFeedback.light();

            // Capture the view as an image
            const uri = await captureRef(viewRef.current, {
                format: 'png',
                quality: 1.0,
            });

            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert(
                    'Sharing Not Available',
                    'Sharing is not available on this device.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Share the image
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Share Golf Wisdom',
            });

            HapticFeedback.success();
            onShare?.();
        } catch (error: any) {
            console.error('Error sharing wisdom:', error);
            HapticFeedback.error();
            Alert.alert('Error', error.message || 'Failed to share wisdom');
        }
    };

    return (
        <View style={styles.container}>
            {/* Share Button - positioned absolutely, won't be captured */}
            <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                activeOpacity={0.7}
            >
                <Text style={styles.shareButtonText}>share</Text>
            </TouchableOpacity>

            {/* Content to capture (everything except arrows and share button) */}
            <View ref={viewRef} collapsable={false} style={styles.captureContainer}>
                {/* Top decorative flourish */}
                <View style={styles.topFlourish}>
                    <Text style={styles.flourishText}>✦ ✦ ✦</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.quoteContainer}>
                    {/* Opening quote mark */}
                    <Text style={styles.openQuote}>"</Text>

                    {/* Quote content */}
                    <Text style={styles.quoteText}>{quote.content}</Text>

                    {/* Closing quote mark */}
                    <Text style={styles.closeQuote}>"</Text>
                </View>

                {/* Attribution */}
                <Text style={styles.attribution}>— {quote.contributor || 'Tam O\'Shanter'}</Text>

                {/* Bottom decorative flourish */}
                <View style={styles.bottomFlourish}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.flourishText}>✦ ✦ ✦</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 80,
        position: 'relative',
    },
    captureContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: '#5C4A3A', // Dark brown, subtle
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20, // Pill shape
        zIndex: 10,
        opacity: 0.8, // Make it more subtle
    },
    shareButtonText: {
        color: '#F5F1E8',
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'American Typewriter',
        letterSpacing: 0.5,
    },
    topFlourish: {
        alignItems: 'center',
        marginBottom: 40,
    },
    bottomFlourish: {
        alignItems: 'center',
        marginTop: 40,
    },
    flourishText: {
        fontSize: 16,
        color: '#8B7355',
        letterSpacing: 8,
        opacity: 0.6,
    },
    dividerLine: {
        width: 120,
        height: 1,
        backgroundColor: '#8B7355',
        marginVertical: 8,
        opacity: 0.4,
    },
    quoteContainer: {
        position: 'relative',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    openQuote: {
        fontSize: 96,
        color: '#2D5016',
        fontFamily: 'American Typewriter',
        fontWeight: '700',
        opacity: 0.25,
        position: 'absolute',
        top: -50,
        left: -40,
    },
    quoteText: {
        fontSize: 26,
        lineHeight: 40,
        color: '#2C2C2C',
        textAlign: 'center',
        fontFamily: 'American Typewriter',
        fontWeight: '600',
        paddingHorizontal: 20,
        maxWidth: 600,
    },
    closeQuote: {
        fontSize: 96,
        color: '#2D5016',
        fontFamily: 'American Typewriter',
        fontWeight: '700',
        opacity: 0.25,
        position: 'absolute',
        bottom: -50,
        right: -40,
    },
    attribution: {
        fontSize: 22,
        color: '#666',
        fontFamily: 'American Typewriter',
        fontStyle: 'italic',
        marginTop: 30,
    },
});
