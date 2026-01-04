import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Modal,
    Platform,
    StatusBar,
    Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { SettingsContainer, SettingsScrollView, SettingsHeader, SettingsFeedbackSection } from '../components/SettingsComponents';
import { NotificationService } from '../utils/notifications';

interface Event {
    id: string;
    title: string;
    date: string; // ISO date string (YYYY-MM-DD)
    type: 'annual' | 'one-time';
    category: 'birthday' | 'anniversary' | 'trip' | 'work' | 'party' | 'sports' | 'dinner' | 'other';
}

interface ComingUpSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
}

const ComingUpSpark: React.FC<ComingUpSparkProps> = ({ showSettings, onCloseSettings }) => {
    const { colors } = useTheme();
    const getSparkData = useSparkStore(state => state.getSparkData);
    const setSparkData = useSparkStore(state => state.setSparkData);
    const [events, setEvents] = useState<Event[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [showPastEvents, setShowPastEvents] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date());
    const [isAnnual, setIsAnnual] = useState(false);
    const [category, setCategory] = useState<Event['category']>('other');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Helper to schedule notifications for an event
    const scheduleEventNotifications = (event: Event) => {
        // Schedule notifications (day before and day of) at 8:00 AM
        const eventDateObj = new Date(event.date + 'T08:00:00');
        const dayBefore = new Date(eventDateObj);
        dayBefore.setDate(dayBefore.getDate() - 1);

        // Only schedule if the date is in the future
        const now = new Date();

        if (dayBefore > now) {
            NotificationService.scheduleActivityNotification(
                `${event.title} tomorrow`,
                dayBefore,
                `event-${event.id}-before`,
                `Upcoming ${event.category}`,
                'coming-up',
                getCategoryEmoji(event.category)
            );
        }

        if (eventDateObj > now) {
            NotificationService.scheduleActivityNotification(
                event.title,
                eventDateObj,
                `event-${event.id}-day`,
                event.category.charAt(0).toUpperCase() + event.category.slice(1),
                'coming-up',
                getCategoryEmoji(event.category)
            );
        }
    };

    // Load data and handle rollover
    useEffect(() => {
        const data = getSparkData('coming-up');
        if (data?.events) {
            const storedEvents: Event[] = data.events;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let hasChanges = false;
            const updatedEvents = [...storedEvents];

            // Rollover logic for annual events
            storedEvents.forEach((event, idx) => {
                if (event.type === 'annual') {
                    const [year, month, day] = event.date.split('-').map(Number);
                    const eventDate = new Date(year, month - 1, day);
                    eventDate.setHours(0, 0, 0, 0);

                    if (eventDate < today) {
                        // 1. Mark current as one-time (it has passed)
                        updatedEvents[idx] = { ...event, type: 'one-time' };

                        // 2. Create new annual event for next year
                        const nextYearDate = `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const newEvent: Event = {
                            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            title: event.title,
                            date: nextYearDate,
                            type: 'annual',
                            category: event.category,
                        };
                        updatedEvents.push(newEvent);

                        // 3. Schedule notifications for the new event
                        scheduleEventNotifications(newEvent);
                        hasChanges = true;
                        console.log(`📡 Rollover: ${event.title} moved from ${event.date} to ${nextYearDate}`);
                    }
                }
            });

            if (hasChanges) {
                setEvents(updatedEvents);
                setSparkData('coming-up', { events: updatedEvents });
            } else {
                setEvents(storedEvents);
            }
        }
        setDataLoaded(true);
    }, [getSparkData, setSparkData]);

    // Save data only after initial load and when events change
    useEffect(() => {
        if (dataLoaded) {
            setSparkData('coming-up', { events });
        }
    }, [events, dataLoaded, setSparkData]);

    const getNextOccurrence = (event: Event): Date => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fix timezone offset issue by treating the date string as local time
        const [year, month, day] = event.date.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day);
        eventDate.setHours(0, 0, 0, 0);

        if (event.type === 'one-time') {
            return eventDate;
        }

        // For annual events (legacy support or if rollover hasn't triggered yet)
        const currentYear = today.getFullYear();
        const nextDate = new Date(currentYear, month - 1, day);
        nextDate.setHours(0, 0, 0, 0);

        if (nextDate < today) {
            nextDate.setFullYear(currentYear + 1);
        }
        return nextDate;
    };

    const getDaysRemaining = (targetDate: Date): number => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getProximityText = (days: number): string => {
        if (days < 0) return 'Past';
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        if (days < 7) return `In ${days} days`;

        const weeks = Math.round(days / 7);
        if (days < 30) return `In ${weeks} week${weeks > 1 ? 's' : ''}`;

        const months = Math.round(days / 30);
        if (days < 365) return `In ${months} month${months > 1 ? 's' : ''}`;

        return 'In 1 year+';
    };

    const getProximityColor = (days: number): string => {
        if (days === 0) return '#FF3B30'; // Red for Today
        if (days === 1) return '#FF9500'; // Orange for Tomorrow
        if (days < 7) return '#FFCC00'; // Yellow for this week
        if (days < 30) return '#34C759'; // Green for this month
        return colors.textSecondary; // Gray for later
    };

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        // Format date as YYYY-MM-DD in local timezone (not UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const eventDate = `${year}-${month}-${day}`;

        if (editingEvent) {
            const updatedEvent: Event = { ...editingEvent, title: title.trim(), date: eventDate, type: isAnnual ? 'annual' : 'one-time', category };
            const updatedEvents = events.map(e => e.id === editingEvent.id ? updatedEvent : e);
            setEvents(updatedEvents);
            scheduleEventNotifications(updatedEvent);
        } else {
            const newEvent: Event = {
                id: Date.now().toString(),
                title: title.trim(),
                date: eventDate,
                type: isAnnual ? 'annual' : 'one-time',
                category,
            };
            setEvents([...events, newEvent]);
            scheduleEventNotifications(newEvent);
        }

        handleCloseModal();
        HapticFeedback.success();
    };

    const handleDelete = () => {
        if (!editingEvent) return;

        Alert.alert('Delete Event', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setEvents(events.filter(e => e.id !== editingEvent.id));
                    handleCloseModal();
                    HapticFeedback.medium();
                }
            }
        ]);
    };


    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingEvent(null);
        setTitle('');
        setDate(new Date());
        setIsAnnual(false);
        setCategory('other');
    };

    const openAddModal = () => {
        setEditingEvent(null);
        setTitle('');
        setDate(new Date());
        setIsAnnual(false);
        setCategory('other');
        setShowAddModal(true);
        HapticFeedback.light();
    };

    const openEditModal = (event: Event) => {
        setEditingEvent(event);
        setTitle(event.title);

        const [year, month, day] = event.date.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day);
        setDate(eventDate);

        setIsAnnual(event.type === 'annual');
        setCategory(event.category);
        setShowAddModal(true);
        HapticFeedback.light();
    };

    const todayDay = new Date();
    todayDay.setHours(0, 0, 0, 0);

    const filteredEvents = events.filter(event => {
        const nextDate = getNextOccurrence(event);
        if (showPastEvents) {
            // Only one-time events that occurred before today
            if (event.type === 'annual') return false;
            const [year, month, day] = event.date.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate < todayDay;
        } else {
            // Upcoming occurrences (including today)
            return nextDate >= todayDay;
        }
    });

    const sortedEvents = [...filteredEvents].sort((a, b) => {
        if (showPastEvents) {
            // Sort past events newest to oldest
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else {
            // Sort upcoming events soonest first
            const dateA = getNextOccurrence(a);
            const dateB = getNextOccurrence(b);
            return dateA.getTime() - dateB.getTime();
        }
    });

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            padding: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 20,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text,
        },
        addButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        addButtonText: {
            fontSize: 28,
            color: '#fff',
            fontWeight: 'bold',
            marginTop: -2,
        },
        listContent: {
            padding: 20,
            paddingTop: 0,
        },
        eventCard: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
        dateContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            marginRight: 16,
        },
        dayText: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text,
        },
        monthText: {
            fontSize: 12,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            fontWeight: '600',
        },
        eventInfo: {
            flex: 1,
        },
        eventTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 4,
        },
        badgeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        proximityBadge: {
            alignSelf: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: colors.background,
        },
        annualBadge: {
            alignSelf: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: colors.primary + '15',
        },
        annualBadgeText: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.primary,
            textTransform: 'uppercase',
        },
        proximityText: {
            fontSize: 12,
            fontWeight: '600',
        },
        categoryIcon: {
            fontSize: 24,
            marginLeft: 12,
        },
        // Modal Styles
        modalContainer: {
            flex: 1,
            backgroundColor: colors.background,
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
            color: colors.text,
        },
        closeButton: {
            padding: 8,
        },
        closeButtonText: {
            fontSize: 16,
            color: colors.textSecondary,
        },
        saveButton: {
            padding: 8,
        },
        saveButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.primary,
        },
        formContent: {
            padding: 20,
        },
        inputGroup: {
            marginBottom: 24,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 12,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
        },
        dateButton: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
        },
        dateText: {
            fontSize: 16,
            color: colors.text, // Ensure text color is explicit
            fontWeight: '500',
        },
        datePickerContainer: {
            marginTop: 10,
            backgroundColor: Platform.OS === 'ios' ? '#1a1a1a' : colors.surface, // Dark dark grey for iOS calendar visibility
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: Platform.OS === 'ios' ? 0 : 1,
            borderColor: colors.border,
            // Ensure proper contrast for iOS calendar
            ...(Platform.OS === 'ios' && {
                padding: 8,
            }),
        },
        switchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.border,
        },
        switchOption: {
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderRadius: 8,
        },
        switchOptionActive: {
            backgroundColor: colors.primary,
        },
        switchOptionText: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        switchOptionTextActive: {
            color: '#fff',
        },
        categoryContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        categoryButton: {
            width: '31%', // 3 columns with gaps
            aspectRatio: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: 'transparent',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        categorySelected: {
            borderColor: colors.primary,
            backgroundColor: colors.primary + '10',
        },
        categoryEmoji: {
            fontSize: 24,
            marginBottom: 4,
        },
        categoryLabel: {
            fontSize: 11,
            fontWeight: '600',
            color: colors.textSecondary,
            textAlign: 'center',
        },
        deleteButton: {
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.error + '10',
            alignItems: 'center',
            marginBottom: 40,
        },
        deleteButtonText: {
            color: colors.error,
            fontSize: 16,
            fontWeight: '600',
        },
        button: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
        },
        buttonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '600',
        },
        emptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            marginTop: 40,
        },
        emptyEmoji: {
            fontSize: 64,
            marginBottom: 16,
        },
        emptyText: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
        },
        emptySubtext: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        toggleButton: {
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            marginTop: 20,
            marginBottom: 40,
        },
        toggleButtonText: {
            color: colors.primary,
            fontSize: 16,
            fontWeight: '600',
        },
    });

    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title="Coming Up Settings"
                        subtitle="Manage your upcoming events"
                        icon="🗓️"
                        sparkId="coming-up"
                    />
                    <SettingsFeedbackSection sparkName="Coming Up" sparkId="coming-up" />
                    <View style={{ padding: 20 }}>
                        <TouchableOpacity
                            style={{ padding: 16, backgroundColor: colors.surface, borderRadius: 12, alignItems: 'center' }}
                            onPress={onCloseSettings}
                        >
                            <Text style={{ color: colors.text, fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    const getCategoryEmoji = (cat: string) => {
        switch (cat) {
            case 'birthday': return '🎂';
            case 'anniversary': return '💍';
            case 'trip': return '✈️';
            case 'work': return '💻';
            case 'party': return '🥳';
            case 'sports': return '⚽️';
            case 'dinner': return '🍽️';
            default: return '📅';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{showPastEvents ? 'Past Events' : 'Coming Up'}</Text>
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {sortedEvents.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🗓️</Text>
                        <Text style={styles.emptyText}>No {showPastEvents ? 'past' : 'upcoming'} events</Text>
                        <Text style={styles.emptySubtext}>Add birthdays, trips, or other big days to track them here.</Text>
                    </View>
                ) : (
                    sortedEvents.map(event => {
                        const nextDate = getNextOccurrence(event);
                        const daysRemaining = getDaysRemaining(nextDate);
                        const proximityText = getProximityText(daysRemaining);
                        const proximityColor = getProximityColor(daysRemaining);

                        return (
                            <TouchableOpacity
                                key={event.id}
                                style={styles.eventCard}
                                onPress={() => openEditModal(event)}
                            >
                                <View style={styles.dateContainer}>
                                    <Text style={styles.monthText}>
                                        {nextDate.toLocaleString('default', { month: 'short' })}
                                    </Text>
                                    <Text style={styles.dayText}>{nextDate.getDate()}</Text>
                                </View>

                                <View style={styles.eventInfo}>
                                    <Text style={styles.eventTitle}>{event.title}</Text>
                                    <View style={styles.badgeRow}>
                                        <View style={styles.proximityBadge}>
                                            <Text style={[styles.proximityText, { color: proximityColor }]}>
                                                {proximityText}
                                            </Text>
                                        </View>
                                        {event.type === 'annual' && (
                                            <View style={styles.annualBadge}>
                                                <Text style={styles.annualBadgeText}>Annual</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <Text style={styles.categoryIcon}>
                                    {getCategoryEmoji(event.category)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
                )}

                {events.length > 0 && (
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => {
                            setShowPastEvents(!showPastEvents);
                            HapticFeedback.light();
                        }}
                    >
                        <Text style={styles.toggleButtonText}>
                            {showPastEvents ? 'View Coming Up' : 'View Past Events'}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <Modal
                visible={showAddModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'New Event'}</Text>
                        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Event Title"
                                placeholderTextColor={colors.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.dateText}>
                                    {date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                                </Text>
                                <Text>📅</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <View style={styles.datePickerContainer}>
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        onChange={(event, selectedDate) => {
                                            if (Platform.OS === 'android') {
                                                setShowDatePicker(false);
                                            }
                                            if (selectedDate) setDate(selectedDate);
                                        }}
                                    />
                                </View>
                            )}
                            {showDatePicker && Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={[styles.button, { marginTop: 10 }]}
                                    onPress={() => setShowDatePicker(false)}
                                >
                                    <Text style={styles.buttonText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Repeat Type</Text>
                            <View style={styles.switchContainer}>
                                <TouchableOpacity
                                    style={[styles.switchOption, !isAnnual && styles.switchOptionActive]}
                                    onPress={() => { setIsAnnual(false); HapticFeedback.light(); }}
                                >
                                    <Text style={[styles.switchOptionText, !isAnnual && styles.switchOptionTextActive]}>One-time</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.switchOption, isAnnual && styles.switchOptionActive]}
                                    onPress={() => { setIsAnnual(true); HapticFeedback.light(); }}
                                >
                                    <Text style={[styles.switchOptionText, isAnnual && styles.switchOptionTextActive]}>Annual</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.categoryContainer}>
                                {(['birthday', 'anniversary', 'trip', 'work', 'party', 'sports', 'dinner', 'other'] as const).map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryButton,
                                            category === cat && styles.categorySelected
                                        ]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={styles.categoryEmoji}>{getCategoryEmoji(cat)}</Text>
                                        <Text style={[
                                            styles.categoryLabel,
                                            category === cat && { color: colors.primary }
                                        ]}>
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {editingEvent && (
                            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                                <Text style={styles.deleteButtonText}>Delete Event</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

export default ComingUpSpark;
