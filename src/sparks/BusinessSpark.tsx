import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsFeedbackSection,
  SettingsSection,
  SettingsText,
  SaveCancelButtons
} from '../components/SettingsComponents';

interface Printer {
  id: string;
  purchaseDay: number;
  daysUsed: number;
  status: 'working' | 'needs_repair' | 'under_repair';
  repairDay?: number;
}

interface FinancialSnapshot {
  cash: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  totalAssets: number;
  totalEquity: number;
  materialsInventory: number;
  employees: number;
  workingPrinters: number;
}

interface GameState {
  day: number;
  cash: number;
  employees: number;
  printers: Printer[];
  materialsInventory: number;
  cumulativeRevenue: number;
  cumulativeExpenses: number;
  previousFinancials: FinancialSnapshot;
  gameStarted: boolean;
  gameEnded: boolean;
  dailyLog: string[];
}

interface Decision {
  id: string;
  type: 'investment' | 'operations';
  title: string;
  description: string;
  cost?: number;
  potentialRevenue?: number;
  action: (state: GameState) => { newState: GameState; log: string[] };
}

const initialState: GameState = {
  day: 1,
  cash: 1000,
  employees: 0,
  printers: [],
  materialsInventory: 0,
  cumulativeRevenue: 0,
  cumulativeExpenses: 0,
  previousFinancials: {
    cash: 1000,
    revenue: 0,
    expenses: 0,
    netIncome: 0,
    totalAssets: 1000,
    totalEquity: 1000,
    materialsInventory: 0,
    employees: 0,
    workingPrinters: 0,
  },
  gameStarted: false,
  gameEnded: false,
  dailyLog: [],
};

interface BusinessSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

const BusinessSimulatorSettings: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="Business Simulator Settings"
          subtitle="Manage your business simulation experience"
          icon="💼"
        />

        <SettingsFeedbackSection sparkName="Business Simulator" />

        <SettingsSection title="About">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body">
              Simulate running a 3D printing business over 30 days. Make strategic decisions about investments, operations, and growth to maximize your success.
            </SettingsText>
          </View>
        </SettingsSection>

        <SaveCancelButtons onSave={onClose} onCancel={onClose} saveText="Done" cancelText="Close" />
      </SettingsScrollView>
    </SettingsContainer>
  );
};

