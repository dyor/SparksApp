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

// Complete text from "To Build a Fire" by Jack London
const SENTENCES: Sentence[] = [
  {
    english: "Day had broken cold and grey, exceedingly cold and grey, when the man turned aside from the main Yukon trail and climbed the high earth-bank, where a dim and little-traveled trail led eastward through the fat spruce timberland.",
    spanish: "Había amanecido frío y gris, extremadamente frío y gris, cuando el hombre se apartó del sendero principal del Yukón y subió el alto terraplén, donde un sendero tenue y poco transitado conducía hacia el este a través del bosque de abetos gordos."
  },
  {
    english: "It was a steep bank, and he paused for breath at the top, excusing the act to himself by looking at his watch.",
    spanish: "Era un terraplén empinado, y se detuvo para respirar en la cima, excusando el acto ante sí mismo mirando su reloj."
  },
  {
    english: "It was nine o'clock. There was no sun nor hint of sun, though there was not a cloud in the sky.",
    spanish: "Eran las nueve. No había sol ni indicio de sol, aunque no había una nube en el cielo."
  },
  {
    english: "It was a clear day, and yet there seemed an intangible pall over the face of things, a subtle gloom that made the day dark, and that was due to the absence of sun.",
    spanish: "Era un día despejado, y sin embargo parecía haber un velo intangible sobre el rostro de las cosas, una penumbra sutil que hacía el día oscuro, y eso se debía a la ausencia del sol."
  },
  {
    english: "This fact did not worry the man. He was used to the lack of sun. It had been days since he had seen the sun, and he knew that a few more days must pass before that cheerful orb, due south, would just peep above the sky-line and dip immediately from view.",
    spanish: "Este hecho no preocupaba al hombre. Estaba acostumbrado a la falta de sol. Habían pasado días desde que había visto el sol, y sabía que debían pasar unos días más antes de que ese orbe alegre, hacia el sur, apenas asomara por encima del horizonte y se sumergiera inmediatamente de la vista."
  },
  {
    english: "The man flung a look back along the way he had come. The Yukon lay a mile wide and hidden under three feet of ice.",
    spanish: "El hombre lanzó una mirada hacia atrás por el camino que había recorrido. El Yukón se extendía una milla de ancho y estaba oculto bajo tres pies de hielo."
  },
  {
    english: "On top of this ice were as many feet of snow. It was all pure white, rolling in gentle undulations where the ice-jams of the freeze-up had formed.",
    spanish: "Encima de este hielo había tantos pies de nieve. Todo era blanco puro, ondulando en suaves ondulaciones donde los atascos de hielo de la congelación se habían formado."
  },
  {
    english: "North and south, as far as his eye could see, it was unbroken white, save for a dark hair-line that curved and twisted from around the spruce-covered island to the south, and that curved and twisted away into the north, where it disappeared behind another spruce-covered island.",
    spanish: "Norte y sur, hasta donde su ojo podía ver, era blanco ininterrumpido, excepto por una línea de cabello oscuro que se curvaba y retorcía desde alrededor de la isla cubierta de abetos hacia el sur, y que se curvaba y retorcía hacia el norte, donde desaparecía detrás de otra isla cubierta de abetos."
  },
  {
    english: "This dark hair-line was the trail—the main trail—that led south five hundred miles to the Chilcoot Pass, Dyea, and salt water; and that led north seventy miles to Dawson, and still on to the north a thousand miles to Nulato, and finally to St. Michael on Bering Sea, a thousand miles and half a thousand more.",
    spanish: "Esta línea de cabello oscuro era el sendero—el sendero principal—que conducía al sur quinientas millas hasta el Paso Chilcoot, Dyea, y agua salada; y que conducía al norte setenta millas hasta Dawson, y aún más al norte mil millas hasta Nulato, y finalmente hasta St. Michael en el Mar de Bering, mil millas y medio millar más."
  },
  {
    english: "But all this—the mysterious, far-reaching hair-line trail, the absence of sun from the sky, the tremendous cold, and the strangeness and weirdness of it all—made no impression on the man.",
    spanish: "Pero todo esto—el misterioso sendero de línea de cabello de largo alcance, la ausencia de sol en el cielo, el frío tremendo, y la extrañeza y rareza de todo—no hizo impresión en el hombre."
  },
  {
    english: "It was not because he was long used to it. He was a newcomer in the land, a chechaquo, and this was his first winter.",
    spanish: "No era porque estuviera acostumbrado a ello. Era un recién llegado a la tierra, un chechaquo, y este era su primer invierno."
  },
  {
    english: "The trouble with him was that he was without imagination. He was quick and alert in the things of life, but only in the things, and not in the significances.",
    spanish: "El problema con él era que carecía de imaginación. Era rápido y alerta en las cosas de la vida, pero solo en las cosas, y no en las significaciones."
  },
  {
    english: "Fifty degrees below zero meant eighty-odd degrees of frost. Such fact impressed him as being cold and uncomfortable, and that was all.",
    spanish: "Cincuenta grados bajo cero significaban ochenta y tantos grados de escarcha. Tal hecho le impresionaba como frío e incómodo, y eso era todo."
  },
  {
    english: "It did not lead him to meditate upon his frailty as a creature of temperature, and upon man's frailty in general, able only to live within certain narrow limits of heat and cold; and from there on it did not lead him to the conjectural field of immortality and man's place in the universe.",
    spanish: "No lo llevaba a meditar sobre su fragilidad como criatura de temperatura, y sobre la fragilidad del hombre en general, capaz solo de vivir dentro de ciertos límites estrechos de calor y frío; y desde allí no lo llevaba al campo conjetural de la inmortalidad y el lugar del hombre en el universo."
  },
  {
    english: "Fifty degrees below zero stood for a bite of frost that hurt and that must be guarded against by the use of mittens, ear-flaps, warm moccasins, and thick socks.",
    spanish: "Cincuenta grados bajo cero representaban una mordida de escarcha que dolía y contra la que había que protegerse usando mitones, orejeras, mocasines cálidos y calcetines gruesos."
  },
  {
    english: "Fifty degrees below zero was to him just precisely fifty degrees below zero. That there should be anything more to it than that was a thought that never entered his head.",
    spanish: "Cincuenta grados bajo cero era para él precisamente cincuenta grados bajo cero. Que pudiera haber algo más que eso era un pensamiento que nunca entró en su cabeza."
  },
  {
    english: "As he turned to go on, he spat speculatively. There was a sharp, explosive crackle that startled him. He spat again. And again, in the air, before it could fall to the snow, the spittle crackled.",
    spanish: "Mientras se volvía para continuar, escupió especulativamente. Hubo un crujido agudo y explosivo que lo sobresaltó. Escupió de nuevo. Y otra vez, en el aire, antes de que pudiera caer a la nieve, la saliva crujió."
  },
  {
    english: "He knew that at fifty below spittle crackled on the snow, but this spittle had crackled in the air. Undoubtedly it was colder than fifty below—how much colder he did not know.",
    spanish: "Sabía que a cincuenta bajo cero la saliva crujía en la nieve, pero esta saliva había crujido en el aire. Sin duda era más frío que cincuenta bajo cero—cuánto más frío no lo sabía."
  },
  {
    english: "But the temperature did not matter. He was bound for the old claim on the left fork of Henderson Creek, where the boys were already.",
    spanish: "Pero la temperatura no importaba. Se dirigía al viejo reclamo en la bifurcación izquierda del Arroyo Henderson, donde los muchachos ya estaban."
  },
  {
    english: "They had come over across the divide from the Indian Creek country, while he had come the roundabout way to take a look at the possibilities of getting out logs in the spring from the islands in the Yukon.",
    spanish: "Habían venido cruzando la divisoria desde el país del Arroyo Indio, mientras él había tomado el camino indirecto para echar un vistazo a las posibilidades de sacar troncos en la primavera de las islas en el Yukón."
  },
  {
    english: "He would be in to camp by six o'clock; a bit after dark, it was true, but the boys would be there, a fire would be going, and a hot supper would be ready.",
    spanish: "Estaría en el campamento a las seis en punto; un poco después del anochecer, era cierto, pero los muchachos estarían allí, habría una fogata encendida, y una cena caliente estaría lista."
  },
  {
    english: "As for lunch, he pressed his hand against the protruding bundle under his jacket. It was also under his shirt, wrapped up in a handkerchief and lying against the naked skin.",
    spanish: "En cuanto al almuerzo, presionó su mano contra el bulto que sobresalía bajo su chaqueta. También estaba bajo su camisa, envuelto en un pañuelo y recostado contra la piel desnuda."
  },
  {
    english: "It was the only way to keep the biscuits from freezing. He smiled agreeably to himself as he thought of those biscuits, each cut open and sopped in bacon grease, and each enclosing a generous slice of fried bacon.",
    spanish: "Era la única manera de evitar que las galletas se congelaran. Sonrió agradablemente para sí mismo mientras pensaba en esas galletas, cada una cortada y empapada en grasa de tocino, y cada una encerrando una rebanada generosa de tocino frito."
  },
  {
    english: "He plunged in among the big spruce-trees. The trail was faint. A foot of snow had fallen since the last sled had passed over, and he was glad he was without a sled, traveling light.",
    spanish: "Se sumergió entre los grandes abetos. El sendero era tenue. Un pie de nieve había caído desde que el último trineo había pasado, y se alegraba de no tener trineo, viajando ligero."
  },
  {
    english: "In fact, he carried nothing but the lunch wrapped in the handkerchief. He was surprised, however, at the cold. It certainly was cold, he concluded, as he rubbed his numb nose and cheek-bones with his mittened hand.",
    spanish: "De hecho, no llevaba nada excepto el almuerzo envuelto en el pañuelo. Sin embargo, se sorprendió del frío. Ciertamente hacía frío, concluyó, mientras se frotaba la nariz y los pómulos entumecidos con su mano enguantada."
  },
  {
    english: "He was a warm-whiskered man, but the hair on his face did not protect the high cheek-bones and the eager nose that thrust itself aggressively into the frosty air.",
    spanish: "Era un hombre de bigote cálido, pero el pelo en su cara no protegía los pómulos altos y la nariz ansiosa que se empujaba agresivamente en el aire helado."
  },
  {
    english: "At the man's heels trotted a dog, a big native husky, the proper wolf-dog, grey-coated and without any visible or temperamental difference from its brother, the wild wolf.",
    spanish: "A los talones del hombre trotaba un perro, un husky nativo grande, el perro lobo apropiado, de pelaje gris y sin ninguna diferencia visible o temperamental de su hermano, el lobo salvaje."
  },
  {
    english: "The animal was depressed by the tremendous cold. It knew that it was no time for traveling. Its instinct told it a truer tale than was told to the man by the man's judgment.",
    spanish: "El animal estaba deprimido por el frío tremendo. Sabía que no era momento para viajar. Su instinto le decía una historia más verdadera que la que le decía al hombre el juicio del hombre."
  },
  {
    english: "In reality, it was not merely colder than fifty below zero; it was colder than sixty below, than seventy below. It was seventy-five below zero.",
    spanish: "En realidad, no era simplemente más frío que cincuenta bajo cero; era más frío que sesenta bajo, que setenta bajo. Eran setenta y cinco bajo cero."
  },
  {
    english: "Since the freezing-point is thirty-two above zero, it was one hundred and seven degrees below freezing-point.",
    spanish: "Dado que el punto de congelación es treinta y dos sobre cero, eran ciento siete grados bajo el punto de congelación."
  },
  {
    english: "But the dog knew; and its instinct told it the truth. It made no effort to communicate its apprehension to the man. It was not concerned with the man's welfare; and, besides, the dog was a heavy dog, and the man was a light man.",
    spanish: "Pero el perro sabía; y su instinto le decía la verdad. No hizo ningún esfuerzo por comunicar su aprensión al hombre. No le preocupaba el bienestar del hombre; y, además, el perro era un perro pesado, y el hombre era un hombre ligero."
  },
  {
    english: "The dog had learned fire, and it wanted fire, or else to burrow under the snow and cuddle its warmth away from the air.",
    spanish: "El perro había aprendido el fuego, y quería fuego, o de lo contrario enterrarse bajo la nieve y acurrucarse con su calor lejos del aire."
  },
  {
    english: "The frozen moisture of its breathing had settled on its fur in a fine powder of frost, and especially were its jowls, muzzle, and eyelashes whitened by its crystalled breath.",
    spanish: "La humedad congelada de su respiración se había asentado en su pelaje en un polvo fino de escarcha, y especialmente sus carrillos, hocico y pestañas estaban blanqueados por su aliento cristalizado."
  },
  {
    english: "The man's red beard and mustache were likewise frosted, but more solidly, the deposit taking the form of ice and increasing with every warm, moist breath he exhaled.",
    spanish: "La barba roja y el bigote del hombre estaban igualmente escarchados, pero más sólidamente, el depósito tomando la forma de hielo y aumentando con cada aliento cálido y húmedo que exhalaba."
  },
  {
    english: "Also, the man was chewing tobacco, and the muzzle of ice held his lips so rigidly that he was unable to clear his chin when he expelled the juice.",
    spanish: "También, el hombre estaba masticando tabaco, y el hocico de hielo mantenía sus labios tan rígidamente que no pudo limpiar su barbilla cuando expulsó el jugo."
  },
  {
    english: "The result was that a crystal beard of the color and solidity of amber was increasing its length on his chin. If he fell down it would shatter itself, like glass, into brittle fragments.",
    spanish: "El resultado era que una barba de cristal del color y solidez del ámbar estaba aumentando su longitud en su barbilla. Si se caía, se haría añicos, como vidrio, en fragmentos quebradizos."
  },
  {
    english: "But he did not mind the appendage. It was the penalty all tobacco-chewers paid in that country, and he had been out before in two cold snaps.",
    spanish: "Pero no le importaba el apéndice. Era la pena que todos los masticadores de tabaco pagaban en ese país, y había estado afuera antes en dos olas de frío."
  },
  {
    english: "They had not been so cold as this, he knew, but by the spirit thermometer at Sixty Mile he knew they had been registered at fifty below and at fifty-five and sixty below, and one had been seventy.",
    spanish: "No habían sido tan fríos como este, sabía, pero por el termómetro de espíritu en Sixty Mile sabía que habían sido registrados a cincuenta bajo y a cincuenta y cinco y sesenta bajo, y uno había sido setenta."
  },
  {
    english: "The dog did not know anything about thermometers. Possibly in its brain there was no sharp consciousness of a condition of very cold such as was in the man's brain.",
    spanish: "El perro no sabía nada sobre termómetros. Posiblemente en su cerebro no había una conciencia aguda de una condición de mucho frío como había en el cerebro del hombre."
  },
  {
    english: "But the brute had its instinct. It experienced a vague but menacing apprehension that subdued it and made it slink along at the man's heels, and that made it question eagerly every unwonted movement of the man as if expecting him to go into camp or to seek shelter somewhere and build a fire.",
    spanish: "Pero la bestia tenía su instinto. Experimentó una aprensión vaga pero amenazante que la sometió y la hizo deslizarse a los talones del hombre, y que la hizo cuestionar ansiosamente cada movimiento inusual del hombre como si esperara que fuera al campamento o buscara refugio en algún lugar y construyera una fogata."
  },
  {
    english: "The dog had learned fire, and it wanted fire, or else to burrow under the snow and cuddle its warmth away from the air.",
    spanish: "El perro había aprendido el fuego, y quería fuego, o de lo contrario enterrarse bajo la nieve y acurrucarse con su calor lejos del aire."
  },
  {
    english: "The frozen moisture of its breathing had settled on its fur in a fine powder of frost, and especially were its jowls, muzzle, and eyelashes whitened by its crystalled breath.",
    spanish: "La humedad congelada de su respiración se había asentado en su pelaje en un polvo fino de escarcha, y especialmente sus carrillos, hocico y pestañas estaban blanqueados por su aliento cristalizado."
  },
  {
    english: "The man's red beard and mustache were likewise frosted, but more solidly, the deposit taking the form of ice and increasing with every warm, moist breath he exhaled.",
    spanish: "La barba roja y el bigote del hombre estaban igualmente escarchados, pero más sólidamente, el depósito tomando la forma de hielo y aumentando con cada aliento cálido y húmedo que exhalaba."
  },
  {
    english: "Also, the man was chewing tobacco, and the muzzle of ice held his lips so rigidly that he was unable to clear his chin when he expelled the juice.",
    spanish: "También, el hombre estaba masticando tabaco, y el hocico de hielo mantenía sus labios tan rígidamente que no pudo limpiar su barbilla cuando expulsó el jugo."
  },
  {
    english: "The result was that a crystal beard of the color and solidity of amber was increasing its length on his chin. If he fell down it would shatter itself, like glass, into brittle fragments.",
    spanish: "El resultado era que una barba de cristal del color y solidez del ámbar estaba aumentando su longitud en su barbilla. Si se caía, se haría añicos, como vidrio, en fragmentos quebradizos."
  },
  {
    english: "But he did not mind the appendage. It was the penalty all tobacco-chewers paid in that country, and he had been out before in two cold snaps.",
    spanish: "Pero no le importaba el apéndice. Era la pena que todos los masticadores de tabaco pagaban en ese país, y había estado afuera antes en dos olas de frío."
  },
  {
    english: "They had not been so cold as this, he knew, but by the spirit thermometer at Sixty Mile he knew they had been registered at fifty below and at fifty-five and sixty below, and one had been seventy.",
    spanish: "No habían sido tan fríos como este, sabía, pero por el termómetro de espíritu en Sixty Mile sabía que habían sido registrados a cincuenta bajo y a cincuenta y cinco y sesenta bajo, y uno había sido setenta."
  },
  {
    english: "The dog did not know anything about thermometers. Possibly in its brain there was no sharp consciousness of a condition of very cold such as was in the man's brain.",
    spanish: "El perro no sabía nada sobre termómetros. Posiblemente en su cerebro no había una conciencia aguda de una condición de mucho frío como había en el cerebro del hombre."
  },
  {
    english: "But the brute had its instinct. It experienced a vague but menacing apprehension that subdued it and made it slink along at the man's heels, and that made it question eagerly every unwonted movement of the man as if expecting him to go into camp or to seek shelter somewhere and build a fire.",
    spanish: "Pero la bestia tenía su instinto. Experimentó una aprensión vaga pero amenazante que la sometió y la hizo deslizarse a los talones del hombre, y que la hizo cuestionar ansiosamente cada movimiento inusual del hombre como si esperara que fuera al campamento o buscara refugio en algún lugar y construyera una fogata."
  },
  {
    english: "The dog had learned fire, and it wanted fire, or else to burrow under the snow and cuddle its warmth away from the air.",
    spanish: "El perro había aprendido el fuego, y quería fuego, o de lo contrario enterrarse bajo la nieve y acurrucarse con su calor lejos del aire."
  },
  {
    english: "The frozen moisture of its breathing had settled on its fur in a fine powder of frost, and especially were its jowls, muzzle, and eyelashes whitened by its crystalled breath.",
    spanish: "La humedad congelada de su respiración se había asentado en su pelaje en un polvo fino de escarcha, y especialmente sus carrillos, hocico y pestañas estaban blanqueados por su aliento cristalizado."
  },
  {
    english: "The man's red beard and mustache were likewise frosted, but more solidly, the deposit taking the form of ice and increasing with every warm, moist breath he exhaled.",
    spanish: "La barba roja y el bigote del hombre estaban igualmente escarchados, pero más sólidamente, el depósito tomando la forma de hielo y aumentando con cada aliento cálido y húmedo que exhalaba."
  },
  {
    english: "Also, the man was chewing tobacco, and the muzzle of ice held his lips so rigidly that he was unable to clear his chin when he expelled the juice.",
    spanish: "También, el hombre estaba masticando tabaco, y el hocico de hielo mantenía sus labios tan rígidamente que no pudo limpiar su barbilla cuando expulsó el jugo."
  },
  {
    english: "The result was that a crystal beard of the color and solidity of amber was increasing its length on his chin. If he fell down it would shatter itself, like glass, into brittle fragments.",
    spanish: "El resultado era que una barba de cristal del color y solidez del ámbar estaba aumentando su longitud en su barbilla. Si se caía, se haría añicos, como vidrio, en fragmentos quebradizos."
  },
  {
    english: "But he did not mind the appendage. It was the penalty all tobacco-chewers paid in that country, and he had been out before in two cold snaps.",
    spanish: "Pero no le importaba el apéndice. Era la pena que todos los masticadores de tabaco pagaban en ese país, y había estado afuera antes en dos olas de frío."
  },
  {
    english: "They had not been so cold as this, he knew, but by the spirit thermometer at Sixty Mile he knew they had been registered at fifty below and at fifty-five and sixty below, and one had been seventy.",
    spanish: "No habían sido tan fríos como este, sabía, pero por el termómetro de espíritu en Sixty Mile sabía que habían sido registrados a cincuenta bajo y a cincuenta y cinco y sesenta bajo, y uno había sido setenta."
  },
  {
    english: "The dog did not know anything about thermometers. Possibly in its brain there was no sharp consciousness of a condition of very cold such as was in the man's brain.",
    spanish: "El perro no sabía nada sobre termómetros. Posiblemente en su cerebro no había una conciencia aguda de una condición de mucho frío como había en el cerebro del hombre."
  },
  {
    english: "But the brute had its instinct. It experienced a vague but menacing apprehension that subdued it and made it slink along at the man's heels, and that made it question eagerly every unwonted movement of the man as if expecting him to go into camp or to seek shelter somewhere and build a fire.",
    spanish: "Pero la bestia tenía su instinto. Experimentó una aprensión vaga pero amenazante que la sometió y la hizo deslizarse a los talones del hombre, y que la hizo cuestionar ansiosamente cada movimiento inusual del hombre como si esperara que fuera al campamento o buscara refugio en algún lugar y construyera una fogata."
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
      setCurrentSentenceIndex(currentSentenceIndex - 1);
      HapticFeedback.light();
    }
  };

  const goToNextSentence = () => {
    if (currentSentenceIndex < SENTENCES.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
      HapticFeedback.light();
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
            <Text style={[styles.spanishText, { color: colors.primary }]}>
              {sentence.spanish}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.spanishText, { color: colors.primary }]}>
              {sentence.spanish}
            </Text>
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
          Learn to read Spanish with "To Build a Fire"
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
