import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';

const { width } = Dimensions.get('window');

interface SpanishReaderSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

interface SpanishReaderSettings {
  readingOrder: 'english-first' | 'spanish-first';
}

interface Sentence {
  english: string;
  spanish: string;
}

// Complete text from "Old Man and the Sea" by Ernest Hemmingway
const SENTENCES: Sentence[] = [
  {
    english: "The old man, Santiago, had not caught a fish in eighty-four days.",
    spanish: "El viejo, Santiago, no había pescado un pez en ochenta y cuatro días."
  },
  {
    english: "For the first forty days, a young boy was his helper.",
    spanish: "Durante los primeros cuarenta días, un joven muchacho fue su ayudante."
  },
  {
    english: "But the boy's parents said the old man was *salao*, which means very unlucky.",
    spanish: "Pero los padres del muchacho dijeron que el viejo era *salao*, que significa muy desafortunado."
  },
  {
    english: "So, they told the boy to fish on another boat.",
    spanish: "Entonces, le dijeron al muchacho que pescara en otro barco."
  },
  {
    english: "The boy felt sad seeing the old man return with an empty boat each night.",
    spanish: "El muchacho se sentía triste al ver al viejo regresar con su bote vacío cada noche."
  },
  {
    english: "He would always help the old man carry his fishing gear.",
    spanish: "Él siempre ayudaba al viejo a cargar su equipo de pesca."
  },
  {
    english: "The sail was old and patched, and it looked like a flag of defeat.",
    spanish: "La vela era vieja y estaba remendada, y parecía una bandera de derrota."
  },
  {
    english: "The old man was thin, with deep lines on the back of his neck.",
    spanish: "El viejo era delgado, con arrugas profundas en la nuca."
  },
  {
    english: "The sun had left brown spots on his cheeks from many years on the sea.",
    spanish: "El sol le había dejado manchas marrones en las mejillas por muchos años en el mar."
  },
  {
    english: "His hands had deep scars from pulling the fishing lines.",
    spanish: "Sus manos tenían cicatrices profundas por jalar los sedales de pesca."
  },
  {
    english: "Everything about him seemed old, except for his eyes.",
    spanish: "Todo en él parecía viejo, excepto sus ojos."
  },
  {
    english: "His eyes were the color of the sea, and they were bright and strong.",
    spanish: "Sus ojos eran del color del mar, y eran brillantes y fuertes."
  },
  {
    english: "The next morning, Santiago sailed his skiff into the dark water alone.",
    spanish: "A la mañana siguiente, Santiago navegó su esquife solo en el agua oscura."
  },
  {
    english: "He went farther than any other boat, into the deep part of the ocean.",
    spanish: "Fue más lejos que cualquier otro barco, a la parte profunda del océano."
  },
  {
    english: "Around noon, a huge marlin took the bait.",
    spanish: "Cerca del mediodía, un marlín enorme mordió el anzuelo."
  },
  {
    english: "The fish was so strong that it pulled the small boat.",
    spanish: "El pez era tan fuerte que jalaba el pequeño bote."
  },
  {
    english: "For two days and two nights, the fish pulled the old man across the sea.",
    spanish: "Durante dos días y dos noches, el pez arrastró al viejo a través del mar."
  },
  {
    english: "Santiago's hands were cut, but he did not let go of the line.",
    spanish: "Las manos de Santiago estaban cortadas, pero no soltó el sedal."
  },
  {
    english: "He respected the great fish, calling it his brother.",
    spanish: "Respetaba al gran pez, llamándolo su hermano."
  },
  {
    english: "On the third day, the tired fish came to the surface.",
    spanish: "Al tercer día, el pez cansado salió a la superficie."
  },
  {
    english: "He pulled it close and finally caught it with his harpoon.",
    spanish: "Lo acercó y finalmente lo atrapó con su arpón."
  },
  {
    english: "The fish was longer than his boat, so he tied it to the side.",
    spanish: "El pez era más largo que su bote, así que lo ató al costado."
  },
  {
    english: "As he sailed home, sharks came, smelling the blood.",
    spanish: "Mientras navegaba a casa, llegaron tiburones, oliendo la sangre."
  },
  {
    english: "Santiago fought them, but there were too many.",
    spanish: "Santiago luchó contra ellos, pero eran demasiados."
  },
  {
    english: "By the time he reached the shore, only the fish's skeleton was left.",
    spanish: "Para cuando llegó a la orilla, solo quedaba el esqueleto del pez."
  },
  {
    english: "He stumbled to his shack and fell into a deep sleep.",
    spanish: "Caminó con dificultad hasta su choza y cayó en un sueño profundo."
  },
  {
    english: "The next morning, the fishermen stared at the giant skeleton.",
    spanish: "A la mañana siguiente, los pescadores miraron asombrados el esqueleto gigante."
  },
  {
    english: "The boy found Santiago and brought him coffee.",
    spanish: "El muchacho encontró a Santiago y le trajo café."
  },
  {
    english: "'From now on,' the boy said, 'we will fish together.'",
    spanish: "'De ahora en adelante,' dijo el muchacho, 'pescaremos juntos.'"
  },
  {
    english: "And the old man dreamed of lions on the beach.",
    spanish: "Y el viejo soñó con leones en la playa."
  }
];

