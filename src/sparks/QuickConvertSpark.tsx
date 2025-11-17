import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { ExchangeRateService } from '../utils/exchangeRate';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsText,
  SettingsButton,
  SettingsInput,
  SaveCancelButtons
} from '../components/SettingsComponents';

interface QuickConvertData {
  exchangeRate: number;
  selectedCountry: string;
  usdDenominations: number[];
  lastUpdated: string;
}

interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  symbol: string;
}

interface QuickConvertSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

// Country/Currency mapping
const COUNTRIES: CountryInfo[] = [
  { code: 'MXN', name: 'Mexico', flag: '🇲🇽', symbol: '$' },
  { code: 'EUR', name: 'Europe', flag: '🇪🇺', symbol: '€' },
  { code: 'GBP', name: 'United Kingdom', flag: '🇬🇧', symbol: '£' },
  { code: 'JPY', name: 'Japan', flag: '🇯🇵', symbol: '¥' },
  { code: 'CAD', name: 'Canada', flag: '🇨🇦', symbol: 'C$' },
  { code: 'AUD', name: 'Australia', flag: '🇦🇺', symbol: 'A$' },
  { code: 'CHF', name: 'Switzerland', flag: '🇨🇭', symbol: 'Fr' },
  { code: 'CNY', name: 'China', flag: '🇨🇳', symbol: '¥' },
  { code: 'INR', name: 'India', flag: '🇮🇳', symbol: '₹' },
  { code: 'BRL', name: 'Brazil', flag: '🇧🇷', symbol: 'R$' },
];

const DEFAULT_USD_DENOMINATIONS = [1, 5, 10, 15, 20, 30, 40, 50, 60, 75, 100];

