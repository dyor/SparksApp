import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Course, Hole } from './types';
import { parseNumericList } from './utils';

interface CreateCourseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateCourse: (course: Omit<Course, "id" | "createdAt">) => void;
  colors: any;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
  visible,
  onClose,
  onCreateCourse,
  colors
}) => {
  const [courseName, setCourseName] = useState("");
  const [parList, setParList] = useState("");
  const [difficultyList, setDifficultyList] = useState("");
  const [distanceList, setDistanceList] = useState("");


  const handleCreate = () => {
    if (!courseName.trim()) {
      Alert.alert("Error", "Please enter a course name");
      return;
    }

    const pars = parseNumericList(parList, 3, 5);
    const difficulties = parseNumericList(difficultyList, 1, 18);
    const distances = parseNumericList(distanceList, 50, 600); // 50-600 yards

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

    onCreateCourse({
      name: courseName.trim(),
      holes,
    });

    // Reset form
    setCourseName("");
    setParList("");
    setDifficultyList("");
    setDistanceList("");
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
    createButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButtonText: {
      color: colors.text,
    },
    createButtonText: {
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
              <Text style={styles.modalTitle}>Add New Course</Text>

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

                <Text style={styles.fieldLabel}>Par List (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4, 4, 3, 5..."
                  placeholderTextColor={colors.textSecondary}
                  value={parList}
                  onChangeText={setParList}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>
                  Comma or space-separated list of pars (3-5). Defaults to 18 par 4s if empty.
                </Text>

                <Text style={styles.fieldLabel}>
                  Difficulty Index List (Optional)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="1, 2, 3, 4..."
                  placeholderTextColor={colors.textSecondary}
                  value={difficultyList}
                  onChangeText={setDifficultyList}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>
                  Comma or space-separated list of difficulty indexes (1-18). Defaults to
                  sequential 1-18 if empty.
                </Text>

                <Text style={styles.fieldLabel}>Distance List (Optional)</Text>
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
                  style={[styles.button, styles.createButton]}
                  onPress={handleCreate}
                >
                  <Text style={[styles.buttonText, styles.createButtonText]}>
                    Create
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

