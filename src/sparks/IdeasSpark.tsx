import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useSparkStore } from "../store";
import { HapticFeedback } from "../utils/haptics";
import { useTheme } from "../contexts/ThemeContext";
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsFeedbackSection,
  SettingsButton,
  SettingsSection,
} from "../components/SettingsComponents";
import { ServiceFactory } from "../services/ServiceFactory";
import Markdown from "react-native-markdown-display";

interface Idea {
  id: string;
  text: string;
  timestamp: number;
}

interface IdeasSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

// Help Modal Content
const HELP_CONTENT = `
# Ideas Spark Help

**Functionality:**
- **Capture Ideas**: Document your thoughts quickly.
- **Markdown Support**: Use **bold**, *italics*, and URLs.
- **Search & Sort**: Find ideas easily. Sort by entered date or alphabetically.

**View Modes:**
- **Condensed**: Shows 2 lines of text.
- **Default**: Shows 4 lines of text.
- **Expanded**: Click an idea to see full text.

**Editing:**
- Click the edit icon to modify an idea.
- Use formatting tools for emphasis.
- Save requires confirmation.
`;

const HelpModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  themeColors: any;
}> = ({ visible, onClose, themeColors }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <View
        style={{
          backgroundColor: themeColors.surface,
          borderRadius: 16,
          padding: 20,
          width: "100%",
          maxHeight: "80%",
        }}
      >
        <ScrollView>
          <Markdown style={{ body: { color: themeColors.text } }}>
            {HELP_CONTENT}
          </Markdown>
        </ScrollView>
        <TouchableOpacity
          onPress={onClose}
          style={{
            marginTop: 20,
            padding: 12,
            backgroundColor: themeColors.primary,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const IdeasSettings: React.FC<{
  onClose: () => void;
  currentTheme: "light" | "dark";
  onToggleTheme: () => void;
}> = ({ onClose, currentTheme, onToggleTheme }) => {
  const [helpVisible, setHelpVisible] = useState(false);

  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="Ideas Settings"
          subtitle="Manage your idea preferences"
          icon="💡"
          sparkId="ideas"
        />
        <SettingsFeedbackSection sparkName="Ideas" sparkId="ideas" />

        <SettingsSection title="Appearance">
          <SettingsButton
            title={`Current Theme: ${currentTheme.toUpperCase()} (Tap to Toggle)`}
            onPress={onToggleTheme}
            variant="outline"
          />
        </SettingsSection>

        <SettingsSection title="Help">
          <SettingsButton
            title="How to use Ideas"
            onPress={() => setHelpVisible(true)}
            variant="secondary"
          />
        </SettingsSection>

        <SettingsButton title="Close" variant="secondary" onPress={onClose} />
        <HelpModal
          visible={helpVisible}
          onClose={() => setHelpVisible(false)}
          themeColors={getThemeColors(currentTheme)}
        />
      </SettingsScrollView>
    </SettingsContainer>
  );
};

const getThemeColors = (mode: "light" | "dark") =>
  mode === "light"
    ? {
      background: "#F2F2F7",
      surface: "#FFFFFF",
      text: "#000000",
      textSecondary: "#8E8E93",
      border: "#C6C6C8",
      primary: "#007AFF",
      error: "#FF3B30",
      danger: "#FF3B30",
      success: "#34C759",
    }
    : {
      background: "#000000",
      surface: "#1C1C1E",
      text: "#FFFFFF",
      textSecondary: "#8E8E93",
      border: "#38383A",
      primary: "#0A84FF",
      error: "#FF453A",
      danger: "#FF453A",
      success: "#32D74B",
    };

export const IdeasSpark: React.FC<IdeasSparkProps> = ({
  showSettings = false,
  onCloseSettings,
}) => {
  const getSparkData = useSparkStore((state: any) => state.getSparkData);
  const setSparkData = useSparkStore((state: any) => state.setSparkData);
  const isHydrated = useSparkStore((state: any) => state.isHydrated);

  // Local state
  const [localThemeMode, setLocalThemeMode] = useState<"light" | "dark">(
    "light",
  );

  // Compute local colors based on theme mode
  const colors = getThemeColors(localThemeMode);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newIdeaText, setNewIdeaText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "alpha">("date");
  const [isCondensedMode, setIsCondensedMode] = useState(false); // Default is 4 lines (false)
  const [expandedIdeaId, setExpandedIdeaId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 }); // Track text selection

  // Initial Load
  useEffect(() => {
    if (!isHydrated) return;
    const savedData = getSparkData("ideas");
    if (savedData.ideas) {
      setIdeas(savedData.ideas);
    }
    if (savedData.localThemeMode) {
      setLocalThemeMode(savedData.localThemeMode);
    }
    if (savedData.sortBy) {
      setSortBy(savedData.sortBy);
    }
    if (savedData.isCondensedMode !== undefined) {
      setIsCondensedMode(savedData.isCondensedMode);
    }
    setDataLoaded(true);
  }, [getSparkData, isHydrated]);

  // Persistence
  useEffect(() => {
    if (!isHydrated || !dataLoaded) return;
    const savedData = getSparkData("ideas");
    setSparkData("ideas", {
      ...savedData,
      ideas,
      localThemeMode,
      sortBy,
      isCondensedMode,
    });
  }, [
    ideas,
    localThemeMode,
    sortBy,
    isCondensedMode,
    setSparkData,
    getSparkData,
    isHydrated,
    dataLoaded,
  ]);

  useEffect(() => {
    ServiceFactory.getAnalyticsService().trackSparkOpen("ideas", "Ideas");
  }, []);

  // --- Helper: Convert Custom Tags to Markdown for rendering ---
  const preprocessText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/<b\s+([\s\S]*?)\s+b>/g, "**$1**") // Bold: <b text b> -> **text**
      .replace(/<i\s+([\s\S]*?)\s+i>/g, "*$1*") // Italic: <i text i> -> *text*
      .replace(/<j\s+([\s\S]*?)\s+j>/g, "==$1==") // (Optional extra)
      .replace(/<h\s+([\s\S]*?)\s+h>/g, "`$1`") // Highlight: <h text h> -> `text`
      .replace(/<#\s+([\s\S]*?)\s+#>/g, "\n# $1\n"); // Header: <# text #> -> # text
  };

  const addIdea = () => {
    if (editingId) return; // Disable adding while editing
    if (!newIdeaText.trim()) return;
    const newIdea: Idea = {
      id: Date.now().toString(),
      text: newIdeaText.trim(),
      timestamp: Date.now(),
    };
    setIdeas((prev) => [newIdea, ...prev]);
    setNewIdeaText("");
    HapticFeedback.light();
  };

  const confirmDelete = (id: string) => {
    const performDelete = () => {
      setIdeas((prev) => prev.filter((i) => i.id !== id));
      HapticFeedback.medium();
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this idea?")) {
        performDelete();
      }
    } else {
      Alert.alert("Delete Idea", "Are you sure you want to delete this idea?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete },
      ]);
    }
  };

  const startEditing = (idea: Idea) => {
    if (editingId) return; // Prevent starting another edit if one is active
    setEditingId(idea.id);
    setEditText(idea.text);
    setSelection({ start: 0, end: 0 }); // Reset selection
  };

  const saveEdit = () => {
    const performSave = () => {
      setIdeas((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, text: editText } : i)),
      );
      setEditingId(null);
      setEditText("");
      HapticFeedback.success();
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to save changes?")) {
        performSave();
      }
    } else {
      Alert.alert("Save Changes", "Are you sure you want to save changes?", [
        { text: "Cancel", style: "cancel" },
        { text: "Save", onPress: performSave },
      ]);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const insertFormat = (tag: string, closeTag?: string) => {
    const start = selection.start;
    const end = selection.end;
    const tagEnd = closeTag || tag;

    if (start === end) {
      // No selection: insert at cursor
      const newText =
        editText.slice(0, start) + tag + tagEnd + editText.slice(end);
      setEditText(newText);
    } else {
      // Wrap selection
      const selectedText = editText.slice(start, end);
      const newText =
        editText.slice(0, start) +
        tag +
        selectedText +
        tagEnd +
        editText.slice(end);
      setEditText(newText);
    }
  };

  const filteredIdeas = ideas
    .filter((i) => i.text.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "date") return b.timestamp - a.timestamp;
      return a.text.localeCompare(b.text);
    });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingTop: 60, backgroundColor: colors.surface },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    title: { fontSize: 28, fontWeight: "bold", color: colors.text },
    controls: { flexDirection: "row", gap: 10 },
    controlBtn: {
      padding: 8,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    searchBar: {
      backgroundColor: colors.background,
      padding: 10,
      borderRadius: 8,
      color: colors.text,
    },

    listContent: { padding: 16, paddingBottom: 100 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    dateText: { fontSize: 12, color: colors.textSecondary },
    headerIcons: { flexDirection: "row", gap: 12 },
    iconText: { fontSize: 18 },

    disabledCard: { opacity: 0.5 },

    // Edit Mode Styles
    editContainer: {},
    editInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 8,
      color: colors.text,
      minHeight: 300,
      textAlignVertical: "top",
      marginBottom: 8,
    },
    toolbar: { flexDirection: "row", gap: 8, marginBottom: 8 },
    toolBtn: {
      padding: 6,
      backgroundColor: colors.background,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
    saveBtn: { padding: 8, backgroundColor: colors.primary, borderRadius: 6 },
    cancelBtn: { padding: 8, backgroundColor: colors.border, borderRadius: 6 },
    btnText: { color: "#fff", fontWeight: "600" },

    inputArea: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
      backgroundColor: colors.surface,
      opacity: editingId ? 0.5 : 1,
    },
    mainInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      color: colors.text,
      minHeight: 60,
    },
    addBtn: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 8,
    },
  });

  if (showSettings) {
    return (
      <IdeasSettings
        onClose={onCloseSettings!}
        currentTheme={localThemeMode}
        onToggleTheme={() =>
          setLocalThemeMode((prev) => (prev === "light" ? "dark" : "light"))
        }
      />
    );
  }

  const renderItem = ({ item }: { item: Idea }) => {
    const isEditing = editingId === item.id;
    const isReferenceIDExpanded = expandedIdeaId === item.id;
    const isOtherEditing = editingId !== null && !isEditing;

    if (isEditing) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.dateText}>Editing...</Text>
          </View>
          <View style={styles.editContainer}>
            <View style={[styles.toolbar, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => insertFormat("<b ", " b>")}
                  style={styles.toolBtn}
                >
                  <Text style={{ color: colors.text, fontWeight: "bold" }}>
                    B
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => insertFormat("<i ", " i>")}
                  style={styles.toolBtn}
                >
                  <Text style={{ color: colors.text, fontStyle: "italic" }}>
                    I
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => insertFormat("<h ", " h>")}
                  style={styles.toolBtn}
                >
                  <Text
                    style={{ color: colors.text, backgroundColor: "#fff176" }}
                  >
                    H
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => insertFormat("<# ", " #>")}
                  style={styles.toolBtn}
                >
                  <Text style={{ color: colors.text, fontWeight: "bold" }}>
                    T
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={saveEdit}
                  style={[styles.toolBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    SAVE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelEdit}
                  style={[styles.toolBtn, { borderColor: colors.danger }]}
                >
                  <Text style={{ color: colors.danger }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              onSelectionChange={(e: any) =>
                setSelection(e.nativeEvent.selection)
              }
              style={styles.editInput}
              multiline
              placeholder="Write your idea here (use <b text b> for bold...)"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (isOtherEditing) return;
          setExpandedIdeaId(isReferenceIDExpanded ? null : item.id);
        }}
        disabled={isOtherEditing}
        style={[styles.card, isOtherEditing && styles.disabledCard]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
          {!isOtherEditing && (
            <View style={styles.headerIcons}>
              <TouchableOpacity onPress={() => startEditing(item)} hitSlop={10}>
                <Text style={styles.iconText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDelete(item.id)}
                hitSlop={10}
              >
                <Text style={styles.iconText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View
          style={{
            maxHeight: isReferenceIDExpanded
              ? undefined
              : isCondensedMode
                ? 48
                : 120,
            overflow: "hidden",
          }}
        >
          <Markdown
            style={{
              body: { color: colors.text, fontSize: 16, lineHeight: 24 },
              link: { color: colors.primary, textDecorationLine: "underline" },
              code_inline: {
                backgroundColor: "#fff176",
                color: colors.text,
                fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
                fontWeight: "bold",
                borderRadius: 4,
                paddingHorizontal: 4,
              },
            }}
          >
            {preprocessText(item.text)}
          </Markdown>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>💡 Ideas</Text>
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={() =>
                setSortBy((prev) => (prev === "date" ? "alpha" : "date"))
              }
              style={styles.controlBtn}
            >
              <Text style={{ fontSize: 16, color: colors.text }}>
                {sortBy === "date" ? "📅" : "AZ"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setIsCondensedMode(!isCondensedMode);
                setExpandedIdeaId(null); // Reset any expanded ideas
              }}
              style={styles.controlBtn}
            >
              <Text style={{ fontSize: 16, color: colors.text }}>
                {isCondensedMode ? "Expanded" : "Condensed"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <TextInput
          style={styles.searchBar}
          placeholder="Search..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={!editingId}
        />
      </View>

      <FlatList
        data={filteredIdeas}
        renderItem={renderItem}
        keyExtractor={(item: Idea) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: colors.textSecondary }}>No ideas yet</Text>
          </View>
        }
      />

      <View
        style={styles.inputArea}
        pointerEvents={editingId ? "none" : "auto"}
      >
        <TextInput
          style={styles.mainInput}
          placeholder="New Idea..."
          placeholderTextColor={colors.textSecondary}
          value={newIdeaText}
          onChangeText={setNewIdeaText}
          multiline
          editable={!editingId}
        />
        {newIdeaText.trim().length > 0 && (
          <TouchableOpacity onPress={addIdea} style={styles.addBtn}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Save Idea</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
