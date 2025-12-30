import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebaseConfig";
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsFeedbackSection,
} from "../components/SettingsComponents";

const THEME_STORAGE_KEY = "@theme_mode_ideas2";
const SORT_STORAGE_KEY = "@sort_by_ideas2";
const VIEW_MODE_STORAGE_KEY = "@view_mode_ideas2";
const EXPANDED_IDS_STORAGE_KEY = "@expanded_ids_ideas2";

// Types
interface Idea {
  id: string;
  text: string;
  timestamp: number;
}

// --- Idea Item Component ---
const IdeaItem = React.memo(function IdeaItem({
  item,
  theme,
  styles,
  searchText,
  isExpanded,
  onToggleExpand,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  viewMode,
}: {
  item: Idea;
  theme: any;
  styles: any;
  searchText: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (text: string) => Promise<void>;
  onDelete: () => void;
  viewMode: "normal" | "compact";
}) {
  const [editText, setEditText] = useState(item.text);
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const [editSelection, setEditSelection] = useState({ start: 0, end: 0 });

  // Sync editText if item changes while not editing
  useEffect(() => {
    if (!isEditing) {
      setEditText(item.text);
      setIsConfirmingSave(false);
    }
  }, [item.text, isEditing]);

  const date = new Date(item.timestamp).toLocaleDateString();

  const handleSave = async () => {
    if (editText.trim().length === 0) return;
    if (!isConfirmingSave) {
      setIsConfirmingSave(true);
      return;
    }
    await onSave(editText);
    setIsConfirmingSave(false);
  };

  const applyFormatting = (
    type: "bold" | "italic" | "underline" | "bullet" | "highlight"
  ) => {
    const { start, end } = editSelection;
    const selectedText = editText.substring(start, end);

    if (type === "bullet") {
      const before = editText.substring(0, start);
      const after = editText.substring(end);
      const lines = selectedText.split("\n");
      const bulletedText = lines
        .map((line) => {
          if (line.trim().length === 0 && lines.length === 1) return "• ";
          return line.startsWith("• ") ? line : `• ${line}`;
        })
        .join("\n");
      setEditText(`${before}${bulletedText}${after}`);
      return;
    }

    let prefix = "";
    let suffix = "";
    switch (type) {
      case "bold":
        prefix = "**";
        suffix = "**";
        break;
      case "italic":
        prefix = "*";
        suffix = "*";
        break;
      case "underline":
        prefix = "<u>";
        suffix = "</u>";
        break;
      case "highlight":
        prefix = "==";
        suffix = "==";
        break;
    }

    const before = editText.substring(0, start);
    const after = editText.substring(end);
    setEditText(`${before}${prefix}${selectedText}${suffix}${after}`);
  };

  const renderTextWithLinks = (
    text: string,
    isExpanded: boolean,
    id: string,
    searchQuery: string,
    numberOfLines?: number,
    datePrefix?: string
  ) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    const highlightSearch = (content: string, keyPrefix: string) => {
      if (!searchQuery.trim()) return renderMarkdown(content, keyPrefix);
      const escapeRegExp = (str: string) =>
        str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const highlightRegex = new RegExp(`(${escapeRegExp(searchQuery)})`, "gi");
      const subParts = content.split(highlightRegex);

      return subParts.map((subPart, i) => {
        if (subPart.toLowerCase() === searchQuery.toLowerCase()) {
          return (
            <Text key={`${keyPrefix}-${i}`} style={styles.highlightText}>
              {renderMarkdown(subPart, `${keyPrefix}-${i}-hl`)}
            </Text>
          );
        }
        return renderMarkdown(subPart, `${keyPrefix}-${i}`);
      });
    };

    const renderMarkdown = (content: string, keyPrefix: string) => {
      const regex = /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|==.*?==|• )/g;
      const parts = content.split(regex);
      return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <Text key={`${keyPrefix}-md-${i}`} style={{ fontWeight: "bold" }}>
              {part.slice(2, -2)}
            </Text>
          );
        if (part.startsWith("*") && part.endsWith("*"))
          return (
            <Text key={`${keyPrefix}-md-${i}`} style={{ fontStyle: "italic" }}>
              {part.slice(1, -1)}
            </Text>
          );
        if (part.startsWith("<u>") && part.endsWith("</u>"))
          return (
            <Text
              key={`${keyPrefix}-md-${i}`}
              style={{ textDecorationLine: "underline" }}
            >
              {part.slice(3, -4)}
            </Text>
          );
        if (part.startsWith("==") && part.endsWith("=="))
          return (
            <Text key={`${keyPrefix}-md-${i}`} style={styles.highlightText}>
              {part.slice(2, -2)}
            </Text>
          );
        if (part === "• ")
          return (
            <Text
              key={`${keyPrefix}-md-${i}`}
              style={{ color: theme.primary, fontWeight: "bold" }}
            >
              •{" "}
            </Text>
          );
        return <Text key={`${keyPrefix}-md-${i}`}>{part}</Text>;
      });
    };

    return (
      <Pressable onPress={() => onToggleExpand(id)}>
        <Text
          style={styles.ideaText}
          numberOfLines={
            numberOfLines !== undefined
              ? numberOfLines
              : isExpanded
              ? undefined
              : 4
          }
          ellipsizeMode="tail"
        >
          {datePrefix && (
            <Text style={{ color: theme.textSecondary, fontWeight: "500" }}>
              {datePrefix}
            </Text>
          )}
          {parts.map((part, index) => {
            if (part.match(urlRegex)) {
              return (
                <Text
                  key={index}
                  style={styles.linkText}
                  onPress={() => Linking.openURL(part)}
                >
                  {highlightSearch(part, `link-${index}`)}
                </Text>
              );
            }
            return highlightSearch(part, `part-${index}`);
          })}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.card}>
      {isEditing ? (
        <View>
          <View style={styles.toolbar}>
            <View style={styles.actionGroup}>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.toolbarButton, styles.saveToolbarButton]}
              >
                <Text style={[styles.toolbarText, styles.saveButtonText]}>
                  {isConfirmingSave ? "Confirm" : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onCancelEdit}
                style={[styles.toolbarButton, styles.cancelToolbarButton]}
              >
                <Text style={styles.toolbarText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formatGroup}>
              <TouchableOpacity
                onPress={() => applyFormatting("highlight")}
                style={styles.toolbarButton}
              >
                <Ionicons name="flashlight" size={18} color={theme.highlight} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyFormatting("bullet")}
                style={styles.toolbarButton}
              >
                <Ionicons name="list" size={18} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyFormatting("bold")}
                style={styles.toolbarButton}
              >
                <Text style={[styles.toolbarText, { fontWeight: "bold" }]}>
                  B
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyFormatting("italic")}
                style={styles.toolbarButton}
              >
                <Text style={[styles.toolbarText, { fontStyle: "italic" }]}>
                  I
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyFormatting("underline")}
                style={styles.toolbarButton}
              >
                <Text
                  style={[
                    styles.toolbarText,
                    { textDecorationLine: "underline" },
                  ]}
                >
                  U
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            onSelectionChange={(e) => setEditSelection(e.nativeEvent.selection)}
            multiline
            autoFocus
          />
        </View>
      ) : (
        <View>
          {!isExpanded && viewMode === "compact" ? null : (
            <View style={styles.cardHeader}>
              <Text style={styles.dateText}>{date}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={onStartEdit}
                  style={styles.iconButton}
                >
                  <Ionicons name="pencil" size={20} color={theme.secondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
                  <Ionicons name="trash" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {renderTextWithLinks(
            item.text,
            isExpanded,
            item.id,
            searchText,
            viewMode === "compact" && !isExpanded
              ? 2
              : isExpanded
              ? undefined
              : 4,
            viewMode === "compact" && !isExpanded
              ? (() => {
                  const d = new Date(item.timestamp);
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  const yy = String(d.getFullYear()).slice(-2);
                  return `${mm}/${dd}/${yy} `;
                })()
              : undefined
          )}
        </View>
      )}
    </View>
  );
});

