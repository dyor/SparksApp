import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, TextInput, ScrollView, Alert, Modal, Keyboard, TouchableWithoutFeedback } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsButton,
  SaveCancelButtons,
  SettingsInput,
  SettingsItem,
  SettingsText,
  SettingsRemoveButton,
  SettingsFeedbackSection,
} from '../components/SettingsComponents';
import { useTheme } from '../contexts/ThemeContext';
import { createCommonStyles } from '../styles/CommonStyles';
import { StyleTokens } from '../styles/StyleTokens';
import { CommonModal } from '../components/CommonModal';
import { Dropdown, DropdownOption } from '../components/shared/Dropdown'; // Added Dropdown import

const { width: screenWidth } = Dimensions.get('window');
const wheelSize = Math.min(screenWidth - 80, 300);
const wheelRadius = wheelSize / 2;

interface SpinnerOption {
  label: string;
  color: string;
  weight: number;
}

interface DecisionSet {
  id: string;
  name: string;
  active: boolean;
  options: SpinnerOption[];
}

const defaultOptions: SpinnerOption[] = [
  { label: 'Pizza', color: '#FF6B6B', weight: 1 },
  { label: 'Sushi', color: '#4ECDC4', weight: 1 },
  { label: 'Burger', color: '#45B7D1', weight: 1 },
  { label: 'Tacos', color: '#96CEB4', weight: 1 },
  { label: 'Pasta', color: '#FECA57', weight: 1 },
  { label: 'Salad', color: '#FF9FF3', weight: 1 },
];

const vacationOptions: SpinnerOption[] = [
  { label: 'La Paz Mexico', color: '#FF6B6B', weight: 1 },
  { label: 'Barcelona', color: '#4ECDC4', weight: 1 },
  { label: 'London', color: '#45B7D1', weight: 1 },
];

// Initialize default decision sets
const getInitialDecisionSets = (): DecisionSet[] => {
  return [
    {
      id: 'dinner',
      name: 'What should we get for dinner?',
      active: true,
      options: defaultOptions,
    },
    {
      id: 'vacation',
      name: 'Where should we go for our summer vacation?',
      active: false,
      options: vacationOptions,
    },
  ];
};

const colorOptions = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3',
  '#A8E6CF', '#FFB3BA', '#BFBFFF', '#B19CD9', '#FFB347', '#87CEEB',
];

interface DecisionSetManagerProps {
  decisionSets: DecisionSet[];
  onUpdate: (decisionSets: DecisionSet[]) => void;
  onClose: () => void;
}

