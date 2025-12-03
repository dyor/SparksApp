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
import { createCommonStyles } from '../styles/CommonStyles';
import { StyleTokens } from '../styles/StyleTokens';

interface Printer {
  id: string;
  purchaseDay: number;
  daysUsed: number;
  status: 'working' | 'needs_repair' | 'under_repair';
  repairDay?: number;
  // Printer can handle 8 calls/day (30 min each = 4 hours)
  callsHandledToday: number;
}

interface Employee {
  id: string;
  type: '3d_printer' | 'phone_operator';
  hireDay: number;
  // Part-time: 4 hours/day, 5 days/week
  // 3D Printer: 10 jobs/hour = 40 jobs/day max, 50 jobs/week max
  // Phone Operator: same capacity
  jobsCompletedToday: number;
  daysWorkedThisWeek: number;
}

interface GoogleAdsCampaign {
  id: string;
  startDay: number;
  daysRemaining: number; // 5 days total
  dailyVisits: number; // 100 visits per day
}

interface PendingOrder {
  id: string;
  createdDay: number;
  revenue: number; // $50 per order
  materialsNeeded: number; // 1 unit per order
}

interface FinancialSnapshot {
  cash: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  totalAssets: number;
  totalEquity: number;
  materialsInventory: number;
  employees3D: number;
  employeesPhone: number;
  workingPrinters: number;
  dailyRevenue: number;
  dailyExpenses: number;
  pendingOrders: number;
  ownerPrintJobs: number;
  ownerPhoneCalls: number;
}

interface GameState {
  day: number;
  cash: number;
  employees: Employee[];
  printers: Printer[];
  materialsInventory: number;
  cumulativeRevenue: number;
  cumulativeExpenses: number;
  previousFinancials: FinancialSnapshot;
  gameStarted: boolean;
  gameEnded: boolean;
  dailyLog: string[];
  hasAnsweredToday: boolean; // Track if question answered today
  previousDecisions: Array<{ day: number; decision: string; log: string[] }>; // Track previous decisions
  googleAdsCampaigns: GoogleAdsCampaign[];
  pendingOrders: PendingOrder[]; // Orders waiting to be fulfilled
  hasShopify: boolean;
  shopifySetupDay?: number;
  weekOfMonth: number; // Track which week (1-4) for employee capacity limits
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
  cash: 2000,
  employees: [],
  printers: [],
  materialsInventory: 0,
  cumulativeRevenue: 0,
  cumulativeExpenses: 0,
  previousFinancials: {
    cash: 2000,
    revenue: 0,
    expenses: 0,
    netIncome: 0,
    totalAssets: 2000,
    totalEquity: 2000,
    materialsInventory: 0,
    employees3D: 0,
    employeesPhone: 0,
    workingPrinters: 0,
    dailyRevenue: 0,
    dailyExpenses: 0,
    pendingOrders: 0,
    ownerPrintJobs: 0,
    ownerPhoneCalls: 0,
  },
  gameStarted: false,
  gameEnded: false,
  dailyLog: [],
  hasAnsweredToday: false,
  previousDecisions: [],
  googleAdsCampaigns: [],
  pendingOrders: [],
  hasShopify: false,
  weekOfMonth: 1,
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
          sparkId="business-sim"
        />

        <SettingsFeedbackSection sparkName="Business Simulator" sparkId="business" />

        <SettingsSection title="About">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body">
              Simulate running a 3D printing business over 30 days. Make strategic decisions about investments, operations, and growth to maximize your success.
            </SettingsText>
          </View>
        </SettingsSection>