// Settings Component
const QuickConvertSettings: React.FC<{
  onClose: () => void;
  data: QuickConvertData;
  onSave: (newData: QuickConvertData) => void;
}> = ({ onClose, data, onSave }) => {
  const { colors } = useTheme();
  const [exchangeRate, setExchangeRate] = useState((data.exchangeRate || 0).toString());
  const [selectedCountry, setSelectedCountry] = useState(data.selectedCountry || 'MXN');
  const [usdDenominations, setUsdDenominations] = useState([...(data.usdDenominations || DEFAULT_USD_DENOMINATIONS)]);
  const [newDenomination, setNewDenomination] = useState('');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [cachedRates, setCachedRates] = useState<Record<string, number>>({});
  const [initialCountry] = useState(data.selectedCountry || 'MXN'); // Track initial country to avoid overwriting on mount

  // Load cached rates on mount
  useEffect(() => {
    const loadCachedRates = async () => {
      try {
        const result = await ExchangeRateService.fetchAllRates();
        if (result.success && result.rates) {
          setCachedRates(result.rates);
        }
      } catch (error) {
        console.error('Error loading cached rates:', error);
      }
    };
    loadCachedRates();
  }, []);

  // Update exchange rate input when country is selected (but not on initial mount)
  useEffect(() => {
    // Only update if country changed from initial value and cached rate is available
    if (selectedCountry !== initialCountry && cachedRates[selectedCountry]) {
      setExchangeRate(cachedRates[selectedCountry].toFixed(4));
    }
  }, [selectedCountry, cachedRates, initialCountry]);

  const handleSave = () => {
    const rate = parseFloat(exchangeRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Invalid Exchange Rate', 'Please enter a valid positive number.');
      return;
    }

    if (usdDenominations.length === 0) {
      Alert.alert('No Denominations', 'Please add at least one USD denomination.');
      return;
    }

    const newData: QuickConvertData = {
      exchangeRate: rate,
      selectedCountry,
      usdDenominations: [...usdDenominations].sort((a, b) => a - b),
      lastUpdated: new Date().toISOString(),
    };

    onSave(newData);
    onClose();
  };

  const addDenomination = () => {
    const value = parseFloat(newDenomination);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }

    if (usdDenominations.includes(value)) {
      Alert.alert('Duplicate Amount', 'This denomination already exists.');
      return;
    }

    setUsdDenominations([...usdDenominations, value].sort((a, b) => a - b));
    setNewDenomination('');
  };

  const removeDenomination = (value: number) => {
    if (usdDenominations.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one denomination is required.');
      return;
    }

    setUsdDenominations(usdDenominations.filter(d => d !== value));
  };

  const handleFetchExchangeRate = async () => {
    setIsFetchingRate(true);
    const result = await ExchangeRateService.fetchAllRates();
    setIsFetchingRate(false);

    if (result.success && result.rates) {
      setCachedRates(result.rates);
      const rate = result.rates[selectedCountry];
      if (rate) {
        setExchangeRate(rate.toFixed(4));
        HapticFeedback.success();
        Alert.alert(
          'Exchange Rate Updated',
          `Current rate for ${selectedCountry}: ${rate.toFixed(4)}`,
          [{ text: 'OK' }]
        );
      }
    } else {
      HapticFeedback.error();
      Alert.alert(
        'Failed to Fetch Rate',
        result.error || 'Could not fetch exchange rate. Please enter manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const selectedCountryInfo = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="Quick Convert Settings"
          subtitle="Configure exchange rate and currency options"
          icon="💱"
          sparkId="quick-convert"
        />

        <SettingsSection title="Currency">
          <View style={styles.countrySelector}>
            <Text style={[styles.countryLabel, { color: colors.text }]}>Country/Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryScroll}>
              {COUNTRIES.map((country) => {
                const cachedRate = cachedRates[country.code];
                return (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryOption,
                      { borderColor: colors.border },
                      selectedCountry === country.code && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => {
                      setSelectedCountry(country.code);
                      // Update exchange rate immediately when country is selected
                      if (cachedRates[country.code]) {
                        setExchangeRate(cachedRates[country.code].toFixed(4));
                      }
                    }}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={[styles.countryCode, { color: colors.text }]}>{country.code}</Text>
                    {cachedRate && (
                      <Text style={[styles.countryRate, { color: colors.textSecondary }]}>
                        {cachedRate.toFixed(2)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={[styles.selectedCurrency, { color: colors.textSecondary }]}>
              Selected: {selectedCountryInfo.flag} {selectedCountryInfo.name} ({selectedCountryInfo.symbol})
            </Text>
          </View>
        </SettingsSection>

        <SettingsSection title="Exchange Rate">
          <View style={styles.exchangeRateContainer}>
            <SettingsInput
              label="Exchange Rate"
              value={exchangeRate}
              onChangeText={setExchangeRate}
              placeholder="18.40"
              keyboardType="numeric"
              description="Enter the exchange rate (e.g., 18.40 means 1 USD = 18.40 foreign currency)"
            />
            <TouchableOpacity
              style={[styles.fetchRateButton, { backgroundColor: colors.primary }]}
              onPress={handleFetchExchangeRate}
              disabled={isFetchingRate}
            >
              {isFetchingRate ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.fetchRateButtonText}>🔄 Fetch Current Rate</Text>
              )}
            </TouchableOpacity>
          </View>
        </SettingsSection>

        <SettingsSection title="USD Denominations">
          <View style={styles.denominationsContainer}>
            <Text style={[styles.denominationsLabel, { color: colors.text }]}>
              Current Denominations ({usdDenominations.length})
            </Text>
            <View style={styles.denominationsList}>
              {usdDenominations.map((denom, index) => (
                <View key={denom} style={[styles.denominationItem, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.denominationText, { color: colors.text }]}>${denom}</Text>
                  <TouchableOpacity
                    style={[styles.removeButton, { backgroundColor: colors.error }]}
                    onPress={() => removeDenomination(denom)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
            <View style={styles.addDenominationContainer}>
              <TextInput
                style={[styles.addDenominationInput, { borderColor: colors.border, color: colors.text }]}
                value={newDenomination}
                onChangeText={setNewDenomination}
                placeholder="Add amount (e.g., 25)"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={addDenomination}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SettingsSection>

        <SettingsFeedbackSection sparkName="Quick Convert" sparkId="quick-convert" />

        <SaveCancelButtons onSave={handleSave} onCancel={onClose} />
      </SettingsScrollView>
    </SettingsContainer>
  );
};

// Exchange Rate Setup Modal
const ExchangeRateModal: React.FC<{
  visible: boolean;
  onComplete: (exchangeRate: number, selectedCountry: string) => void;
}> = ({ visible, onComplete }) => {
  const { colors } = useTheme();
  const [exchangeRate, setExchangeRate] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('MXN');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  const [cachedRates, setCachedRates] = useState<Record<string, number>>({});

  // Load cached rates on mount
  useEffect(() => {
    const loadCachedRates = async () => {
      try {
        const result = await ExchangeRateService.fetchAllRates();
        if (result.success && result.rates) {
          setCachedRates(result.rates);
        }
      } catch (error) {
        console.error('Error loading cached rates:', error);
      }
    };
    if (visible) {
      loadCachedRates();
    }
  }, [visible]);

  // Update exchange rate input when country is selected and cached rate is available
  useEffect(() => {
    if (visible && cachedRates[selectedCountry] && !hasAutoFetched) {
      setExchangeRate(cachedRates[selectedCountry].toFixed(4));
    }
  }, [selectedCountry, cachedRates, visible, hasAutoFetched]);

  const handleAutoFetch = async () => {
    setIsFetchingRate(true);
    const result = await ExchangeRateService.fetchAllRates();
    setIsFetchingRate(false);
    setHasAutoFetched(true);

    if (result.success && result.rates) {
      setCachedRates(result.rates);
      const rate = result.rates[selectedCountry];
      if (rate) {
        setExchangeRate(rate.toFixed(4));
        HapticFeedback.light();
      }
    } else {
      // Silently fail - user can enter manually
      console.log('Auto-fetch failed:', result.error);
    }
  };

  // Auto-fetch exchange rate when currency changes
  useEffect(() => {
    if (visible && selectedCountry && !hasAutoFetched) {
      handleAutoFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, selectedCountry]);

  // Reset auto-fetch flag when modal closes
  useEffect(() => {
    if (!visible) {
      setHasAutoFetched(false);
      setExchangeRate('');
    }
  }, [visible]);

  const handleManualFetch = async () => {
    setIsFetchingRate(true);
    const result = await ExchangeRateService.fetchAllRates();
    setIsFetchingRate(false);

    if (result.success && result.rates) {
      setCachedRates(result.rates);
      const rate = result.rates[selectedCountry];
      if (rate) {
        setExchangeRate(rate.toFixed(4));
        HapticFeedback.success();
      }
    } else {
      HapticFeedback.error();
      Alert.alert(
        'Failed to Fetch Rate',
        result.error || 'Could not fetch exchange rate. Please enter manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSubmit = () => {
    const rate = parseFloat(exchangeRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Invalid Exchange Rate', 'Please enter a valid positive number.');
      return;
    }

    onComplete(rate, selectedCountry);
    setExchangeRate('');
  };

  const selectedCountryInfo = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Setup Exchange Rate</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Enter the exchange rate for {selectedCountryInfo.flag} {selectedCountryInfo.name}
          </Text>
          
          <View style={styles.modalExchangeRateContainer}>
            <TextInput
              style={[styles.exchangeRateInput, { borderColor: colors.border, color: colors.text }]}
              value={exchangeRate}
              onChangeText={setExchangeRate}
              placeholder="18.40"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
              autoFocus={!isFetchingRate}
              editable={!isFetchingRate}
            />
            {isFetchingRate && (
              <View style={styles.fetchingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.fetchingText, { color: colors.textSecondary }]}>Fetching...</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.rateDescription, { color: colors.textSecondary }]}>
            This means 1 USD = {exchangeRate || 'X'} {selectedCountryInfo.code}
          </Text>

          <View style={styles.countrySelector}>
            <Text style={[styles.countryLabel, { color: colors.text }]}>Select Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryScroll}>
              {COUNTRIES.map((country) => {
                const cachedRate = cachedRates[country.code];
                return (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryOption,
                      { borderColor: colors.border },
                      selectedCountry === country.code && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => {
                      setSelectedCountry(country.code);
                      setHasAutoFetched(false); // Reset to auto-fetch for new currency
                      // Update exchange rate immediately when country is selected
                      if (cachedRates[country.code]) {
                        setExchangeRate(cachedRates[country.code].toFixed(4));
                      }
                    }}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={[styles.countryCode, { color: colors.text }]}>{country.code}</Text>
                    {cachedRate && (
                      <Text style={[styles.countryRate, { color: colors.textSecondary }]}>
                        {cachedRate.toFixed(2)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[styles.fetchRateButtonModal, { backgroundColor: colors.primary }]}
            onPress={handleManualFetch}
            disabled={isFetchingRate}
          >
            {isFetchingRate ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.fetchRateButtonText}>🔄 Fetch Current Rate</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
          >
            <Text style={styles.setupButtonText}>Start Converting</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Main Component
const QuickConvertSpark: React.FC<QuickConvertSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();
  
  const [data, setData] = useState<QuickConvertData>(() => {
    const savedData = getSparkData('quick-convert');
    return savedData || {
      exchangeRate: 0,
      selectedCountry: 'MXN',
      usdDenominations: [...DEFAULT_USD_DENOMINATIONS],
      lastUpdated: new Date().toISOString(),
    };
  });

  // Ensure usdDenominations is always an array
  const safeUsdDenominations = data.usdDenominations || [...DEFAULT_USD_DENOMINATIONS];

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    if (!data.exchangeRate || data.exchangeRate === 0) {
      setShowSetupModal(true);
    }
  }, [data.exchangeRate]);

  const handleSetupComplete = (exchangeRate: number, selectedCountry: string) => {
    const newData: QuickConvertData = {
      exchangeRate,
      selectedCountry,
      usdDenominations: [...DEFAULT_USD_DENOMINATIONS],
      lastUpdated: new Date().toISOString(),
    };
    
    setData(newData);
    setSparkData('quick-convert', newData);
    setShowSetupModal(false);
    HapticFeedback.light();
  };

  const handleSaveSettings = (newData: QuickConvertData) => {
    setData(newData);
    setSparkData('quick-convert', newData);
    HapticFeedback.light();
  };

  const selectedCountryInfo = COUNTRIES.find(c => c.code === (data.selectedCountry || 'MXN')) || COUNTRIES[0];

  const formatCurrency = (amount: number): string => {
    return amount.toFixed(2);
  };

  const calculateCustomConversion = (): string => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0 || !data.exchangeRate) {
      return '';
    }
    const usdAmount = amount / data.exchangeRate;
    return usdAmount.toFixed(2);
  };

  if (showSettings) {
    return (
      <QuickConvertSettings
        onClose={onCloseSettings || (() => {})}
        data={data}
        onSave={handleSaveSettings}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ExchangeRateModal
        visible={showSetupModal}
        onComplete={handleSetupComplete}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Large Flag Display */}
        <View style={styles.flagContainer}>
          <Text style={styles.flagEmoji}>{selectedCountryInfo.flag}</Text>
          <Text style={[styles.flagText, { color: colors.text }]}>
            {selectedCountryInfo.name} ({selectedCountryInfo.code})
          </Text>
          <Text style={[styles.exchangeRateText, { color: colors.textSecondary }]}>
            1 USD = {data.exchangeRate || 0} {selectedCountryInfo.code}
          </Text>
        </View>

        {/* Custom Conversion Input */}
        <View style={[styles.customConversionContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.customConversionLabel, { color: colors.text }]}>
            Quick Convert
          </Text>
          <View style={styles.customConversionRow}>
            <TextInput
              style={[styles.customAmountInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
              editable={true}
              selectTextOnFocus={true}
            />
            <Text style={[styles.customCurrencyText, { color: colors.text }]}>
              {selectedCountryInfo.code}
            </Text>
            <Text style={[styles.customEqualsText, { color: colors.textSecondary }]}>
              =
            </Text>
            <Text style={[styles.customUsdText, { color: colors.text }]}>
              ${calculateCustomConversion() || '0.00'} USD
            </Text>
          </View>
        </View>

        {/* Conversion Table */}
        <View style={[styles.tableContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tableTitle, { color: colors.text }]}>Conversion Table</Text>
          
          {safeUsdDenominations.map((usdAmount, index) => {
            const foreignAmount = usdAmount * (data.exchangeRate || 0);
            const isEvenRow = index % 2 === 0;
            
            return (
              <View
                key={usdAmount}
                style={[
                  styles.tableRow,
                  { backgroundColor: isEvenRow ? colors.background : colors.surface }
                ]}
              >
                <Text style={[styles.foreignAmount, { color: colors.text }]}>
                  {selectedCountryInfo.symbol}{formatCurrency(foreignAmount)} {selectedCountryInfo.code}
                </Text>
                <Text style={[styles.usdAmount, { color: colors.textSecondary }]}>
                  = ${usdAmount} USD
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  flagContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  flagEmoji: {
    fontSize: 48,
    marginBottom: 6,
  },
  flagText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 3,
  },
  exchangeRateText: {
    fontSize: 14,
  },
  customConversionContainer: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customConversionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  customConversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAmountInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minWidth: 100,
    textAlign: 'center',
    marginRight: 8,
  },
  customCurrencyText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  customEqualsText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  customUsdText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  tableContainer: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  foreignAmount: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  usdAmount: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'right',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  exchangeRateInput: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  rateDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  setupButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Settings styles
  countrySelector: {
    marginBottom: 20,
  },
  countryLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  countryScroll: {
    marginBottom: 12,
  },
  countryOption: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 60,
  },
  countryFlag: {
    fontSize: 24,
    marginBottom: 4,
  },
  countryCode: {
    fontSize: 12,
    fontWeight: '500',
  },
  countryRate: {
    fontSize: 10,
    marginTop: 2,
  },
  selectedCurrency: {
    fontSize: 14,
    textAlign: 'center',
  },
  denominationsContainer: {
    marginBottom: 20,
  },
  denominationsLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  denominationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  denominationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    margin: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  denominationText: {
    fontSize: 14,
    marginRight: 8,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addDenominationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addDenominationInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginRight: 12,
    fontSize: 16,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  exchangeRateContainer: {
    marginBottom: 10,
  },
  fetchRateButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 44,
  },
  fetchRateButtonModal: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
  },
  fetchRateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalExchangeRateContainer: {
    position: 'relative',
  },
  fetchingIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fetchingText: {
    fontSize: 12,
  },
});

export default QuickConvertSpark;
