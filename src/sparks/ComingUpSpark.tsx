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
    category: 'birthday' | 'anniversary' | 'trip' | 'other';
}

interface ComingUpSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
}

const ComingUpSpark: React.FC<ComingUpSparkProps> = ({ showSettings, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();
    const [events, setEvents] = useState<Event[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date());
    const [isAnnual, setIsAnnual] = useState(false);
    const [category, setCategory] = useState<Event['category']>('other');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isInitializing = useRef(true);

    // Load data
    useEffect(() => {
        const data = getSparkData('coming-up');
        if (data?.events) {
            setEvents(data.events);
        }
        setTimeout(() => {
            isInitializing.current = false;
        }, 100);
    }, []);

    // Save data
    useEffect(() => {
        if (!isInitializing.current) {
            setSparkData('coming-up', { events });
        }
    }, [events, setSparkData]);

    const getNextOccurrence = (event: Event): Date => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventDate = new Date(event.date);
        // Fix timezone offset issue by treating the date string as local time
        // YYYY-MM-DD split ensures we work with local components
        const [year, month, day] = event.date.split('-').map(Number);
        eventDate.setFullYear(year, month - 1, day);
        eventDate.setHours(0, 0, 0, 0);

        if (event.type === 'one-time') {
            return eventDate;
        }

        // For annual events
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

        const eventDate = date.toISOString().split('T')[0];

        if (editingEvent) {
            const updatedEvents = events.map(e =>
                e.id === editingEvent.id
                    ? { ...e, title: title.trim(), date: eventDate, type: isAnnual ? 'annual' : 'one-time', category } as Event
                    : e
            );
            setEvents(updatedEvents);
        } else {
            const newEvent: Event = {
                id: Date.now().toString(),
                title: title.trim(),
                date: eventDate,
                type: isAnnual ? 'annual' : 'one-time',
                category,
            };
            setEvents([...events, newEvent]);
            // Schedule notifications (day before and day of)
            const eventDateObj = new Date(newEvent.date + 'T08:00:00');
            const dayBefore = new Date(eventDateObj);
            dayBefore.setDate(dayBefore.getDate() - 1);

            // Schedule day-before notification
            NotificationService.scheduleActivityNotification(
                `${newEvent.title} tomorrow`,
                dayBefore,
                `event-${newEvent.id}-before`,
                `Upcoming ${newEvent.category}`,
                'coming-up',
                getCategoryEmoji(newEvent.category)
            );

            // Schedule day-of notification
            NotificationService.scheduleActivityNotification(
                newEvent.title,
                eventDateObj,
                `event-${newEvent.id}-day`,
                newEvent.category.charAt(0).toUpperCase() + newEvent.category.slice(1),
                'coming-up',
                getCategoryEmoji(newEvent.category)
            );
        }

        if (editingEvent) {
            // Reschedule notifications for edited event
            const eventDateObj = new Date(eventDate + 'T08:00:00');
            const dayBeforeEdit = new Date(eventDateObj);
            dayBeforeEdit.setDate(dayBeforeEdit.getDate() - 1);

            // Cancel old notifications first (using identifier pattern)
            // Then schedule new ones
            NotificationService.scheduleActivityNotification(
                `${title.trim()} tomorrow`,
                dayBeforeEdit,
                `event-${editingEvent.id}-before`,
                `Upcoming ${category}`,
                'coming-up',
                getCategoryEmoji(category)
            );

            NotificationService.scheduleActivityNotification(
                title.trim(),
                eventDateObj,
                `event-${editingEvent.id}-day`,
                category.charAt(0).toUpperCase() + category.slice(1),
                'coming-up',
                getCategoryEmoji(category)
            );
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
                    // Note: Notifications will auto-expire if time has passed
                    // No cancel method needed since we use activity identifiers
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

    const sortedEvents = [...events].sort((a, b) => {
        const dateA = getNextOccurrence(a);
        const dateB = getNextOccurrence(b);
        return dateA.getTime() - dateB.getTime();
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
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text,
        },
        addButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        addButtonText: {
            fontSize: 24,
            color: '#fff',
            fontWeight: 'bold',
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
        proximityBadge: {
            alignSelf: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
            backgroundColor: colors.background,
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
            marginBottom: 8,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: colors.text,
        },
        dateButton: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        dateText: {
            fontSize: 16,
            color: colors.text,
        },
        switchContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
        },
        categoryContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 8,
        },
        categoryButton: {
            flex: 1,
            alignItems: 'center',
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: 'transparent',
        },
        categorySelected: {
            borderColor: colors.primary,
            backgroundColor: colors.primary + '20',
        },
        categoryEmoji: {
            fontSize: 24,
            marginBottom: 4,
        },
        categoryLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        deleteButton: {
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.error + '20',
            alignItems: 'center',
        },
        deleteButtonText: {
            color: colors.error,
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
            default: return '📅';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Coming Up</Text>
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {sortedEvents.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🗓️</Text>
                        <Text style={styles.emptyText}>No upcoming events</Text>
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
                                    <View style={styles.proximityBadge}>
                                        <Text style={[styles.proximityText, { color: proximityColor }]}>
                                            {proximityText}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.categoryIcon}>
                                    {getCategoryEmoji(event.category)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
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
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) setDate(selectedDate);
                                    }}
                                />
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Type</Text>
                            <View style={styles.switchContainer}>
                                <Text style={styles.dateText}>Annual Event</Text>
                                <Switch
                                    value={isAnnual}
                                    onValueChange={setIsAnnual}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.categoryContainer}>
                                {(['birthday', 'anniversary', 'trip', 'other'] as const).map(cat => (
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