const SpanishReaderSpark: React.FC<SpanishReaderSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [settings, setSettings] = useState<SpanishReaderSettings>({
    readingOrder: 'english-first'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        currentSentenceIndex,
        totalSentences: SENTENCES.length,
        settings
      });
    }
  }, [currentSentenceIndex, settings, onStateChange]);

  const loadSettings = async () => {
    try {
      const data = await getSparkData('spanish-reader');
      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading Spanish Reader settings:', error);
    }
  };

  const saveSettings = async (newSettings: SpanishReaderSettings) => {
    try {
      await setSparkData('spanish-reader', { settings: newSettings });
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving Spanish Reader settings:', error);
    }
  };

  const goToPreviousSentence = () => {
    if (currentSentenceIndex > 0) {
      // Stop any ongoing speech when navigating
      if (isSpeaking) {
        Speech.stop();
        setIsSpeaking(false);
      }
      setCurrentSentenceIndex(currentSentenceIndex - 1);
      HapticFeedback.light();
    }
  };

  const goToNextSentence = () => {
    if (currentSentenceIndex < SENTENCES.length - 1) {
      // Stop any ongoing speech when navigating
      if (isSpeaking) {
        Speech.stop();
        setIsSpeaking(false);
      }
      setCurrentSentenceIndex(currentSentenceIndex + 1);
      HapticFeedback.light();
    }
  };

  const speakSpanish = async (text: string) => {
    try {
      if (isSpeaking) {
        Speech.stop();
        setIsSpeaking(false);
        return;
      }

      setIsSpeaking(true);
      Speech.speak(text, {
        language: 'es-ES',
        rate: 0.7,
        pitch: 1.1,
        onDone: () => {
          setIsSpeaking(false);
        },
        onError: () => {
          setIsSpeaking(false);
        },
      });
    } catch (error) {
      console.error('Error in speakSpanish:', error);
      setIsSpeaking(false);
    }
  };

  const renderSentence = (sentence: Sentence, index: number) => {
    const isCurrent = index === currentSentenceIndex;
    const isEnglishFirst = settings.readingOrder === 'english-first';
    
    if (!isCurrent) return null;

    return (
      <View key={index} style={styles.sentenceContainer}>
        {isEnglishFirst ? (
          <>
            <Text style={[styles.englishText, { color: colors.text }]}>
              {sentence.english}
            </Text>
            <View style={styles.spanishContainer}>
              <Text style={[styles.spanishText, { color: colors.primary }]}>
                {sentence.spanish}
              </Text>
              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: colors.primary }]}
                onPress={() => speakSpanish(sentence.spanish)}
              >
                <Text style={[styles.playButtonText, { color: colors.background }]}>
                  {isSpeaking ? '⏸️' : '▶️'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.spanishContainer}>
              <Text style={[styles.spanishText, { color: colors.primary }]}>
                {sentence.spanish}
              </Text>
              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: colors.primary }]}
                onPress={() => speakSpanish(sentence.spanish)}
              >
                <Text style={[styles.playButtonText, { color: colors.background }]}>
                  {isSpeaking ? '⏸️' : '▶️'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.englishText, { color: colors.text }]}>
              {sentence.english}
            </Text>
          </>
        )}
      </View>
    );
  };

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📖 Spanish Reader Settings</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Customize your reading experience
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Reading Order</Text>
        <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
          Choose the order of English and Spanish sentences
        </Text>
        
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioOption,
              { borderColor: colors.border },
              settings.readingOrder === 'english-first' && { borderColor: colors.primary }
            ]}
            onPress={() => saveSettings({ ...settings, readingOrder: 'english-first' })}
          >
            <View style={[
              styles.radioButton,
              { borderColor: colors.border },
              settings.readingOrder === 'english-first' && { borderColor: colors.primary }
            ]}>
              {settings.readingOrder === 'english-first' && (
                <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <View style={styles.radioTextContainer}>
              <Text style={[styles.radioLabel, { color: colors.text }]}>English First</Text>
              <Text style={[styles.radioDescription, { color: colors.textSecondary }]}>
                English sentence, then Spanish translation
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.radioOption,
              { borderColor: colors.border },
              settings.readingOrder === 'spanish-first' && { borderColor: colors.primary }
            ]}
            onPress={() => saveSettings({ ...settings, readingOrder: 'spanish-first' })}
          >
            <View style={[
              styles.radioButton,
              { borderColor: colors.border },
              settings.readingOrder === 'spanish-first' && { borderColor: colors.primary }
            ]}>
              {settings.readingOrder === 'spanish-first' && (
                <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <View style={styles.radioTextContainer}>
              <Text style={[styles.radioLabel, { color: colors.text }]}>Spanish First</Text>
              <Text style={[styles.radioDescription, { color: colors.textSecondary }]}>
                Spanish sentence, then English translation
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.primary }]}
        onPress={onCloseSettings}
      >
        <Text style={[styles.closeButtonText, { color: colors.background }]}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  if (showSettings) {
    return renderSettings();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📖 Spanish Reader</Text>


        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Learn to read Spanish (based on "Old Man and the Sea" by Ernest Hemmingway)
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {currentSentenceIndex + 1} of {SENTENCES.length}
          </Text>
        </View>

        {SENTENCES.map((sentence, index) => renderSentence(sentence, index))}
      </ScrollView>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            { backgroundColor: colors.surface },
            currentSentenceIndex === 0 && styles.navButtonDisabled
          ]}
          onPress={goToPreviousSentence}
          disabled={currentSentenceIndex === 0}
        >
          <Text style={[
            styles.navButtonText,
            { color: currentSentenceIndex === 0 ? colors.textSecondary : colors.text }
          ]}>
            ← Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            { backgroundColor: colors.surface },
            currentSentenceIndex === SENTENCES.length - 1 && styles.navButtonDisabled
          ]}
          onPress={goToNextSentence}
          disabled={currentSentenceIndex === SENTENCES.length - 1}
        >
          <Text style={[
            styles.navButtonText,
            { color: currentSentenceIndex === SENTENCES.length - 1 ? colors.textSecondary : colors.text }
          ]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sentenceContainer: {
    marginBottom: 30,
  },
  englishText: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 16,
    textAlign: 'left',
  },
  spanishText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'left',
    flex: 1,
  },
  spanishContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    marginBottom: 20,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
  },
  closeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SpanishReaderSpark;
