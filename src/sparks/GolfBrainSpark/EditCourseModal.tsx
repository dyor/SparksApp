import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Course, Hole } from './types';
import { parseNumericList } from './utils';

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
    course?.holes?.map((h) => h.par).join(", ") || ""
  );
  const [difficultyList, setDifficultyList] = useState(
    course?.holes?.map((h) => h.strokeIndex).join(", ") || ""
  );
  const [distanceList, setDistanceList] = useState(
    course?.holes
      ?.filter((h) => h.distanceYards)
      .map((h) => h.distanceYards)
      .join(", ") || ""
  );

  // Guard clause to prevent rendering if course is null
  if (!course) {
    return null;
  }


  const handleUpdate = () => {
    if (!courseName.trim()) {
      Alert.alert("Error", "Please enter a course name");
      return;
    }

    const pars = parseNumericList(parList, 3, 5);
    const difficulties = parseNumericList(difficultyList, 1, 18);
    const distances = parseNumericList(distanceList, 50, 600);

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
    keyboardView: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    scrollContent: {
      paddingBottom: 20,
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Course</Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
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
                  placeholder="4, 4, 3, 5..."
                  placeholderTextColor={colors.textSecondary}
                  value={parList}
                  onChangeText={setParList}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>
                  Comma or space-separated list of pars (3-5).
                </Text>

                <Text style={styles.fieldLabel}>Difficulty Index List</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1, 2, 3, 4..."
                  placeholderTextColor={colors.textSecondary}
                  value={difficultyList}
                  onChangeText={setDifficultyList}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>
                  Comma or space-separated list of difficulty indexes (1-18).
                </Text>

                <Text style={styles.fieldLabel}>Distance List</Text>
                <TextInput
                  style={styles.input}
                  placeholder="400, 350, 150..."
                  placeholderTextColor={colors.textSecondary}
                  value={distanceList}
                  onChangeText={setDistanceList}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>
                  Comma or space-separated list of distances in yards (50-600).
                </Text>
              </ScrollView>

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
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

