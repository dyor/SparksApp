import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Linking,
    Share,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';

const { width } = Dimensions.get('window');

interface ShareGolfSparksProps {
    onCloseSettings?: () => void;
}

// NOTE: All links currently point at the Sparks app. Once Golf Sparks is
// published, swap these URLs (and QR images) to point at the Golf Sparks
// listings. See CONTEXT/GENERAL/GOLFSPARKSPLAN.md.
const ShareGolfSparks: React.FC<ShareGolfSparksProps> = () => {
    const { colors } = useTheme();

    const handleShare = async () => {
        HapticFeedback.light();
        try {
            await Share.share({
                message: 'Check out the Sparks app! https://sparks.febak.com/check-out-the-sparks-app',
                url: 'https://sparks.febak.com/check-out-the-sparks-app',
                title: 'Share Golf Sparks',
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleEmail = () => {
        HapticFeedback.light();
        Linking.openURL('mailto:?subject=Check out Sparks&body=Check out the Sparks app: https://sparks.febak.com/check-out-the-sparks-app');
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContent: {
            padding: 20,
            alignItems: 'center',
            paddingBottom: 40,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
            textAlign: 'center',
        },
        subtitle: {
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 24,
        },
        qrContainer: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: '100%',
            marginBottom: 32,
            flexWrap: 'wrap',
            gap: 20,
        },
        qrItem: {
            alignItems: 'center',
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        qrImage: {
            width: 150,
            height: 150,
            marginBottom: 12,
            borderRadius: 8,
        },
        qrLabel: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        actionButton: {
            backgroundColor: colors.primary,
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 12,
            width: '100%',
            alignItems: 'center',
            marginBottom: 16,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        actionButtonText: {
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
        },
        secondaryButton: {
            backgroundColor: colors.surface,
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 12,
            width: '100%',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
        },
        secondaryButtonText: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
        },
        linkText: {
            color: colors.primary,
            fontSize: 14,
            marginTop: 24,
            textDecorationLine: 'underline',
        },
    });

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Share Golf Sparks ⛳️</Text>
                <Text style={styles.subtitle}>
                    Help your golf buddies discover Sparks!{'\n'}Scan a code or share the link below.
                </Text>

                <View style={styles.qrContainer}>
                    <TouchableOpacity
                        style={styles.qrItem}
                        onPress={() => {
                            HapticFeedback.light();
                            Linking.openURL('https://apps.apple.com/us/app/get-sparks/id6752919846');
                        }}
                    >
                        <Image
                            source={require('../../assets/qr-code-ios.png')}
                            style={styles.qrImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.qrLabel}>App Store</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.qrItem}
                        onPress={() => {
                            HapticFeedback.light();
                            Linking.openURL('https://play.google.com/store/apps/details?id=com.mattdyor.sparks');
                        }}
                    >
                        <Image
                            source={require('../../assets/qr-code-android.png')}
                            style={styles.qrImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.qrLabel}>Google Play</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <Text style={styles.actionButtonText}>Share App Link</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleEmail}>
                    <Text style={styles.secondaryButtonText}>Send via Email</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => Linking.openURL('https://sparks.febak.com/check-out-the-sparks-app')}>
                    <Text style={styles.linkText}>sparks.febak.com/check-out-the-sparks-app</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        HapticFeedback.light();
                        Linking.openURL('https://linkly.link/2TcvP');
                    }}
                    style={{ marginTop: 8 }}
                >
                    <Text style={styles.linkText}>Universal Link</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

export default ShareGolfSparks;
