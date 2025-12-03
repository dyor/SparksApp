# Automated Testing Options for React Native/Expo

**Last Updated**: 2025-12-02

---

## 🎯 Recommended Testing Stack

For your React Native/Expo app, I recommend a **3-tier testing approach**:

### Tier 1: Unit Tests (Jest + React Native Testing Library)
**Best for**: Testing individual functions, components, utilities
**Coverage**: 60-70% of codebase

### Tier 2: Component/Integration Tests (Jest + RNTL)
**Best for**: Testing Spark components, user interactions
**Coverage**: 20-30% of codebase

### Tier 3: E2E Tests (Detox or Maestro)
**Best for**: Critical user flows, smoke tests
**Coverage**: 5-10% of codebase (most important paths)

---

## 📦 Testing Framework Options

### Option 1: Jest + React Native Testing Library (RECOMMENDED)
**Best for**: Unit and component tests

**Pros**:
- ✅ Industry standard for React Native
- ✅ Fast execution (runs in Node, not on device)
- ✅ Great for testing logic, utilities, components
- ✅ Excellent documentation and community support
- ✅ Works with Expo out of the box
- ✅ Can mock native modules
- ✅ Snapshot testing for UI regression

**Cons**:
- ❌ Doesn't test on real devices
- ❌ Can't test native module integration fully
- ❌ Some platform-specific issues won't be caught

**Setup Time**: 1-2 hours
**Learning Curve**: Low-Medium
**Maintenance**: Low