// Theme Definitions
const DarkTheme = {
  background: "#121212",
  card: "#1E1E1E",
  text: "#FFFFFF",
  textSecondary: "#BDBDBD",
  primary: "#BB86FC",
  secondary: "#03DAC6",
  danger: "#CF6679",
  inputBg: "#2C2C2C",
  link: "#64B5F6",
  highlight: "#D4AF37",
  iconOnPrimary: "#000",
  borderColor: "#333",
};

const LightTheme = {
  background: "#F5F5F5",
  card: "#FFFFFF",
  text: "#000000",
  textSecondary: "#666666",
  primary: "#6200EE",
  secondary: "#03DAC6",
  danger: "#B00020",
  inputBg: "#E0E0E0",
  link: "#2196F3",
  highlight: "#FFEB3B",
  iconOnPrimary: "#FFFFFF",
  borderColor: "#E0E0E0",
};

export const Ideas2Spark: React.FC<{
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({ showSettings, onCloseSettings }) => {
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const theme = themeMode === "dark" ? DarkTheme : LightTheme;
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [sortBy, setSortBy] = useState<"date" | "firstLine">("firstLine");
  const [viewMode, setViewMode] = useState<"normal" | "compact">("normal");
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const savedSort = await AsyncStorage.getItem(SORT_STORAGE_KEY);
        const savedView = await AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY);
        const savedExpanded = await AsyncStorage.getItem(
          EXPANDED_IDS_STORAGE_KEY
        );
        if (savedTheme === "light" || savedTheme === "dark")
          setThemeMode(savedTheme);
        if (savedSort === "date" || savedSort === "firstLine")
          setSortBy(savedSort);
        if (savedView === "normal" || savedView === "compact")
          setViewMode(savedView);
        if (savedExpanded) setExpandedIds(new Set(JSON.parse(savedExpanded)));
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (isSettingsLoaded) {
      AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode).catch((err) =>
        console.error("Error saving theme:", err)
      );
    }
  }, [themeMode, isSettingsLoaded]);

  useEffect(() => {
    if (isSettingsLoaded) {
      AsyncStorage.setItem(SORT_STORAGE_KEY, sortBy).catch((err) =>
        console.error("Error saving sort:", err)
      );
    }
  }, [sortBy, isSettingsLoaded]);

  useEffect(() => {
    if (isSettingsLoaded) {
      AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode).catch((err) =>
        console.error("Error saving view mode:", err)
      );
    }
  }, [viewMode, isSettingsLoaded]);

  useEffect(() => {
    if (isSettingsLoaded) {
      AsyncStorage.setItem(
        EXPANDED_IDS_STORAGE_KEY,
        JSON.stringify(Array.from(expandedIds))
      ).catch((err) => console.error("Error saving expanded ids:", err));
    }
  }, [expandedIds, isSettingsLoaded]);

  useEffect(() => {
    if (!db) {
      console.warn("Ideas2Spark: Firestore db is not available");
      return;
    }
    const q = query(collection(db, "ideas2"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ideasData: Idea[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text,
        timestamp: doc.data().timestamp,
      }));
      setIdeas(ideasData);
    });
    return () => unsubscribe();
  }, []);

  const addIdea = async () => {
    const ideaText = text.trim();
    if (ideaText.length === 0) return;

    if (!db) {
      Alert.alert(
        "Error",
        "Database is not available. Please check your configuration."
      );
      return;
    }

    setText(""); // Clear immediately for better UX

    try {
      await addDoc(collection(db, "ideas2"), {
        text: ideaText,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error adding idea: ", error);
      setText(ideaText); // Restore if failed
      if (Platform.OS === "web") {
        window.alert("Failed to add idea. Please check your connection.");
      } else {
        Alert.alert("Error", "Failed to add idea.");
      }
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      await deleteDoc(doc(db, "ideas2", id));
    } catch (error) {
      console.error("Error deleting idea: ", error);
    }
  };

  const confirmDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure?")) deleteIdea(id);
    } else {
      Alert.alert("Delete Idea", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: () => deleteIdea(id), style: "destructive" },
      ]);
    }
  };

  const saveEdit = async (id: string, newText: string) => {
    setEditingId(null);
    try {
      await updateDoc(doc(db, "ideas2", id), { text: newText.trim() });
    } catch (error) {
      console.error("Error updating idea: ", error);
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  const toggleExpand = (id: string) => {
    if (viewMode === "compact") {
      setViewMode("normal");
      setExpandedIds(new Set([id]));
      return;
    }
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  const renderItem = ({ item }: { item: Idea }) => (
    <IdeaItem
      item={item}
      theme={theme}
      styles={styles}
      searchText={searchText}
      isExpanded={expandedIds.has(item.id)}
      onToggleExpand={toggleExpand}
      isEditing={editingId === item.id}
      onStartEdit={() => setEditingId(item.id)}
      onCancelEdit={() => setEditingId(null)}
      onSave={(t) => saveEdit(item.id, t)}
      onDelete={() => confirmDelete(item.id)}
      viewMode={viewMode}
    />
  );

  const filteredIdeas = ideas
    .filter((idea) =>
      idea.text.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "date") return b.timestamp - a.timestamp;
      return a.text
        .split("\n")[0]
        .toLowerCase()
        .localeCompare(b.text.split("\n")[0].toLowerCase());
    });

  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Ideas 2 Settings"
            subtitle="Manage your ideas 2 spark"
            icon="💡"
            sparkId="ideas2"
          />
          <SettingsFeedbackSection sparkName="Ideas 2" sparkId="ideas2" />
          <TouchableOpacity
            style={[
              styles.toolbarButton,
              { marginTop: 20, alignSelf: "center", paddingHorizontal: 20 },
            ]}
            onPress={() => onCloseSettings?.()}
          >
            <Text style={styles.toolbarText}>Close</Text>
          </TouchableOpacity>
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={styles.title}>Ideas 2</Text>
            <Text style={styles.subtitle}>Capture your thoughts</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            <TouchableOpacity
              onPress={() =>
                setViewMode((prev) =>
                  prev === "normal" ? "compact" : "normal"
                )
              }
            >
              <Ionicons
                name={viewMode === "compact" ? "list" : "grid-outline"}
                size={26}
                color={theme.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))
              }
            >
              <Ionicons
                name={themeMode === "dark" ? "sunny" : "moon"}
                size={26}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ideas..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() =>
              setSortBy((prev) => (prev === "date" ? "firstLine" : "date"))
            }
          >
            <Ionicons
              name={sortBy === "date" ? "time-outline" : "text-outline"}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredIdeas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="bulb-outline"
              size={64}
              color={theme.textSecondary}
            />
            <Text style={styles.emptyText}>
              {searchText
                ? "No matching ideas found."
                : "No ideas yet. Add one below!"}
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          placeholder="New Idea..."
          placeholderTextColor={theme.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity onPress={addIdea} style={styles.addButton}>
          <Ionicons name="arrow-up" size={24} color={theme.iconOnPrimary} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (theme: typeof DarkTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 10,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.inputBg,
      borderRadius: 8,
      paddingLeft: 10,
      marginTop: 10,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      paddingVertical: 8,
      fontSize: 16,
    },
    sortButton: {
      padding: 8,
      borderLeftWidth: 1,
      borderLeftColor: theme.borderColor,
      marginLeft: 5,
    },
    listContent: {
      padding: 16,
      paddingBottom: 100, // Space for input
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    dateText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    cardActions: {
      flexDirection: "row",
    },
    iconButton: {
      padding: 5,
      marginLeft: 10,
    },
    ideaText: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 24,
    },
    linkText: {
      color: theme.link,
      textDecorationLine: "underline",
    },
    highlightText: {
      backgroundColor: theme.highlight,
      color: "#000",
      fontWeight: "bold",
    },
    editInput: {
      backgroundColor: theme.inputBg,
      color: theme.text,
      padding: 10,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      fontSize: 16,
      minHeight: 300, // Increased from 150 to ~12 lines
      textAlignVertical: "top",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      padding: 16,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.borderColor,
    },
    input: {
      flex: 1,
      backgroundColor: theme.inputBg,
      color: theme.text,
      borderRadius: 25,
      paddingHorizontal: 20,
      paddingVertical: 12,
      fontSize: 16,
      maxHeight: 100,
    },
    addButton: {
      marginLeft: 10,
      marginBottom: 4,
      backgroundColor: theme.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 100,
      opacity: 0.5,
    },
    emptyText: {
      color: theme.textSecondary,
      fontSize: 16,
      marginTop: 10,
    },
    toolbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.card,
      padding: 8,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
      gap: 12,
    },
    actionGroup: {
      flexDirection: "row",
      gap: 8,
    },
    formatGroup: {
      flexDirection: "row",
      gap: 15,
    },
    toolbarButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      backgroundColor: theme.inputBg,
      minWidth: 35,
      alignItems: "center",
      justifyContent: "center",
    },
    saveToolbarButton: {
      backgroundColor: theme.secondary,
    },
    cancelToolbarButton: {
      backgroundColor: theme.inputBg,
    },
    saveButtonText: {
      color: "#000",
      fontWeight: "bold",
      fontSize: 14,
    },
    toolbarText: {
      color: theme.text,
      fontSize: 16,
    },
  });

export default Ideas2Spark;