// New component for managing multiple decision sets
const DecisionSetManager: React.FC<DecisionSetManagerProps> = ({ decisionSets, onUpdate, onClose }) => {
  const { colors } = useTheme();
  const commonStyles = createCommonStyles(colors);
  const [editingSet, setEditingSet] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleActivate = (setId: string) => {
    const updated = decisionSets.map(set => ({
      ...set,
      active: set.id === setId
    }));
    onUpdate(updated);
    HapticFeedback.medium();
  };

  const handleEdit = (setId: string) => {
    setEditingSet(setId);
    setShowEditModal(true);
  };

  const handleDelete = (setId: string) => {
    Alert.alert(
      'Delete Decision Set',
      'Are you sure you want to delete this decision set?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = decisionSets.filter(set => set.id !== setId);
            // If we deleted the active set, activate the first one
            if (decisionSets.find(s => s.id === setId)?.active && updated.length > 0) {
              updated[0].active = true;
            }
            onUpdate(updated);
            HapticFeedback.medium();
          },
        },
      ]
    );
  };

  const handleAddNewSpinner = () => {
    const newId = `spinner_${Date.now()}`;
    const newSpinner: DecisionSet = {
      id: newId,
      name: `New Spinner ${decisionSets.length + 1}`,
      active: false,
      options: defaultOptions,
    };
    onUpdate([...decisionSets, newSpinner]);
    HapticFeedback.success();
    // Automatically open the edit modal for the new spinner
    setEditingSet(newId);
    setShowEditModal(true);
  };

  const styles = StyleSheet.create({
    setCard: {
      ...commonStyles.card,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    activeCard: {
      borderColor: colors.primary,
      borderWidth: 3,
    },
    setName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    setInfo: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    activeBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    activeBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    primaryButtonText: {
      color: '#fff',
    },
    dangerButton: {
      backgroundColor: '#FF3B30',
      borderColor: '#FF3B30',
    },
    dangerButtonText: {
      color: '#fff',
    },
  });

  const setBeingEdited = editingSet ? decisionSets.find(s => s.id === editingSet) : null;

  return (
    <>
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            icon="🎡"
            title="Decision Set Manager"
            subtitle="Manage your decision wheels"
          />

          <SettingsFeedbackSection sparkName="Spinner" sparkId="spinner" />

          <SettingsSection title="Your Spinners">
            {decisionSets.map((set) => (
              <View key={set.id} style={[styles.setCard, set.active && styles.activeCard]}>
                {set.active && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
                <Text style={styles.setName}>{set.name}</Text>
                <Text style={styles.setInfo}>{set.options.length} options</Text>

                <View style={styles.buttonRow}>
                  {!set.active && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={() => handleActivate(set.id)}
                    >
                      <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Activate</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(set.id)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={() => handleDelete(set.id)}
                  >
                    <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </SettingsSection>

          <SettingsButton
            title="Add Spinner"
            onPress={handleAddNewSpinner}
            variant="primary"
          />

          <SettingsButton
            title="Close"
            onPress={onClose}
            variant="secondary"
          />
        </SettingsScrollView>
      </SettingsContainer>

      {/* Edit Modal */}
      <CommonModal
        visible={showEditModal && !!setBeingEdited}
        title="Edit Spinner"
        onClose={() => {
          setShowEditModal(false);
          setEditingSet(null);
        }}
      >
        {setBeingEdited && (
          <SpinnerSettings
            name={setBeingEdited.name}
            options={setBeingEdited.options}
            onSave={({ name, options: newOptions }) => {
              const updated = decisionSets.map(set =>
                set.id === editingSet ? { ...set, name, options: newOptions } : set
              );
              onUpdate(updated);
              setShowEditModal(false);
              setEditingSet(null);
            }}
            onClose={() => {
              setShowEditModal(false);
              setEditingSet(null);
            }}
          />
        )}
      </CommonModal>
    </>
  );
};

interface SpinnerSettingsProps {
  name: string;
  options: SpinnerOption[];
  onSave: (data: { name: string; options: SpinnerOption[] }) => void;
  onClose: () => void;
}


const SpinnerSettings: React.FC<SpinnerSettingsProps> = ({ name, options, onSave, onClose }) => {
  const [editingName, setEditingName] = useState(name);
  const [editingOptions, setEditingOptions] = useState<SpinnerOption[]>([...options]);
  const { colors } = useTheme();

  const updateOption = (index: number, field: keyof SpinnerOption, value: string | number) => {
    const updated = [...editingOptions];
    updated[index] = { ...updated[index], [field]: value };
    setEditingOptions(updated);
  };

  const addOption = () => {
    const newOption: SpinnerOption = {
      label: `Option ${editingOptions.length + 1}`,
      color: colorOptions[editingOptions.length % colorOptions.length],
      weight: 1,
    };
    setEditingOptions([...editingOptions, newOption]);
    HapticFeedback.light();
  };

  const deleteOption = (index: number) => {
    if (editingOptions.length <= 2) {
      Alert.alert('Cannot Delete', 'You need at least 2 options on the wheel.');
      return;
    }

    Alert.alert(
      'Delete Option',
      'Are you sure you want to delete this option?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = editingOptions.filter((_, i) => i !== index);
            setEditingOptions(updated);
            HapticFeedback.medium();
          },
        },
      ]
    );
  };

  const handleSave = () => {
    const validOptions = editingOptions.filter(option => option.label.trim().length > 0);
    if (validOptions.length < 2) {
      Alert.alert('Invalid Configuration', 'You need at least 2 valid options with names.');
      return;
    }
    if (editingName.trim().length === 0) {
      Alert.alert('Invalid Configuration', 'The spinner must have a name.');
      return;
    }
    HapticFeedback.success();
    onSave({ name: editingName, options: validOptions });
    onClose();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20, // Consistent with SettingsScrollView padding
      backgroundColor: colors.surface, // Match CommonModal's content background
    },
    label: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 20,
    },
    optionContainer: {
      marginBottom: 20,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    weightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      gap: 12,
    },
  });

  const weightOptions: DropdownOption[] = Array.from({ length: 10 }, (_, i) => i + 1).map(val => ({
    label: val === 1 ? '1 (Normal)' : val === 10 ? '10 (Huge)' : `${val}`,
    value: val,
  }));

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <SettingsHeader
          icon="🎡"
          title="Spinner Settings"
          subtitle="Customize your wheel options and weights"
        />

        <Text style={styles.label}>Name</Text>
        <SettingsInput
          placeholder="Enter spinner name"
          value={editingName}
          onChangeText={setEditingName}
        />

        <View style={{ marginTop: 5 }}>
          {editingOptions.map((option, index) => (
            <View key={index} style={styles.optionContainer}>
              <SettingsInput
                placeholder="Enter option name"
                value={option.label}
                onChangeText={(text) => updateOption(index, 'label', text)}
              />
              <View style={styles.weightRow}>
                <WeightDropdown
                  selectedValue={option.weight}
                  onValueChange={(itemValue) => updateOption(index, 'weight', itemValue)}
                />
                <SettingsRemoveButton
                  onPress={() => deleteOption(index)}
                />
              </View>
            </View>
          ))}
        </View>

        <SettingsButton
          title="Add Option"
          onPress={addOption}
          variant="primary"
        />

        <View style={{ height: 20 }} />

        <SaveCancelButtons
          onSave={handleSave}
          onCancel={onClose}
          saveText="Save"
          cancelText="Cancel"
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