**Installation**:
```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

**Example Test**:
```typescript
// __tests__/utils/dateUtils.test.ts
import { formatDate, getDaysRemaining } from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      expect(formatDate('2024-12-25')).toBe('Dec 25, 2024');
    });
  });

  describe('getDaysRemaining', () => {
    it('calculates days remaining', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      expect(getDaysRemaining(dateStr)).toBe(1);
    });
  });
});
```

**What to Test**:
- ✅ Utility functions (date formatting, ID generation, etc.)
- ✅ Component rendering
- ✅ User interactions (button clicks, input changes)
- ✅ State management (Zustand store)
- ✅ Data transformations
- ✅ Validation logic

---

### Option 2: Detox (E2E Testing)
**Best for**: End-to-end testing on real devices/simulators

**Pros**:
- ✅ Tests on actual iOS/Android
- ✅ Catches platform-specific issues
- ✅ Tests real user flows
- ✅ Gray-box testing (can access app internals)
- ✅ Mature, widely used

**Cons**:
- ❌ Slower than Jest (runs on device)
- ❌ More complex setup
- ❌ Flaky tests possible
- ❌ Requires separate iOS/Android configs
- ❌ Can be brittle with UI changes

**Setup Time**: 4-8 hours
**Learning Curve**: Medium-High
**Maintenance**: Medium-High

**Installation**:
```bash
npm install --save-dev detox detox-cli
```

**Example Test**:
```typescript
// e2e/smoke.test.ts
describe('Smoke Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should show Spark list on launch', async () => {
    await expect(element(by.text('🧭 Trip Survey'))).toBeVisible();
    await expect(element(by.text('🎵 Song Saver'))).toBeVisible();
  });

  it('should open and close a Spark', async () => {
    await element(by.text('🎵 Song Saver')).tap();
    await expect(element(by.text('Song Saver'))).toBeVisible();
    // Close spark
    await element(by.text('Back')).tap();
    await expect(element(by.text('🎵 Song Saver'))).toBeVisible();
  });
});
```

**What to Test**:
- ✅ App launch
- ✅ Navigation flows
- ✅ Critical user paths (create, edit, delete)
- ✅ Data persistence
- ✅ Platform-specific features

---

### Option 3: Maestro (EMERGING ALTERNATIVE)
**Best for**: E2E testing with simpler setup than Detox

**Pros**:
- ✅ Much simpler than Detox
- ✅ YAML-based test definitions (no code)
- ✅ Works with iOS and Android
- ✅ Fast to write tests
- ✅ Good for smoke tests
- ✅ Cloud testing available

**Cons**:
- ❌ Less mature than Detox
- ❌ Less flexible than code-based tests
- ❌ Smaller community
- ❌ Limited advanced features

**Setup Time**: 1-2 hours
**Learning Curve**: Low
**Maintenance**: Low-Medium

**Installation**:
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

**Example Test**:
```yaml
# .maestro/smoke-test.yaml
appId: com.yourapp.sparks
---
- launchApp
- assertVisible: "🧭 Trip Survey"
- assertVisible: "🎵 Song Saver"
- tapOn: "🎵 Song Saver"
- assertVisible: "Song Saver"
- tapOn: "Back"
- assertVisible: "🧭 Trip Survey"
```

**What to Test**:
- ✅ Smoke tests
- ✅ Happy path flows
- ✅ Basic navigation
- ✅ Critical features

---

### Option 4: Appium
**Best for**: Cross-platform E2E if you need web support too

**Pros**:
- ✅ Works with iOS, Android, and web
- ✅ Industry standard
- ✅ Language agnostic (JavaScript, Python, etc.)

**Cons**:
- ❌ Complex setup
- ❌ Slower than Detox
- ❌ Overkill for React Native only
- ❌ Higher maintenance

**Recommendation**: Skip unless you need web testing too.

---

## 🎯 Recommended Approach for Your Project

### Phase 1: Start with Jest + RNTL (Week 1)
**Goal**: Get quick wins with unit tests

**Priority Tests**:
1. **Utility Functions** (easiest, highest ROI)
   - `src/utils/dateUtils.ts`
   - `src/utils/idUtils.ts`
   - `src/utils/colorUtils.ts`
   - `src/utils/scoreUtils.ts`

2. **Shared Components** (test as you create them)
   - `CommonModal.tsx`
   - `FormComponents.tsx`
   - `EmptyState.tsx`
   - `Dropdown.tsx`

3. **Store/State Management**
   - Zustand store actions
   - Data persistence

**Expected Coverage**: 30-40% of codebase
**Time Investment**: 8-16 hours
**Value**: High - catches logic bugs early

### Phase 2: Add Component Tests (Week 2)
**Goal**: Test Spark components

**Priority Sparks to Test**:
1. **Simple Sparks** (learn the patterns)
   - PackingListSpark
   - TodoSpark
   - SpinnerSpark

2. **Medium Complexity**
   - SongSaverSpark
   - WeightTrackerSpark
   - CardScoreSpark

3. **Complex Sparks** (if time permits)
   - TripSurveySpark
   - TripStorySpark
   - GolfBrainSpark

**Expected Coverage**: 50-60% of codebase
**Time Investment**: 16-24 hours
**Value**: Medium-High - catches UI bugs

### Phase 3: Add E2E Smoke Tests (Week 3)
**Goal**: Catch critical regressions

**Choose ONE**:
- **Maestro** (recommended for simplicity)
- **Detox** (if you need more power)

**Priority Tests**:
1. App launches successfully
2. Can open each Spark
3. Can create/edit/delete in 5 key Sparks
4. Data persists after app restart
5. Theme switching works

**Expected Coverage**: 5-10% of codebase (critical paths)
**Time Investment**: 8-16 hours
**Value**: High - catches platform-specific issues

---

## 📋 Implementation Plan

### Week 1: Foundation
```bash
# Install Jest + RNTL
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native

# Configure Jest
# Add to package.json:
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}

