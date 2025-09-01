import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpinnerSpark } from './src/sparks/SpinnerSpark';
import { FlashcardsSpark } from './src/sparks/FlashcardsSpark';
import { BusinessSpark } from './src/sparks/BusinessSpark';

function HomeScreen({ onNavigate }: { onNavigate: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✨ Sparks</Text>
      <Text style={styles.subtitle}>
        Discover interactive micro-experiences{'\n'}that spark joy and creativity
      </Text>
      <TouchableOpacity style={styles.button} onPress={onNavigate}>
        <Text style={styles.buttonText}>Explore Sparks</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}

function SparkSelectionScreen({ onBack, onSparkSelect }: { 
  onBack: () => void; 
  onSparkSelect: (sparkId: string) => void;
}) {
  const sparks = [
    { id: 'spinner', title: '🎡 Spinner', status: 'Available', available: true },
    { id: 'flashcards', title: '🃏 Flashcards', status: 'Available', available: true },
    { id: 'business', title: '💼 Business Sim', status: 'Available', available: true },
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Choose Your Spark</Text>
      <Text style={styles.subtitle}>Interactive experiences await</Text>
      
      <View style={styles.grid}>
        {sparks.map((spark, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.card, !spark.available && styles.cardDisabled]}
            onPress={() => spark.available && onSparkSelect(spark.id)}
            disabled={!spark.available}
          >
            <Text style={styles.cardTitle}>{spark.title}</Text>
            <Text style={[
              styles.cardStatus,
              spark.available && styles.cardStatusAvailable
            ]}>
              {spark.status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SparkScreen({ sparkId, onBack }: { sparkId: string; onBack: () => void }) {
  return (
    <View style={styles.sparkContainer}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      {sparkId === 'spinner' && <SpinnerSpark />}
      {sparkId === 'flashcards' && <FlashcardsSpark />}
      {sparkId === 'business' && <BusinessSpark />}
    </View>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = React.useState<'home' | 'selection' | 'spark'>('home');
  const [selectedSpark, setSelectedSpark] = React.useState<string>('');

  const navigateToSpark = (sparkId: string) => {
    setSelectedSpark(sparkId);
    setCurrentScreen('spark');
  };

  return (
    <>
      {currentScreen === 'home' && (
        <HomeScreen onNavigate={() => setCurrentScreen('selection')} />
      )}
      {currentScreen === 'selection' && (
        <SparkSelectionScreen 
          onBack={() => setCurrentScreen('home')} 
          onSparkSelect={navigateToSpark}
        />
      )}
      {currentScreen === 'spark' && (
        <SparkScreen 
          sparkId={selectedSpark}
          onBack={() => setCurrentScreen('selection')} 
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 10,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  card: {
    backgroundColor: 'white',
    width: '40%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 20,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardStatus: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardStatusAvailable: {
    color: '#28A745',
    backgroundColor: '#D4EDDA',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  sparkContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});