        <TouchableOpacity
          onPress={onClose}
          style={{ backgroundColor: '#e0e0e0', padding: 12, borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Close</Text>
        </TouchableOpacity>
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
  const commonStyles = createCommonStyles(colors);

  const [gameState, setGameState] = useState<GameState>(initialState);
  const [showFinancials, setShowFinancials] = useState(false);
  const [currentDecisions, setCurrentDecisions] = useState<Decision[]>([]);

  // Load saved data
  useEffect(() => {
    const savedData = getSparkData('business-sim') as { gameState?: GameState };
    if (savedData?.gameState) {
      // Ensure all new fields are initialized for backward compatibility
      const loadedState = {
        ...initialState,
        ...savedData.gameState,
        employees: savedData.gameState.employees || [],
        printers: savedData.gameState.printers || [],
        googleAdsCampaigns: savedData.gameState.googleAdsCampaigns || [],
        pendingOrders: savedData.gameState.pendingOrders || [],
        previousDecisions: savedData.gameState.previousDecisions || [],
        dailyLog: savedData.gameState.dailyLog || [],
        previousFinancials: savedData.gameState.previousFinancials || initialState.previousFinancials,
      };
      setGameState(loadedState);
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
    const printerValue = (state.printers || []).length * 200; // Depreciated value (50% of $400)
    const materialsValue = state.materialsInventory * 15;
    return state.cash + printerValue + materialsValue;
  };

  const getWorkingPrinters = (printers: Printer[] | undefined): Printer[] => {
    return (printers || []).filter(p => p.status === 'working');
  };

  const getPrintersNeedingRepair = (printers: Printer[] | undefined): Printer[] => {
    return (printers || []).filter(p => p.status === 'needs_repair');
  };

  // Helper: Get employees by type
  const getEmployeesByType = (employees: Employee[] | undefined, type: '3d_printer' | 'phone_operator'): Employee[] => {
    return (employees || []).filter(e => e.type === type);
  };

  // Helper: Calculate employee capacity
  const getEmployeeCapacity = (employee: Employee, dayOfWeek: number): { daily: number; weekly: number } => {
    // Part-time: 4 hours/day, 5 days/week
    // 3D Printer: 10 jobs/hour = 40 jobs/day max, 50 jobs/week max
    // Phone Operator: same capacity
    const dailyMax = 40; // 10 jobs/hour * 4 hours
    const weeklyMax = 50; // 10 jobs/hour * 4 hours * 5 days / 4 (to account for week cycle)

    // Check if employee has worked 5 days this week
    if (employee.daysWorkedThisWeek >= 5) {
      return { daily: 0, weekly: 0 };
    }

    return { daily: dailyMax, weekly: weeklyMax - (employee.daysWorkedThisWeek * 10) };
  };

  // Helper: Calculate owner phone calls needed
  const calculateOwnerPhoneCalls = (state: GameState): number => {
    // Count calls from Google Ads
    const activeAds = state.googleAdsCampaigns.filter(c => c.daysRemaining > 0);
    let totalCalls = 0;
    activeAds.forEach(campaign => {
      // 100 visits = 5 calls
      totalCalls += 5;
    });

    // Subtract phone operator capacity (8 calls/day per operator)
    const phoneOperators = getEmployeesByType(state.employees, 'phone_operator');
    const callsHandledByOperators = phoneOperators.filter(emp => emp.daysWorkedThisWeek < 5).length * 8;
    const remainingCalls = Math.max(0, totalCalls - callsHandledByOperators);

    return remainingCalls;
  };

  // Helper: Calculate owner print jobs needed
  const calculateOwnerPrintJobs = (state: GameState): number => {
    const workingPrinters = getWorkingPrinters(state.printers);
    const printer3DEmployees = getEmployeesByType(state.employees, '3d_printer');

    // Printer capacity: 2 prints per day per printer
    const totalPrinterCapacity = workingPrinters.length * 2;

    // Employee print capacity
    let employeePrintCapacity = 0;
    printer3DEmployees.forEach(emp => {
      if (emp.daysWorkedThisWeek < 5) {
        const capacity = getEmployeeCapacity(emp, state.day % 7);
        employeePrintCapacity += Math.min(capacity.daily, totalPrinterCapacity);
      }
    });

    // Pending orders that need to be fulfilled
    const pendingOrdersCount = (state.pendingOrders || []).length;

    // Orders that employees can't handle
    const ordersForOwner = Math.max(0, pendingOrdersCount - employeePrintCapacity);

    // But owner is limited by printer capacity too
    return Math.min(ordersForOwner, totalPrinterCapacity - employeePrintCapacity);
  };

  const generateDecisions = (state: GameState): Decision[] => {
    // Only show one decision per day - if already answered, return empty
    if (state.hasAnsweredToday) {
      return [];
    }

    const decisions: Decision[] = [];

    // Investment Decisions
    // 1. Buy 3D Printer: $400, prints one item every 4 hours, can field 8 calls/day (30 min calls)
    if (state.cash >= 400) {
      decisions.push({
        id: 'buy_printer',
        type: 'investment',
        title: 'Buy 3D Printer',
        description: 'Purchase a 3D printer for $400. Prints one item every 4 hours. Can field 8 calls/day (30 min each).',
        cost: 400,
        action: (state) => {
          const newPrinter: Printer = {
            id: `printer_${Date.now()}`,
            purchaseDay: state.day,
            daysUsed: 0,
            status: 'working',
            callsHandledToday: 0,
          };
          return {
            newState: {
              ...state,
              cash: state.cash - 400,
              cumulativeExpenses: state.cumulativeExpenses + 400,
              printers: [...state.printers, newPrinter],
            },
            log: ['Purchased new 3D printer for $400']
          };
        }
      });
    }

    // 1. Hire Part-Time 3D Printer: $100 upfront + $80/day ($20/hour * 4 hours)
    // Can manage 10 print jobs/hour or up to 50/week (5 days/week)
    if (state.cash >= 100) {
      decisions.push({
        id: 'hire_3d_printer',
        type: 'investment',
        title: 'Hire Part-Time 3D Printer',
        description: 'Hire a Part-Time 3D Printer: $100 upfront + $80/day ($20/hour × 4 hours). Can manage 10 print jobs/hour or up to 50/week (5 days/week).',
        cost: 100,
        action: (state) => {
          const newEmployee: Employee = {
            id: `emp_3d_${Date.now()}`,
            type: '3d_printer',
            hireDay: state.day,
            jobsCompletedToday: 0,
            daysWorkedThisWeek: 0,
          };
          return {
            newState: {
              ...state,
              cash: state.cash - 100,
              cumulativeExpenses: state.cumulativeExpenses + 100,
              employees: [...state.employees, newEmployee],
            },
            log: ['Hired Part-Time 3D Printer for $100 upfront + $80/day']
          };
        }
      });
    }

    // 1.5. Hire Part-Time Phone Operator: $100 upfront + $80/day (same as 3D Printer)
    if (state.cash >= 100) {
      decisions.push({
        id: 'hire_phone_operator',
        type: 'investment',
        title: 'Hire Part-Time Phone Operator',
        description: 'Hire a Part-Time Phone Operator: $100 upfront + $80/day ($20/hour × 4 hours). Can handle 8 calls/day (30 min each).',
        cost: 100,
        action: (state) => {
          const newEmployee: Employee = {
            id: `emp_phone_${Date.now()}`,
            type: 'phone_operator',
            hireDay: state.day,
            jobsCompletedToday: 0,
            daysWorkedThisWeek: 0,
          };
          return {
            newState: {
              ...state,
              cash: state.cash - 100,
              cumulativeExpenses: state.cumulativeExpenses + 100,
              employees: [...state.employees, newEmployee],
            },
            log: ['Hired Part-Time Phone Operator for $100 upfront + $80/day']
          };
        }
      });
    }

    // 3. Buy Google Ads: $100, 100 website visits for 5 days, 2 pending orders per day (out of 5 calls)
    if (state.cash >= 100 && state.hasShopify) {
      decisions.push({
        id: 'buy_google_ads',
        type: 'investment',
        title: 'Buy Google Ads',
        description: 'Purchase $100 worth of ads. Results in 100 website visits on each of the next 5 days. Each 100 visits = 5 phone calls (30 min each). 2 out of 5 calls result in pending orders ($50 each, requires materials).',
        cost: 100,
        action: (state) => {
          const newCampaign: GoogleAdsCampaign = {
            id: `ads_${Date.now()}`,
            startDay: state.day,
            daysRemaining: 5,
            dailyVisits: 100,
          };
          return {
            newState: {
              ...state,
              cash: state.cash - 100,
              cumulativeExpenses: state.cumulativeExpenses + 100,
              googleAdsCampaigns: [...state.googleAdsCampaigns, newCampaign],
            },
            log: ['Purchased Google Ads campaign for $100 (5 days, 2 pending orders/day)']
          };
        }
      });
    }

    // 7. Setup Shopify: $700 one-time + $30/month
    if (!state.hasShopify && state.cash >= 700) {
      decisions.push({
        id: 'setup_shopify',
        type: 'investment',
        title: 'Setup Shopify Website',
        description: 'One-time fee of $700 for setting up a Shopify website + $30/month for running the site.',
        cost: 700,
        action: (state) => {
          return {
            newState: {
              ...state,
              cash: state.cash - 700,
              cumulativeExpenses: state.cumulativeExpenses + 700,
              hasShopify: true,
              shopifySetupDay: state.day,
            },
            log: ['Setup Shopify website for $700 + $30/month']
          };
        }
      });
    }

    // Buy Materials
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
              cumulativeExpenses: state.cumulativeExpenses + 150,
              materialsInventory: state.materialsInventory + 10,
            },
            log: ['Purchased bulk materials for $150 (10 units)']
          };
        }
      });
    }

    // Return all available decisions - user can choose one per day
    return decisions;
  };

  // Process daily operations: Google Ads, employee work, printer production, etc.
  const processDailyOperations = (state: GameState): { newState: GameState; dailyRevenue: number; dailyExpenses: number; log: string[] } => {
    let dailyRevenue = 0;
    let dailyExpenses = 0;
    const log: string[] = [];

    // 1. Process Google Ads campaigns - create pending orders (2 per day per active campaign)
    const activeAds = state.googleAdsCampaigns.filter(c => c.daysRemaining > 0);
    let newPendingOrders: PendingOrder[] = [];
    let totalCalls = 0;
    activeAds.forEach(campaign => {
      // 100 visits = 5 calls
      totalCalls += 5;
      // 2 out of 5 calls result in pending orders
      for (let i = 0; i < 2; i++) {
        newPendingOrders.push({
          id: `order_${Date.now()}_${i}`,
          createdDay: state.day,
          revenue: 50,
          materialsNeeded: 1,
        });
      }
      log.push(`Google Ads: 100 visits generated 5 phone calls, 2 pending orders created`);
    });

    // 2. Handle phone calls with phone operators
    const phoneOperators = getEmployeesByType(state.employees, 'phone_operator');
    let callsHandledByOperators = 0;
    phoneOperators.forEach(emp => {
      if (emp.daysWorkedThisWeek < 5) {
        // Each operator can handle 8 calls/day (4 hours / 0.5 hours per call)
        const callsForThisOperator = Math.min(8, totalCalls - callsHandledByOperators);
        callsHandledByOperators += callsForThisOperator;
        emp.jobsCompletedToday = callsForThisOperator;
        emp.daysWorkedThisWeek += 1;
        dailyExpenses += 80; // $80/day salary
        log.push(`Phone Operator handled ${callsForThisOperator} calls`);
      }
    });

    // Remaining calls handled by owner
    const ownerCalls = Math.max(0, totalCalls - callsHandledByOperators);
    if (ownerCalls > 0) {
      log.push(`Owner handled ${ownerCalls} calls (${(ownerCalls * 0.5).toFixed(1)} hours)`);
    }

    // 3. Fulfill pending orders (old + new)
    const allPendingOrders = [...(state.pendingOrders || []), ...newPendingOrders];
    const workingPrinters = getWorkingPrinters(state.printers);
    const printer3DEmployees = getEmployeesByType(state.employees, '3d_printer');

    // Calculate printer capacity: 2 prints per day per printer
    const totalPrinterCapacity = workingPrinters.length * 2;

    // Calculate employee capacity for printing
    let employeePrintCapacity = 0;
    printer3DEmployees.forEach(emp => {
      if (emp.daysWorkedThisWeek < 5) {
        const capacity = getEmployeeCapacity(emp, state.day % 7);
        // Employee can manage more than printer capacity, so use printer capacity as limit
        employeePrintCapacity += Math.min(capacity.daily, totalPrinterCapacity);
        emp.daysWorkedThisWeek += 1;
        dailyExpenses += 80; // $80/day salary
      }
    });

    // Total print capacity (employee + owner can use remaining printer capacity)
    const totalPrintCapacity = totalPrinterCapacity; // Owner can use any remaining capacity

    // Fulfill orders up to capacity
    let materialsAvailable = state.materialsInventory;
    const ordersToFulfill = Math.min(allPendingOrders.length, totalPrintCapacity, materialsAvailable);
    let fulfilledOrders: PendingOrder[] = [];
    let remainingOrders: PendingOrder[] = [];

    for (let i = 0; i < allPendingOrders.length; i++) {
      if (i < ordersToFulfill && materialsAvailable > 0) {
        fulfilledOrders.push(allPendingOrders[i]);
        dailyRevenue += allPendingOrders[i].revenue;
        materialsAvailable -= allPendingOrders[i].materialsNeeded;
        dailyExpenses += 15; // Material cost per order
      } else {
        remainingOrders.push(allPendingOrders[i]);
      }
    }

    if (fulfilledOrders.length > 0) {
      log.push(`Fulfilled ${fulfilledOrders.length} orders: $${fulfilledOrders.length * 50} revenue`);
    }

    if (remainingOrders.length > 0) {
      const lackingPrinters = remainingOrders.length > totalPrintCapacity;
      const lackingMaterials = materialsAvailable === 0 && remainingOrders.length > 0;

      if (lackingPrinters) {
        log.push(`⚠️ ${remainingOrders.length} orders pending - need more printers (${totalPrintCapacity} capacity, ${allPendingOrders.length} orders)`);
      }
      if (lackingMaterials) {
        log.push(`⚠️ ${remainingOrders.length} orders pending - need more materials`);
      }
    }

    // Calculate owner print jobs needed
    const employeePrintJobs = Math.min(employeePrintCapacity, ordersToFulfill);
    const ownerPrintJobs = Math.max(0, ordersToFulfill - employeePrintJobs);
    if (ownerPrintJobs > 0) {
      log.push(`Owner completed ${ownerPrintJobs} print jobs`);
    }

    // 4. Shopify monthly cost ($30/month)
    if (state.hasShopify) {
      dailyExpenses += 1; // $30/month = ~$1/day
      if (state.day % 30 === 0) {
        log.push(`Shopify monthly fee: $30`);
      }
    }

    // 5. Update Google Ads campaigns
    const updatedCampaigns = state.googleAdsCampaigns.map(campaign => {
      if (campaign.daysRemaining > 0) {
        return { ...campaign, daysRemaining: campaign.daysRemaining - 1 };
      }
      return campaign;
    }).filter(c => c.daysRemaining > 0);

    // 6. Reset daily counters for employees and printers
    const updatedEmployees = state.employees.map(emp => ({
      ...emp,
      jobsCompletedToday: 0,
    }));

    // Reset week counter every 5 days
    const updatedEmployeesWithWeekReset = updatedEmployees.map(emp => {
      if (state.day % 5 === 0) {
        return { ...emp, daysWorkedThisWeek: 0 };
      }
      return emp;
    });

    const updatedPrinters = state.printers.map(printer => ({
      ...printer,
      callsHandledToday: 0,
    }));

    return {
      newState: {
        ...state,
        employees: updatedEmployeesWithWeekReset,
        printers: updatedPrinters,
        googleAdsCampaigns: updatedCampaigns,
        pendingOrders: remainingOrders,
        materialsInventory: materialsAvailable,
      },
      dailyRevenue,
      dailyExpenses,
      log,
    };
  };

  const advanceDay = (state: GameState) => {
    // Process daily operations first
    const dailyOps = processDailyOperations(state);

    // Age printers and handle repairs
    const updatedPrinters = dailyOps.newState.printers.map(printer => {
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

    // Update cash with daily operations
    const newCash = state.cash + dailyOps.dailyRevenue - dailyOps.dailyExpenses;

    return {
      ...dailyOps.newState,
      day: state.day + 1,
      cash: newCash,
      printers: updatedPrinters,
      cumulativeRevenue: state.cumulativeRevenue + dailyOps.dailyRevenue,
      cumulativeExpenses: state.cumulativeExpenses + dailyOps.dailyExpenses,
      hasAnsweredToday: false, // Reset for new day
      weekOfMonth: Math.floor((state.day + 1) / 7) + 1,
    };
  };

  const makeDecision = (decision: Decision) => {
    HapticFeedback.light();

    const result = decision.action(gameState);
    const newStateAfterDecision = {
      ...result.newState,
      hasAnsweredToday: true, // Mark as answered
      previousDecisions: [
        ...gameState.previousDecisions,
        {
          day: gameState.day,
          decision: decision.title,
          log: result.log,
        }
      ],
    };

    // Process daily operations (this happens automatically each day)
    const dailyOps = processDailyOperations(newStateAfterDecision);

    // Update state with daily operations
    const stateWithDailyOps = {
      ...newStateAfterDecision,
      cash: newStateAfterDecision.cash + dailyOps.dailyRevenue - dailyOps.dailyExpenses,
      cumulativeRevenue: newStateAfterDecision.cumulativeRevenue + dailyOps.dailyRevenue,
      cumulativeExpenses: newStateAfterDecision.cumulativeExpenses + dailyOps.dailyExpenses,
      employees: dailyOps.newState.employees,
      printers: dailyOps.newState.printers,
      googleAdsCampaigns: dailyOps.newState.googleAdsCampaigns,
      materialsInventory: dailyOps.newState.materialsInventory,
      dailyLog: [...result.log, ...dailyOps.log],
    };

    // Check win/lose conditions
    if (stateWithDailyOps.cash < 0) {
      stateWithDailyOps.gameEnded = true;
      Alert.alert('Bankruptcy!', 'Your business has run out of cash. Game over!');
    } else if (stateWithDailyOps.day >= 30) {
      stateWithDailyOps.gameEnded = true;
      const netWorth = calculateNetWorth(stateWithDailyOps);
      onComplete?.({
        days: 30,
        finalCash: stateWithDailyOps.cash,
        netWorth,
        totalRevenue: stateWithDailyOps.cumulativeRevenue,
        success: netWorth > 1500
      });
    }

    setGameState(stateWithDailyOps);
    setCurrentDecisions(generateDecisions(stateWithDailyOps));
  };

  const generateFinancialSnapshot = (state: GameState): FinancialSnapshot => {
    const workingPrinters = getWorkingPrinters(state.printers || []).length;
    const printerValue = (state.printers || []).length * 200; // Depreciated value
    const materialsValue = state.materialsInventory * 15;
    const totalAssets = state.cash + printerValue + materialsValue;

    const employees3D = getEmployeesByType(state.employees, '3d_printer').length;
    const employeesPhone = getEmployeesByType(state.employees, 'phone_operator').length;

    // Calculate daily revenue and expenses (estimate based on current state)
    // This is an estimate for display - actual values come from processDailyOperations
    let estimatedDailyRevenue = 0;
    let estimatedDailyExpenses = 0;

    // Estimate from Google Ads
    const activeAds = state.googleAdsCampaigns.filter(c => c.daysRemaining > 0);
    const totalCalls = activeAds.length * 5; // 5 calls per campaign per day
    const conversions = Math.floor(totalCalls * 0.4);
    estimatedDailyRevenue = conversions * 50;
    estimatedDailyExpenses = conversions * 15;

    // Employee salaries
    estimatedDailyExpenses += (employees3D + employeesPhone) * 80;

    // Shopify cost
    if (state.hasShopify) {
      estimatedDailyExpenses += 1; // $1/day = $30/month
    }

    // Calculate owner responsibilities
    const ownerPhoneCalls = calculateOwnerPhoneCalls(state);
    const ownerPrintJobs = calculateOwnerPrintJobs(state);

    return {
      cash: state.cash,
      revenue: state.cumulativeRevenue,
      expenses: state.cumulativeExpenses,
      netIncome: state.cumulativeRevenue - state.cumulativeExpenses,
      totalAssets,
      totalEquity: totalAssets,
      materialsInventory: state.materialsInventory,
      employees3D,
      employeesPhone,
      workingPrinters,
      dailyRevenue: estimatedDailyRevenue,
      dailyExpenses: estimatedDailyExpenses,
      pendingOrders: (state.pendingOrders || []).length,
      ownerPrintJobs,
      ownerPhoneCalls,
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
    ...commonStyles,
    scrollContent: {
      padding: StyleTokens.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: StyleTokens.spacing.xl,
    },
    // title and subtitle removed as they are in commonStyles
    statusCard: {
      ...commonStyles.card,
      padding: StyleTokens.spacing.lg,
      marginBottom: StyleTokens.spacing.xl,
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
      fontSize: StyleTokens.fontSize.lg,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: StyleTokens.spacing.md,
      marginTop: StyleTokens.spacing.sm,
    },
    decisionCard: {
      ...commonStyles.card,
      padding: StyleTokens.spacing.md,
      marginBottom: StyleTokens.spacing.sm,
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
      ...commonStyles.primaryButton,
      paddingVertical: 12,
    },
    buttonText: {
      ...commonStyles.primaryButtonText,
      fontSize: 16,
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
      ...commonStyles.card,
      padding: StyleTokens.spacing.md,
      marginBottom: StyleTokens.spacing.xl,
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
    return <BusinessSimulatorSettings onClose={onCloseSettings || (() => { })} />;
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
          <Text style={styles.statusLabel}>👥 3D Printer Employees</Text>
          <Text style={styles.statusValue}>{getEmployeesByType(gameState.employees, '3d_printer').length}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>📞 Phone Operators</Text>
          <Text style={styles.statusValue}>{getEmployeesByType(gameState.employees, 'phone_operator').length}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>📋 Pending Orders</Text>
          <Text style={styles.statusValue}>{(gameState.pendingOrders || []).length}</Text>
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

      {/* Decisions - Only show if not answered today */}
      {!gameState.gameEnded && !gameState.hasAnsweredToday && (
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

      {/* After answering, show Previous Decisions and Financial Statements */}
      {!gameState.gameEnded && gameState.hasAnsweredToday && (
        <>
          {/* Previous Decisions */}
          {gameState.previousDecisions.length > 0 && (
            <View style={styles.logCard}>
              <Text style={styles.sectionTitle}>Previous Decisions</Text>
              {gameState.previousDecisions.slice(-5).reverse().map((prev, index) => (
                <View key={index} style={{ marginBottom: 12 }}>
                  <Text style={[styles.logText, { fontWeight: '600' }]}>
                    Day {prev.day}: {prev.decision}
                  </Text>
                  {prev.log.map((log, logIndex) => (
                    <Text key={logIndex} style={[styles.logText, { marginLeft: 16, fontSize: 12 }]}>
                      • {log}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Financial Statements - Always shown after answering */}
          <FinancialStatements
            current={generateFinancialSnapshot(gameState)}
            previous={gameState.previousFinancials}
            colors={colors}
          />

          {/* Next Day Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const nextDayState = advanceDay(gameState);
              setGameState(nextDayState);
              setCurrentDecisions(generateDecisions(nextDayState));
            }}
          >
            <Text style={styles.buttonText}>Next Day →</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Controls - Show Financial Statements toggle only if not answered today */}
      {!gameState.gameEnded && !gameState.hasAnsweredToday && (
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowFinancials(!showFinancials)}>
          <Text style={styles.secondaryButtonText}>
            {showFinancials ? 'Hide' : 'Show'} Financial Statements
          </Text>
        </TouchableOpacity>
      )}

      {!gameState.gameEnded && !gameState.hasAnsweredToday && showFinancials && (
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
  const commonStyles = createCommonStyles(colors);
  const styles = StyleSheet.create({
    financialCard: {
      ...commonStyles.card,
      padding: StyleTokens.spacing.md,
      marginBottom: StyleTokens.spacing.md,
    },
    sectionTitle: {
      fontSize: StyleTokens.fontSize.lg,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: StyleTokens.spacing.md,
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
          <Text style={styles.financialLabel}>Daily Revenue</Text>
          <Text style={styles.financialValue}>${current.dailyRevenue}</Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Daily Expenses</Text>
          <Text style={styles.financialValue}>${current.dailyExpenses}</Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Daily Net</Text>
          <Text style={styles.financialValue}>${current.dailyRevenue - current.dailyExpenses}</Text>
        </View>
        <View style={[styles.financialRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Text style={styles.financialLabel}>Total Revenue</Text>
          <Text style={styles.financialValue}>
            {formatChange(current.revenue, previous.revenue)}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Total Expenses</Text>
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
          <Text style={styles.financialLabel}>Part-Time 3D Printers</Text>
          <Text style={styles.financialValue}>
            {current.employees3D !== previous.employees3D ? (
              <Text>
                <Text style={styles.oldValue}>{previous.employees3D}</Text>
                {' '}
                <Text style={styles.newValue}>{current.employees3D}</Text>
              </Text>
            ) : (
              current.employees3D
            )}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>3D Printer Capacity (Daily)</Text>
          <Text style={styles.financialValue}>{current.employees3D * 40} available</Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Part-Time Phone Operators</Text>
          <Text style={styles.financialValue}>
            {current.employeesPhone !== previous.employeesPhone ? (
              <Text>
                <Text style={styles.oldValue}>{previous.employeesPhone}</Text>
                {' '}
                <Text style={styles.newValue}>{current.employeesPhone}</Text>
              </Text>
            ) : (
              current.employeesPhone
            )}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Phone Operator Capacity (Daily)</Text>
          <Text style={styles.financialValue}>{current.employeesPhone * 8} calls available</Text>
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
        <View style={[styles.financialRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Text style={styles.financialLabel}>Pending Orders</Text>
          <Text style={styles.financialValue}>
            {current.pendingOrders !== previous.pendingOrders ? (
              <Text>
                <Text style={styles.oldValue}>{previous.pendingOrders}</Text>
                {' '}
                <Text style={styles.newValue}>{current.pendingOrders}</Text>
              </Text>
            ) : (
              current.pendingOrders
            )}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={[styles.financialLabel, { fontWeight: 'bold' }]}>Owner Responsibilities</Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>  • Print Jobs</Text>
          <Text style={styles.financialValue}>{current.ownerPrintJobs}</Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>  • Phone Calls</Text>
          <Text style={styles.financialValue}>{current.ownerPhoneCalls} ({((current.ownerPhoneCalls || 0) * 0.5).toFixed(1)} hours)</Text>
        </View>
      </View>
    </View>
  );
};