# Create jest.config.js
# Create __tests__ directory structure
```

**Deliverables**:
- [ ] Jest configured
- [ ] 20+ utility function tests
- [ ] 5+ component tests
- [ ] CI integration (optional)

### Week 2: Expand Coverage
**Deliverables**:
- [ ] 10+ Spark component tests
- [ ] Store tests
- [ ] 50%+ code coverage
- [ ] Test documentation

### Week 3: E2E Tests
**Deliverables**:
- [ ] Maestro or Detox configured
- [ ] 10+ smoke tests
- [ ] Platform-specific test runs
- [ ] Integration with test plan

---

## 💰 Cost-Benefit Analysis

### Without Automated Tests
**Pros**: No time investment
**Cons**: 
- Manual testing takes 1-2 hours per consolidation phase
- High risk of missing bugs
- Bugs found late (expensive to fix)
- Fear of refactoring

### With Automated Tests
**Pros**:
- Tests run in seconds
- Catch bugs immediately
- Confidence to refactor
- Documentation of expected behavior
- Faster development long-term

**Cons**:
- Initial time investment: 30-50 hours
- Ongoing maintenance: 2-4 hours/month

**ROI**: Positive after 2-3 months

---

## 🎯 Minimal Viable Testing (If Time Constrained)

If you want to start small:

### Option A: Just Utilities (4-8 hours)
- Test all utility functions
- Test shared components as you create them
- Skip Spark tests
- Skip E2E tests

**Coverage**: 20-30%
**Value**: Medium - catches logic bugs

### Option B: Utilities + Smoke Tests (8-16 hours)
- Test utility functions
- Add Maestro smoke tests
- Skip component tests

**Coverage**: 25-35%
**Value**: Medium-High - catches logic + critical bugs

### Option C: Full Stack (30-50 hours)
- Jest for utilities and components
- Maestro for E2E
- 50-60% coverage

**Coverage**: 50-60%
**Value**: High - comprehensive safety net

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install --save-dev \
  jest \
  @testing-library/react-native \
  @testing-library/jest-native \
  @types/jest
```

### 2. Configure Jest
Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
};
```

### 3. Add Test Script
In `package.json`:
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

### 4. Write Your First Test
Create `src/utils/__tests__/idUtils.test.ts`:
```typescript
import { generateId } from '../idUtils';

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('generates string IDs', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });
});
```

### 5. Run Tests
```bash
npm test
```

---

## 📊 Recommended Decision

**For your consolidation project**, I recommend:

### Immediate (Before Consolidation):
✅ **Jest + React Native Testing Library**
- Start with utility function tests
- Add component tests for shared components
- Time: 8-16 hours
- ROI: High

### After Phase 1 Consolidation:
✅ **Maestro for Smoke Tests**
- 10-15 critical path tests
- Run before each phase
- Time: 8-12 hours
- ROI: High

### Future (After Consolidation):
✅ **Expand Jest Coverage**
- Test more Sparks
- Aim for 60%+ coverage
- Ongoing effort

**Total Initial Investment**: 16-28 hours
**Payoff**: Confidence during consolidation + long-term maintainability

---

## 🎓 Learning Resources

### Jest + RNTL
- [React Native Testing Library Docs](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/)
- [Testing React Native Apps (Official)](https://reactnative.dev/docs/testing-overview)

### Maestro
- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro Examples](https://github.com/mobile-dev-inc/maestro/tree/main/maestro-test)

### Detox
- [Detox Documentation](https://wix.github.io/Detox/)
- [Detox with Expo](https://docs.expo.dev/build-reference/e2e-tests/)

---

## ❓ FAQ

**Q: Should I write tests before or after consolidation?**
A: Write utility tests BEFORE (they're quick and valuable). Write component tests DURING (as you create shared components). Write E2E tests AFTER Phase 1.

**Q: What's the minimum viable testing?**
A: Utility function tests + Maestro smoke tests (16-20 hours total).

**Q: Will tests slow down development?**
A: Initially yes (30-50 hours investment), but they speed up development after 2-3 months.

**Q: Can I add tests incrementally?**
A: Yes! Start with utilities, add more over time.

**Q: Which E2E tool should I choose?**
A: Maestro for simplicity, Detox for power. I recommend Maestro for your use case.
