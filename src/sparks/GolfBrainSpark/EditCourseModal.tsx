import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Course, Hole } from './types';

interface EditCourseModalProps {
  visible: boolean;
  onClose: () => void;
  course: Course;
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  colors: any;
}

export const EditCourseModal: React.FC<EditCourseModalProps> = ({ 
  visible, 
  onClose, 
  course, 
  onUpdateCourse, 
  colors 
}) => {
  const [courseName, setCourseName] = useState(course?.name || "");
  const [parList, setParList] = useState(
    course?.holes?.map((h) => h.par).join(" ") || ""
  );
  const [difficultyList, setDifficultyList] = useState(
    course?.holes?.map((h) => h.strokeIndex).join(" ") || ""
  );
  const [distanceList, setDistanceList] = useState(
    course?.holes
      ?.filter((h) => h.distanceYards)
      .map((h) => h.distanceYards)
      .join(" ") || ""
  );

  // Guard clause to prevent rendering if course is null
  if (!course) {
    return null;
  }

  const parseSpaceSeparatedList = (
    input: string,
    min: number,
    max: number
  ): number[] => {
    if (!input.trim()) return [];
    return input
      .trim()
      .split(/\s+/)
      .map((item) => parseInt(item))
      .filter((num) => !isNaN(num) && num >= min && num <= max);
  };

  const handleUpdate = () => {
    if (!courseName.trim()) {
      Alert.alert("Error", "Please enter a course name");
      return;
    }

    const pars = parseSpaceSeparatedList(parList, 3, 5);
    const difficulties = parseSpaceSeparatedList(difficultyList, 1, 18);
    const distances = parseSpaceSeparatedList(distanceList, 50, 600);

    // If no pars provided, default to 18 par 4s
    const finalPars = pars.length > 0 ? pars : Array(18).fill(4);

    // If no difficulties provided, default to sequential 1-18
    const finalDifficulties =
      difficulties.length > 0
        ? difficulties
        : Array.from({ length: finalPars.length }, (_, i) => i + 1);

    // If no distances provided, don't set distanceYards at all (make it optional)
    const finalDistances = distances.length > 0 ? distances : [];

    // Ensure we have the same number of pars and difficulties
    const holeCount = Math.max(finalPars.length, finalDifficulties.length);
    const holes: Hole[] = Array.from({ length: holeCount }, (_, index) => ({
      number: index + 1,
      par: finalPars[index] || 4,
      strokeIndex: finalDifficulties[index] || index + 1,
      // Only set distanceYards if distances were provided
      ...(finalDistances.length > 0 && {
        distanceYards: finalDistances[index] || undefined,
      }),
    }));

    onUpdateCourse(course.id, {
      name: courseName.trim(),
      holes,
    });

    onClose();
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: "90%",
      maxWidth: 500,
      maxHeight: "90%",
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 20,
      textAlign: "center",
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
    },
    fieldLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    helpText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
      fontStyle: "italic",
    },
    buttons: {
      flexDirection: "row",
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    updateButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButtonText: {
      color: colors.text,
    },
    updateButtonText: {
      color: colors.background,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Course</Text>

          <TextInput
            style={styles.input}
            placeholder="Course Name"
            placeholderTextColor={colors.textSecondary}
            value={courseName}
            onChangeText={setCourseName}
          />

          <Text style={styles.fieldLabel}>Par List</Text>
          <TextInput
            style={styles.input}
            placeholder="4 4 3 5 4 4 3 4 5 4 4 3 5 4 4 3 4 5"
            placeholderTextColor={colors.textSecondary}
            value={parList}
            onChangeText={setParList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of pars (3-5).
          </Text>

          <Text style={styles.fieldLabel}>Difficulty Index List</Text>
          <TextInput
            style={styles.input}
            placeholder="1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18"
            placeholderTextColor={colors.textSecondary}
            value={difficultyList}
            onChangeText={setDifficultyList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of difficulty indexes (1-18).
          </Text>

          <Text style={styles.fieldLabel}>Distance List</Text>
          <TextInput
            style={styles.input}
            placeholder="400 350 150 550 400 380 140 520 400 420 160 580 400 360 130 500 400 450"
            placeholderTextColor={colors.textSecondary}
            value={distanceList}
            onChangeText={setDistanceList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of distances in yards (50-600).
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
            >
              <Text style={[styles.buttonText, styles.updateButtonText]}>
                Update
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