interface SpinnerSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

export const SpinnerSpark: React.FC<SpinnerSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();
  const commonStyles = createCommonStyles(colors);

  const styles = StyleSheet.create({
    ...commonStyles,
    header: {
      alignItems: 'center',
      marginTop: StyleTokens.spacing.xl,
      marginBottom: StyleTokens.spacing.xxl,
    },
    question: {
      fontSize: StyleTokens.fontSize.lg,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginTop: StyleTokens.spacing.sm,
      marginBottom: StyleTokens.spacing.md,
      paddingHorizontal: StyleTokens.spacing.lg,
    },
    wheelContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30,
    },
    wheel: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    pointer: {
      position: 'absolute',
      right: -5,
      top: '50%',
      marginTop: -12.5,
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderTopWidth: 12.5,
      borderRightWidth: 25,
      borderBottomWidth: 12.5,
      borderLeftWidth: 0,
      borderTopColor: 'transparent',
      borderRightColor: colors.text,
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
      zIndex: 10,
    },
    controls: {
      width: '100%',
      paddingHorizontal: 20,
      gap: 12,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    spinButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    resultContainer: {
      marginTop: 20,
      marginBottom: 20,
      padding: 20,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    resultText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
    },
  });

  const [decisionSets, setDecisionSets] = useState<DecisionSet[]>(getInitialDecisionSets());
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;
  const [dataLoaded, setDataLoaded] = useState(false);

  // Get the active decision set
  const activeSet = decisionSets.find(set => set.active);
  const options = activeSet?.options || defaultOptions;
  const currentQuestion = activeSet?.name || 'Decision Spinner';

  // Load saved decision sets on mount
  useEffect(() => {
    const savedData = getSparkData('spinner');
    if (savedData && savedData.decisionSets && savedData.decisionSets.length > 0) {
      setDecisionSets(savedData.decisionSets);
    }
    setDataLoaded(true);
  }, [getSparkData]);

  // Save decision sets whenever they change
  useEffect(() => {
    if (!dataLoaded) return;
    setSparkData('spinner', { decisionSets });
  }, [decisionSets, setSparkData, dataLoaded]);

  const spin = () => {
    if (isSpinning) return;

    HapticFeedback.medium();
    setIsSpinning(true);
    setResult(null);

    // Random spin between 5-10 full rotations plus random angle
    const randomSpin = 5 + Math.random() * 5; // 5-10 rotations
    const finalAngle = randomSpin * 360 + Math.random() * 360;

    // Reset animation value
    spinValue.setValue(0);

    Animated.timing(spinValue, {
      toValue: finalAngle,
      duration: 4500, // Slower spinning for better visibility
      useNativeDriver: true,
    }).start(() => {
      const normalizedAngle = finalAngle % 360;
      const selectedOption = getSelectedOption(normalizedAngle);

      setResult(selectedOption.label);
      setIsSpinning(false);
      HapticFeedback.success();
    });
  };

  const getSelectedOption = (wheelRotation: number) => {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    // Segments are drawn CW. Animation is CW. Pointer is at 0 degrees.
    // A segment at angle A is now at A + wheelRotation. We want A + wheelRotation = 0 (mod 360).
    // So, A = -wheelRotation (mod 360).
    const targetAngle = (360 - (wheelRotation % 360)) % 360;

    let currentAngle = 0;
    for (const option of options) {
      const segmentAngle = (option.weight / totalWeight) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + segmentAngle;

      if (targetAngle >= startAngle && targetAngle < endAngle) {
        return option;
      }
      currentAngle = endAngle;
    }

    // Fallback for floating point weirdness, especially near 360
    return options[options.length - 1];
  };

  const updateActiveSetOptions = (newOptions: SpinnerOption[]) => {
    setDecisionSets(prev => prev.map(set =>
      set.active ? { ...set, options: newOptions } : set
    ));
  };

  const createWheelSegments = () => {
    const segments = [];
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    let currentAngle = 0;

    for (let i = 0; i < options.length; i++) {
      const segmentAngle = (options[i].weight / totalWeight) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + segmentAngle;

      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Calculate arc path
      const x1 = wheelRadius + wheelRadius * 0.8 * Math.cos(startRad);
      const y1 = wheelRadius + wheelRadius * 0.8 * Math.sin(startRad);
      const x2 = wheelRadius + wheelRadius * 0.8 * Math.cos(endRad);
      const y2 = wheelRadius + wheelRadius * 0.8 * Math.sin(endRad);

      const largeArcFlag = segmentAngle > 180 ? 1 : 0;

      const pathData = [
        `M ${wheelRadius} ${wheelRadius}`,
        `L ${x1} ${y1}`,
        `A ${wheelRadius * 0.8} ${wheelRadius * 0.8} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      // Text position
      const textAngle = startAngle + segmentAngle / 2;
      const textRad = (textAngle * Math.PI) / 180;
      const textX = wheelRadius + wheelRadius * 0.5 * Math.cos(textRad);
      const textY = wheelRadius + wheelRadius * 0.5 * Math.sin(textRad);

      segments.push(
        <React.Fragment key={i}>
          <Path
            d={pathData}
            fill={options[i].color}
            stroke="#fff"
            strokeWidth="2"
          />
          <SvgText
            x={textX}
            y={textY}
            fontSize={segmentAngle < 30 ? "10" : "14"}
            fill="#333"
            fontWeight="600"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${textAngle}, ${textX}, ${textY})`}
          >
            {options[i].label}
          </SvgText>
        </React.Fragment>
      );

      currentAngle += segmentAngle;
    }

    return segments;
  };

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  if (showSettings) {
    return (
      <DecisionSetManager
        decisionSets={decisionSets}
        onUpdate={setDecisionSets}
        onClose={onCloseSettings || (() => { })}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎡 Decision Spinner</Text>
        <Text style={styles.question}>{currentQuestion}</Text>
      </View>

      <View style={styles.wheelContainer}>
        {/* Pointer */}
        <View style={styles.pointer} />

        {/* Spinning Wheel */}
        <Animated.View
          style={[
            styles.wheel,
            {
              transform: [{ rotate: spinInterpolate }],
            },
          ]}
        >
          <Svg width={wheelSize} height={wheelSize}>
            {createWheelSegments()}
          </Svg>
        </Animated.View>
      </View>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>Result: {result}</Text>
        </View>
      )}

      {/* Debug information
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug: Current Segment Positions</Text>
        {(() => {
          const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
          let currentAngle = 0;
          const finalRotation = spinValue._value || 0;
          
          return options.map((option, i) => {
            const segmentAngle = (option.weight / totalWeight) * 360;
            const startDegrees = currentAngle;
            const endDegrees = currentAngle + segmentAngle;
            
            const contains90 = (rotatedStart <= 90 && rotatedEnd > 90) || 
                              (rotatedStart > rotatedEnd && (rotatedStart <= 90 || 90 < rotatedEnd));
            
            currentAngle = endDegrees;
            
            return (
              <Text key={i} style={[styles.debugText, contains90 && styles.debugHighlight]}>
                {option.label}: {rotatedStart.toFixed(1)}° - {rotatedEnd.toFixed(1)}° {contains90 ? '← ARROW HERE' : ''}
              </Text>
            );
          });
        })()}
        <Text style={styles.debugText}>Arrow at: 90°</Text>
      </View> */}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.spinButton]}
          onPress={spin}
          disabled={isSpinning}
        >
          <Text style={styles.buttonText}>
            {isSpinning ? 'Spinning...' : 'SPIN!'}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
};