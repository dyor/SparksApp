import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, TextInput, ScrollView, Alert } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';

const { width: screenWidth } = Dimensions.get('window');
const wheelSize = Math.min(screenWidth - 80, 300);
const wheelRadius = wheelSize / 2;

interface SpinnerOption {
  label: string;
  color: string;
  weight: number;
}

const defaultOptions: SpinnerOption[] = [
  { label: 'Pizza', color: '#FF6B6B', weight: 1 },
  { label: 'Sushi', color: '#4ECDC4', weight: 1 },
  { label: 'Burger', color: '#45B7D1', weight: 1 },
  { label: 'Tacos', color: '#96CEB4', weight: 1 },
  { label: 'Pasta', color: '#FECA57', weight: 1 },
  { label: 'Salad', color: '#FF9FF3', weight: 1 },
];

const colorOptions = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3',
  '#A8E6CF', '#FFB3BA', '#BFBFFF', '#B19CD9', '#FFB347', '#87CEEB',
];

interface SpinnerSettingsProps {
  options: SpinnerOption[];
  onSave: (options: SpinnerOption[]) => void;
  onClose: () => void;
}

const SpinnerSettings: React.FC<SpinnerSettingsProps> = ({ options, onSave, onClose }) => {
  const [editingOptions, setEditingOptions] = useState<SpinnerOption[]>([...options]);

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
    // Validate that all options have labels
    const validOptions = editingOptions.filter(option => option.label.trim().length > 0);
    
    if (validOptions.length < 2) {
      Alert.alert('Invalid Configuration', 'You need at least 2 valid options with names.');
      return;
    }
    
    HapticFeedback.success();
    onSave(validOptions);
    onClose();
  };

  return (
    <View style={settingsStyles.container}>
      <View style={settingsStyles.header}>
        <Text style={settingsStyles.title}>Spinner Settings</Text>
        <Text style={settingsStyles.subtitle}>Customize your wheel options and weights</Text>
      </View>

      <ScrollView style={settingsStyles.optionsList}>
        {editingOptions.map((option, index) => (
          <View key={index} style={settingsStyles.optionItem}>
            <View style={settingsStyles.optionHeader}>
              <Text style={settingsStyles.optionNumber}>Option {index + 1}</Text>
              <TouchableOpacity
                style={settingsStyles.deleteButton}
                onPress={() => deleteOption(index)}
              >
                <Text style={settingsStyles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>

            <View style={settingsStyles.inputRow}>
              <Text style={settingsStyles.inputLabel}>Label:</Text>
              <TextInput
                style={settingsStyles.textInput}
                value={option.label}
                onChangeText={(text) => updateOption(index, 'label', text)}
                placeholder="Enter option name"
              />
            </View>

            <View style={settingsStyles.inputRow}>
              <Text style={settingsStyles.inputLabel}>Weight:</Text>
              <TextInput
                style={settingsStyles.numberInput}
                value={option.weight.toString()}
                onChangeText={(text) => {
                  const weight = parseFloat(text) || 1;
                  updateOption(index, 'weight', Math.max(0.1, weight));
                }}
                placeholder="1"
                keyboardType="numeric"
              />
              <Text style={settingsStyles.weightHelp}>Higher = bigger slice</Text>
            </View>

            <View style={settingsStyles.inputRow}>
              <Text style={settingsStyles.inputLabel}>Color:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={settingsStyles.colorPicker}>
                {colorOptions.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      settingsStyles.colorOption,
                      { backgroundColor: color },
                      option.color === color && settingsStyles.selectedColor,
                    ]}
                    onPress={() => {
                      updateOption(index, 'color', color);
                      HapticFeedback.light();
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={settingsStyles.addButton} onPress={addOption}>
        <Text style={settingsStyles.addButtonText}>+ Add Option</Text>
      </TouchableOpacity>

      <View style={settingsStyles.buttons}>
        <TouchableOpacity style={settingsStyles.cancelButton} onPress={onClose}>
          <Text style={settingsStyles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={settingsStyles.saveButton} onPress={handleSave}>
          <Text style={settingsStyles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  const [options, setOptions] = useState<SpinnerOption[]>(defaultOptions);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Load saved options on mount
  useEffect(() => {
    const savedData = getSparkData('spinner');
    if (savedData.options) {
      setOptions(savedData.options);
    }
  }, [getSparkData]);

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
      // Calculate result based on final angle (right position at 90 degrees)
      const normalizedAngle = (finalAngle % 360);
      // Find which segment is at 90 degrees (right side)
      const selectedOption = getSelectedOptionAt0Degrees(normalizedAngle);
      
      setResult(selectedOption.label);
      setIsSpinning(false);
      HapticFeedback.success();
    });
  };

  const getSelectedOptionAt0Degrees = (wheelRotation: number) => {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    
    let currentAngle = 0;
    for (let i = 0; i < options.length; i++) {
      const segmentAngle = (options[i].weight / totalWeight) * 360;
      const startDegrees = currentAngle;
      const endDegrees = currentAngle + segmentAngle;
      
      // Calculate where this segment is after rotation
      const rotatedStart = (startDegrees + wheelRotation) % 360;
      const rotatedEnd = (endDegrees + wheelRotation) % 360;
      
      // Check if this segment contains the 0-degree position
      const contains0 = (rotatedStart <= 0 && rotatedEnd > 0) || 
                        (rotatedStart > rotatedEnd && (rotatedStart <= 0 || 0 < rotatedEnd));
      
      if (contains0) {
        return options[i];
      }
      
      currentAngle = endDegrees;
    }
    
    // Fallback to first option
    return options[0];
  };

  const saveOptions = (newOptions: SpinnerOption[]) => {
    setOptions(newOptions);
    setSparkData('spinner', { options: newOptions });
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
      <SpinnerSettings
        options={options}
        onSave={saveOptions}
        onClose={onCloseSettings}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎡 Decision Spinner</Text>
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
            
            // Calculate where this segment is after rotation
            const rotatedStart = (startDegrees + finalRotation) % 360;
            const rotatedEnd = (endDegrees + finalRotation) % 360;
            
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    alignItems: 'center',
    padding: 20,
    minHeight: '100%',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderRightWidth: 25,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FF4757',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 10,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  controls: {
    alignItems: 'center',
    gap: 15,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  spinButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  settingsButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#666',
  },
  settingsButtonText: {
    color: '#666',
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    maxHeight: 150,
    overflow: 'scroll',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  debugHighlight: {
    color: '#FF4757',
    fontWeight: 'bold',
  },
});

const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  optionsList: {
    flex: 1,
    marginBottom: 20,
  },
  optionItem: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  optionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputLabel: {
    width: 60,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  numberInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  weightHelp: {
    marginLeft: 10,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  colorPicker: {
    flex: 1,
    marginLeft: 10,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#666',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#28A745',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});