export const BusinessSpark: React.FC<BusinessSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete,
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();

  const [gameState, setGameState] = useState<GameState>(initialState);
  const [showFinancials, setShowFinancials] = useState(false);
  const [currentDecisions, setCurrentDecisions] = useState<Decision[]>([]);

  // Load saved data
  useEffect(() => {
    const savedData = getSparkData('business-sim') as { gameState?: GameState };
    if (savedData?.gameState) {
      setGameState(savedData.gameState);
    }
  }, [getSparkData]);

  // Save data whenever game state changes
  useEffect(() => {
    setSparkData('business-sim', { gameState });
    onStateChange?.({
      day: gameState.day,
      cash: gameState.cash,
      netWorth: calculateNetWorth(gameState)
    });
  }, [gameState]); // Removed setSparkData and onStateChange from dependencies

  const calculateNetWorth = (state: GameState): number => {
    const printerValue = state.printers.length * 150; // Depreciated value
    const materialsValue = state.materialsInventory * 15;
    return state.cash + printerValue + materialsValue;
  };

  const getWorkingPrinters = (printers: Printer[]): Printer[] => {
    return printers.filter(p => p.status === 'working');
  };

  const getPrintersNeedingRepair = (printers: Printer[]): Printer[] => {
    return printers.filter(p => p.status === 'needs_repair');
  };

  const generateDecisions = (state: GameState): Decision[] => {
    const decisions: Decision[] = [];

    // Investment Decisions
    if (state.cash >= 200) {
      decisions.push({
        id: 'buy_printer',
        type: 'investment',
        title: 'Buy 3D Printer',
        description: 'Purchase a new 3D printer to increase production capacity',
        cost: 200,
        action: (state) => {
          const newPrinter: Printer = {
            id: `printer_${Date.now()}`,
            purchaseDay: state.day,
            daysUsed: 0,
            status: 'working',
          };
          return {
            newState: {
              ...state,
              cash: state.cash - 200,
              printers: [...state.printers, newPrinter],
            },
            log: ['Purchased new 3D printer for $200']
          };
        }
      });
    }

    if (state.cash >= 100) {
      decisions.push({
        id: 'hire_employee',
        type: 'investment',
        title: 'Hire Employee',
        description: 'Hire an operator to run 3D printers ($25/day salary)',
        cost: 100,
        action: (state) => {
          return {
            newState: {
              ...state,
              cash: state.cash - 100,
              employees: state.employees + 1,
            },
            log: ['Hired new employee for $100 upfront']
          };
        }
      });
    }

    const printersNeedingRepair = getPrintersNeedingRepair(state.printers);
    if (printersNeedingRepair.length > 0 && state.cash >= 50) {
      decisions.push({
        id: 'repair_printers',
        type: 'investment',
        title: 'Repair Equipment',
        description: `Repair ${printersNeedingRepair.length} printer(s) needing maintenance`,
        cost: printersNeedingRepair.length * 50,
        action: (state) => {
          const repairedPrinters = state.printers.map(printer => {
            if (printer.status === 'needs_repair') {
              return {
                ...printer,
                status: 'under_repair' as const,
                repairDay: state.day,
                daysUsed: 0,
              };
            }
            return printer;
          });

          return {
            newState: {
              ...state,
              cash: state.cash - (printersNeedingRepair.length * 50),
              printers: repairedPrinters,
            },
            log: [`Repaired ${printersNeedingRepair.length} printer(s) for $${printersNeedingRepair.length * 50}`]
          };
        }
      });
    }

    if (state.cash >= 150) {
      decisions.push({
        id: 'buy_materials',
        type: 'investment',
        title: 'Buy Materials in Bulk',
        description: 'Purchase materials for 10 items at discounted rate ($15/item)',
        cost: 150,
        action: (state) => {
          return {
            newState: {
              ...state,
              cash: state.cash - 150,
              materialsInventory: state.materialsInventory + 10,
            },
            log: ['Purchased bulk materials for $150 (10 units)']
          };
        }
      });
    }

    // Operations Decisions
    const workingPrinters = getWorkingPrinters(state.printers);
    const operablePrinters = Math.min(workingPrinters.length, state.employees);
    const potentialProduction = operablePrinters * 5;
    const productionCost = potentialProduction * 20;
    const salaryCost = state.employees * 25;

    if (operablePrinters > 0 && state.materialsInventory >= potentialProduction) {
      decisions.push({
        id: 'full_production',
        type: 'operations',
        title: 'Full Production',
        description: `Produce ${potentialProduction} items with ${operablePrinters} printer(s)`,
        potentialRevenue: potentialProduction * 100 - salaryCost,
        action: (state) => processProduction(state, potentialProduction, false)
      });
    }

    if (operablePrinters > 0 && state.materialsInventory >= potentialProduction) {
      decisions.push({
        id: 'marketing_boost',
        type: 'operations',
        title: 'Production + Marketing',
        description: `Produce ${potentialProduction} items with 20% price boost ($120/item)`,
        potentialRevenue: potentialProduction * 120 - salaryCost,
        action: (state) => processProduction(state, potentialProduction, true)
      });
    }

    // Fallback option if no materials
    if (state.materialsInventory < potentialProduction && operablePrinters > 0) {
      const affordableProduction = Math.min(potentialProduction, state.materialsInventory);
      if (affordableProduction > 0) {
        decisions.push({
          id: 'limited_production',
          type: 'operations',
          title: 'Limited Production',
          description: `Produce ${affordableProduction} items (limited by materials)`,
          potentialRevenue: affordableProduction * 100 - salaryCost,
          action: (state) => processProduction(state, affordableProduction, false)
        });
      }
    }

    return decisions;
  };

  const processProduction = (state: GameState, itemsProduced: number, marketingBoost: boolean) => {
    const salaryCost = state.employees * 25;
    const materialsCost = itemsProduced * 20;
    const pricePerItem = marketingBoost ? 120 : 100;
    const revenue = itemsProduced * pricePerItem;
    const totalExpenses = salaryCost + materialsCost;

    const log = [
      `Produced ${itemsProduced} items`,
      `Revenue: $${revenue} (${itemsProduced} × $${pricePerItem})`,
      `Materials cost: $${materialsCost}`,
      `Employee salaries: $${salaryCost}`,
      `Net profit: $${revenue - totalExpenses}`
    ];

    if (marketingBoost) {
      log.push('Applied marketing boost (+$20/item)');
    }

    return {
      newState: {
        ...state,
        cash: state.cash + revenue - totalExpenses,
        materialsInventory: state.materialsInventory - itemsProduced,
        cumulativeRevenue: state.cumulativeRevenue + revenue,
        cumulativeExpenses: state.cumulativeExpenses + totalExpenses,
      },
      log
    };
  };

  const advanceDay = (state: GameState) => {
    // Age printers and handle repairs
    const updatedPrinters = state.printers.map(printer => {
      if (printer.status === 'under_repair' && printer.repairDay === state.day - 1) {
        return { ...printer, status: 'working' as const, repairDay: undefined };
      }
      if (printer.status === 'working') {
        const newDaysUsed = printer.daysUsed + 1;
        if (newDaysUsed >= 5) {
          return { ...printer, status: 'needs_repair' as const, daysUsed: newDaysUsed };
        }
        return { ...printer, daysUsed: newDaysUsed };
      }
      return printer;
    });

    return {
      ...state,
      day: state.day + 1,
      printers: updatedPrinters,
    };
  };

  const makeDecision = (decision: Decision) => {
    HapticFeedback.light();

    const result = decision.action(gameState);
    const newStateAfterDecision = result.newState;

    // Advance to next day
    const finalState = advanceDay({
      ...newStateAfterDecision,
      dailyLog: result.log,
      previousFinancials: generateFinancialSnapshot(gameState),
    });

    // Check win/lose conditions
    if (finalState.day > 30) {
      finalState.gameEnded = true;
      const netWorth = calculateNetWorth(finalState);
      onComplete?.({
        days: 30,
        finalCash: finalState.cash,
        netWorth,
        totalRevenue: finalState.cumulativeRevenue,
        success: netWorth > 1500
      });
    } else if (finalState.cash < 0) {
      finalState.gameEnded = true;
      Alert.alert('Bankruptcy!', 'Your business has run out of cash. Game over!');
    }

    setGameState(finalState);
    setCurrentDecisions(generateDecisions(finalState));
  };

  const generateFinancialSnapshot = (state: GameState): FinancialSnapshot => {
    const workingPrinters = getWorkingPrinters(state.printers).length;
    const printerValue = state.printers.length * 150;
    const materialsValue = state.materialsInventory * 15;
    const totalAssets = state.cash + printerValue + materialsValue;

    return {
      cash: state.cash,
      revenue: state.cumulativeRevenue,
      expenses: state.cumulativeExpenses,
      netIncome: state.cumulativeRevenue - state.cumulativeExpenses,
      totalAssets,
      totalEquity: totalAssets,
      materialsInventory: state.materialsInventory,
      employees: state.employees,
      workingPrinters,
    };
  };

  const startGame = () => {
    HapticFeedback.success();
    const newState = { ...initialState, gameStarted: true };
    setGameState(newState);
    setCurrentDecisions(generateDecisions(newState));
  };

  const resetGame = () => {
    HapticFeedback.medium();
    setGameState(initialState);
    setCurrentDecisions([]);
    setShowFinancials(false);
  };

  // Generate decisions when game starts
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameEnded && currentDecisions.length === 0) {
      setCurrentDecisions(generateDecisions(gameState));
    }
  }, [gameState, currentDecisions.length]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    statusLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    statusValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
      marginTop: 10,
    },
    decisionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
    },
    investmentCard: {
      borderLeftColor: '#e74c3c',
    },
    operationsCard: {
      borderLeftColor: '#27ae60',
    },
    decisionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    decisionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    decisionMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 10,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    logCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    logText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
    },
    startContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      paddingTop: 100,
    },
    startButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 25,
      marginBottom: 20,
    },
    startButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
  });

  if (showSettings) {
    return <BusinessSimulatorSettings onClose={onCloseSettings} />;
  }

  if (!gameState.gameStarted) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>💼 Business Simulator</Text>
          <Text style={styles.subtitle}>
            Build and manage your 3D printing business over 30 days
          </Text>
        </View>

        <View style={styles.startContainer}>
          <View style={styles.statusCard}>
            <Text style={styles.sectionTitle}>Game Overview</Text>
            <Text style={styles.logText}>• Start with $1,000 capital</Text>
            <Text style={styles.logText}>• Buy 3D printers and hire employees</Text>
            <Text style={styles.logText}>• Make strategic decisions each day</Text>
            <Text style={styles.logText}>• Track your progress with financial statements</Text>
            <Text style={styles.logText}>• Goal: Maximize your business value in 30 days</Text>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Business</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>💼 Business Simulator</Text>
        <Text style={styles.subtitle}>Day {gameState.day} of 30</Text>
      </View>

      {/* Current Status */}
      <View style={styles.statusCard}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>💰 Cash</Text>
          <Text style={styles.statusValue}>${gameState.cash}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>🏭 Working Printers</Text>
          <Text style={styles.statusValue}>{getWorkingPrinters(gameState.printers).length}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>🔧 Need Repair</Text>
          <Text style={styles.statusValue}>{getPrintersNeedingRepair(gameState.printers).length}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>👥 Employees</Text>
          <Text style={styles.statusValue}>{gameState.employees}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>📦 Materials</Text>
          <Text style={styles.statusValue}>{gameState.materialsInventory} units</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>📊 Net Worth</Text>
          <Text style={styles.statusValue}>${calculateNetWorth(gameState)}</Text>
        </View>
      </View>

      {/* Daily Log */}
      {gameState.dailyLog.length > 0 && (
        <View style={styles.logCard}>
          <Text style={styles.sectionTitle}>Yesterday's Results</Text>
          {gameState.dailyLog.map((log, index) => (
            <Text key={index} style={styles.logText}>• {log}</Text>
          ))}
        </View>
      )}

      {/* Decisions */}
      {!gameState.gameEnded && (
        <>
          <Text style={styles.sectionTitle}>Today's Decision</Text>
          {currentDecisions.map((decision) => (
            <TouchableOpacity
              key={decision.id}
              style={[
                styles.decisionCard,
                decision.type === 'investment' ? styles.investmentCard : styles.operationsCard
              ]}
              onPress={() => makeDecision(decision)}
            >
              <Text style={styles.decisionTitle}>{decision.title}</Text>
              <Text style={styles.decisionDescription}>{decision.description}</Text>
              <Text style={styles.decisionMeta}>
                {decision.cost && `Cost: $${decision.cost}`}
                {decision.potentialRevenue && `Potential Net: $${decision.potentialRevenue}`}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Controls */}
      <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowFinancials(!showFinancials)}>
        <Text style={styles.secondaryButtonText}>
          {showFinancials ? 'Hide' : 'Show'} Financial Statements
        </Text>
      </TouchableOpacity>

      {showFinancials && (
        <FinancialStatements
          current={generateFinancialSnapshot(gameState)}
          previous={gameState.previousFinancials}
          colors={colors}
        />
      )}

      <TouchableOpacity style={styles.secondaryButton} onPress={resetGame}>
        <Text style={styles.secondaryButtonText}>Reset Game</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Financial Statements Component
const FinancialStatements: React.FC<{
  current: FinancialSnapshot;
  previous: FinancialSnapshot;
  colors: any;
}> = ({ current, previous, colors }) => {
  const styles = StyleSheet.create({
    financialCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    financialRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    financialLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    financialValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    oldValue: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    newValue: {
      fontWeight: 'bold',
      color: colors.text,
    },
  });

  const formatChange = (current: number, previous: number) => {
    if (current === previous) {
      return `$${current}`;
    }
    return (
      <Text>
        <Text style={styles.oldValue}>${previous}</Text>
        {' '}
        <Text style={styles.newValue}>${current}</Text>
      </Text>
    );
  };

  return (
    <View>
      {/* Income Statement */}
      <View style={styles.financialCard}>
        <Text style={styles.sectionTitle}>📊 Income Statement</Text>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Revenue</Text>
          <Text style={styles.financialValue}>
            {formatChange(current.revenue, previous.revenue)}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Expenses</Text>
          <Text style={styles.financialValue}>
            {formatChange(current.expenses, previous.expenses)}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Net Income</Text>
          <Text style={styles.financialValue}>
            {formatChange(current.netIncome, previous.netIncome)}
          </Text>
        </View>
      </View>

      {/* Balance Sheet */}
      <View style={styles.financialCard}>
        <Text style={styles.sectionTitle}>🏦 Balance Sheet</Text>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Cash</Text>
          <Text style={styles.financialValue}>
            {formatChange(current.cash, previous.cash)}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Total Assets</Text>
          <Text style={styles.financialValue}>
            {formatChange(current.totalAssets, previous.totalAssets)}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Total Equity</Text>
          <Text style={styles.financialValue}>
            {formatChange(current.totalEquity, previous.totalEquity)}
          </Text>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.financialCard}>
        <Text style={styles.sectionTitle}>📈 Key Metrics</Text>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Employees</Text>
          <Text style={styles.financialValue}>
            {current.employees !== previous.employees ? (
              <Text>
                <Text style={styles.oldValue}>{previous.employees}</Text>
                {' '}
                <Text style={styles.newValue}>{current.employees}</Text>
              </Text>
            ) : (
              current.employees
            )}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Working Printers</Text>
          <Text style={styles.financialValue}>
            {current.workingPrinters !== previous.workingPrinters ? (
              <Text>
                <Text style={styles.oldValue}>{previous.workingPrinters}</Text>
                {' '}
                <Text style={styles.newValue}>{current.workingPrinters}</Text>
              </Text>
            ) : (
              current.workingPrinters
            )}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Materials Inventory</Text>
          <Text style={styles.financialValue}>
            {current.materialsInventory !== previous.materialsInventory ? (
              <Text>
                <Text style={styles.oldValue}>{previous.materialsInventory}</Text>
                {' '}
                <Text style={styles.newValue}>{current.materialsInventory}</Text>
              </Text>
            ) : (
              current.materialsInventory
            )}
          </Text>
        </View>
      </View>
    </View>
  );
};