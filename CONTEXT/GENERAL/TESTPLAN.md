# Test Plan for Code Consolidation

**Purpose**: Ensure code consolidation and refactoring doesn't break existing functionality on iOS or Android.

**Last Updated**: 2025-12-02

---

## 🎯 Testing Strategy

### Automated Testing (✅ COMPLETED)
**Status**: Jest testing framework is now set up and operational.

**Current Coverage**:
- ✅ 19/19 automated tests passing
- ✅ `dateUtils` - 11 tests (date formatting, date calculations)
- ✅ `idUtils` - 8 tests (ID generation)

**Test Commands**:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode (re-runs on changes)
npm run test:coverage # With coverage report
```

**What's Tested**:
- Utility function logic
- Date calculations and formatting
- ID generation uniqueness
- Edge cases and error conditions

**Next Steps**:
- Add tests for new utility functions as they're created during consolidation
- Add component tests for shared components (CommonModal, FormComponents, etc.)
- Run `npm test` after each consolidation change

See [`JEST_SETUP.md`](./JEST_SETUP.md) for detailed setup information.

### Pre-Consolidation Baseline
Before making ANY consolidation changes, establish a baseline of working functionality.

### During Consolidation
1. **Write tests first** for new utility functions and shared components
2. **Run automated tests** after each code change (`npm test`)
3. **Run manual smoke tests** on iOS and Android after each phase
4. Test incrementally after each major change (per SHRINKPLAN.md phase)

### Post-Consolidation
Full regression testing on both platforms (automated + manual).

---

## 📱 Platform Coverage

All tests must be performed on:
- ✅ **iOS** (physical device or simulator)
- ✅ **Android** (physical device or emulator)

---

## 🧪 Test Levels

### Level 0: Automated Tests (Run After EVERY Code Change)
**Run continuously during development**
**Time**: Seconds

```bash
npm test
```

**What's Tested**:
- ✅ Utility functions (date formatting, ID generation, etc.)
- ✅ Business logic
- ✅ Data transformations
- 🔄 Shared components (as they're created)

**Current Status**: 19/19 tests passing

**Benefits**:
- Instant feedback on code changes
- Catches regressions immediately
- No manual testing required for utility logic
- Runs in CI/CD pipeline

### Level 1: Smoke Tests (Critical Path)
**Run after EVERY consolidation change**
**Time**: ~5-10 minutes per platform

1. **App Launch**
   - [ ] App launches without crashes
   - [ ] No console errors on startup
   - [ ] Theme loads correctly (light/dark)
   - [ ] Navigation bar appears

2. **Spark Registry**
   - [ ] All Sparks appear in the list
   - [ ] Spark icons display correctly
   - [ ] Can open any Spark without crash

3. **Basic Spark Functionality** (test 3-5 representative Sparks)
   - [ ] Spark loads and displays content
   - [ ] Settings button works
   - [ ] Can close Spark and return to home
   - [ ] Data persists after closing

### Level 2: Component Tests (After Each Phase)
**Run after completing each SHRINKPLAN.md phase**
**Time**: ~20-30 minutes per platform

#### Phase 1 Tests (Styles & Modals)
After centralizing styles and extracting modal component:

**Style Verification**:
- [ ] Container backgrounds match theme
- [ ] Text colors are correct (primary, secondary)
- [ ] Button styles consistent across Sparks
- [ ] Border radius and spacing look correct
- [ ] Input fields styled properly
- [ ] Cards and surfaces render correctly

**Modal Verification** (test in 5+ Sparks with modals):
- [ ] Modal opens with correct overlay
- [ ] Modal title displays
- [ ] Close button works
- [ ] Cancel/Save buttons work
- [ ] Modal scrolls if content is long
- [ ] Keyboard doesn't cover inputs
- [ ] Modal closes properly

**Sparks to Test**:
- SongSaverSpark (track management modal)
- TripSurveySpark (finalize modal, add response modal)
- TodoSpark (add/edit modals)
- FlashcardsSpark (card modals)
- BusinessSpark (any modals)

#### Phase 2 Tests (Inputs & Lists)
After creating shared input components and list rendering:

**Input Component Verification**:
- [ ] Text inputs accept input
- [ ] Placeholder text shows correctly
- [ ] Input validation works
- [ ] Multiline inputs work
- [ ] Date pickers work
- [ ] Dropdowns work
- [ ] Keyboard dismisses properly

**List Rendering Verification**:
- [ ] Lists display items correctly
- [ ] Empty states show when no data
- [ ] Scroll performance is smooth
- [ ] Pull-to-refresh works (if applicable)
- [ ] Item selection works

**Sparks to Test**:
- TodoSpark (task list)
- PackingListSpark (item list)
- SongSaverSpark (track list)
- TripSurveySpark (trip list, response matrix)
- BusinessSpark (business list)

### Level 3: Full Regression Tests
**Run before final commit**
**Time**: ~1-2 hours per platform

Test ALL Sparks systematically. For each Spark:

#### General Spark Tests
- [ ] Spark opens without errors
- [ ] Main UI renders correctly
- [ ] Settings page opens
- [ ] Feedback section works
- [ ] Can close settings
- [ ] Theme changes apply correctly

#### Data Persistence Tests
- [ ] Create new data
- [ ] Close Spark
- [ ] Reopen Spark
- [ ] Verify data persisted
- [ ] Edit data
- [ ] Verify edits saved
- [ ] Delete data
- [ ] Verify deletion saved

#### Spark-Specific Functionality

**BusinessSpark**:
- [ ] Add business
- [ ] Edit business details
- [ ] Delete business
- [ ] Filter/search works

**BuzzyBingoSpark**:
- [ ] Create bingo card
- [ ] Mark squares
- [ ] Detect bingo
- [ ] Reset card

**CardScoreSpark**:
- [ ] Add players
- [ ] Record scores
- [ ] View score history
- [ ] Calculate totals

**ComingUpSpark**:
- [ ] View upcoming events
- [ ] Events sorted correctly
- [ ] Date calculations accurate

**FinalClockSpark**:
- [ ] Input health data
- [ ] Calculate death date
- [ ] Display countdown
- [ ] Progress indicator works

**FlashcardsSpark**:
- [ ] Create deck
- [ ] Add cards
- [ ] Study mode works
- [ ] Flip cards
- [ ] Mark correct/incorrect

**FoodCamSpark**:
- [ ] Take photo
- [ ] Photo saves
- [ ] View photo gallery
- [ ] Delete photos

**GolfBrainSpark**:
- [ ] Create course
- [ ] Start round
- [ ] Record shots
- [ ] Record putts
- [ ] Complete hole
- [ ] View round summary
- [ ] Historical data displays

**GolfWisdomSpark**:
- [ ] Navigate pages
- [ ] Swipe gestures work
- [ ] Page indicators update
- [ ] Content displays correctly

**MinuteMinderSpark**:
- [ ] Set timer
- [ ] Start timer
- [ ] Pause timer
- [ ] Timer notification works

**PackingListSpark**:
- [ ] Create list
- [ ] Add items
- [ ] Check off items
- [ ] Delete items

**QuickConvertSpark**:
- [ ] Select units
- [ ] Enter values
- [ ] Conversion calculates
- [ ] Results display

**ShareSparks**:
- [ ] Share functionality works
- [ ] Share text generates

**ShortSaverSpark**:
- [ ] Add short
- [ ] View shorts
- [ ] Delete shorts

**SongSaverSpark**:
- [ ] Add Spotify URL
- [ ] Embed displays
- [ ] Category filtering
- [ ] Long press to edit
- [ ] Delete track
- [ ] Play in Spotify

**SoundboardSpark**:
- [ ] Add sound
- [ ] Play sound
- [ ] Delete sound
- [ ] Sound quality good

**SpanishFriendSpark**:
- [ ] Translation works
- [ ] Speech synthesis works
- [ ] Voice input works

**SpanishReaderSpark**:
- [ ] Load text
- [ ] Text-to-speech works
- [ ] Highlighting works

**SparkSpark**:
- [ ] Create spark idea
- [ ] Edit idea
- [ ] Delete idea

**SpinnerSpark**:
- [ ] Add options
- [ ] Spin works
- [ ] Result displays
- [ ] Animation smooth

**TeeTimeTimerSpark**:
- [ ] Set tee time
- [ ] Countdown works
- [ ] Notifications work

**TodoSpark**:
- [ ] Add todo
- [ ] Mark complete
- [ ] Edit todo
- [ ] Delete todo
- [ ] Filter works

**ToviewSpark**:
- [ ] Add content
- [ ] View content
- [ ] Mark as viewed
- [ ] Delete content

**TripStorySpark**:
- [ ] Create trip
- [ ] Add activities
- [ ] Take photos
- [ ] Photos save to trip
- [ ] View trip timeline
- [ ] Edit trip details
- [ ] Delete trip
- [ ] Map view works (if applicable)

**TripSurveySpark**:
- [ ] Create trip
- [ ] Add dates
- [ ] Add locations
- [ ] Add packages
- [ ] Add people
- [ ] Share survey
- [ ] Add response
- [ ] View response matrix
- [ ] Finalize trip
- [ ] Share finalized trip
- [ ] Edit trip (unfinalize)

**WeightTrackerSpark**:
- [ ] Add weight entry
- [ ] View history
- [ ] Chart displays
- [ ] Delete entry

---

## 🐛 Bug Tracking

### During Testing
Document any issues found:

**Template**:
```
Bug ID: [Date]-[Number]
Spark: [Spark Name]
Platform: iOS / Android
Severity: Critical / High / Medium / Low
Description: [What's broken]
Steps to Reproduce:
1. 
2. 
3. 
Expected: [What should happen]
Actual: [What actually happens]
Consolidation Phase: [Which phase introduced this]
```

### Critical Bugs (Block Release)
- App crashes
- Data loss
- Core functionality broken
- Unable to use Spark

### High Priority Bugs (Fix Before Release)
- UI significantly broken
- Features don't work as expected
- Performance degradation

### Medium/Low Priority Bugs (Can Ship)
- Minor UI issues
- Edge cases
- Non-critical features

---

## 📊 Test Checklist Template

Use this for each consolidation phase:

```markdown
## Phase [X] Testing - [Date]

### Pre-Change Baseline
- [ ] iOS smoke test passed
- [ ] Android smoke test passed
- [ ] Documented current state

### Changes Made
- [ ] [List specific changes]

### Post-Change Testing

#### iOS
- [ ] Smoke tests passed
- [ ] Component tests passed
- [ ] No new console errors
- [ ] Performance acceptable

#### Android  
- [ ] Smoke tests passed
- [ ] Component tests passed
- [ ] No new console errors
- [ ] Performance acceptable

### Issues Found
- [ ] No issues OR
- [ ] [Link to bug reports]

### Sign-off
- [ ] Ready to proceed to next phase
- [ ] Committed to version control
```

---

## 🔧 Testing Tools & Setup

### Automated Testing (✅ Set Up)
**Jest + React Native Testing Library**

```bash
# Run all tests
npm test

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Check TypeScript errors
npx tsc --noEmit
```

**Test Files Location**:
- `src/utils/__tests__/*.test.ts` - Utility function tests
- `src/components/__tests__/*.test.tsx` - Component tests (future)

**Documentation**: See [`JEST_SETUP.md`](./JEST_SETUP.md)

### Manual Testing Setup
1. **iOS Simulator**: Latest iOS version
2. **Android Emulator**: Latest Android version
3. **Physical Devices** (recommended):
   - iPhone (for real-world iOS testing)
   - Android phone (for real-world Android testing)

### Useful Commands
```bash
# Start iOS
npm run ios

# Start Android
npm run android

# Clear cache if issues
npm start -- --clear
```

### Console Monitoring
- Keep React Native debugger open
- Watch for:
  - Red screen errors
  - Yellow warnings (especially new ones)
  - Console.error messages
  - Performance warnings

---

## 📝 Testing Workflow

### For Each SHRINKPLAN.md Phase:

1. **Pre-Change**
   - [ ] Run automated tests (`npm test`)
   - [ ] Run smoke tests on both platforms
   - [ ] Document baseline (take screenshots if needed)
   - [ ] Commit current working state

2. **Make Changes**
   - [ ] Write tests for new utility functions/components FIRST
   - [ ] Implement consolidation changes
   - [ ] Fix any TypeScript errors
   - [ ] Run automated tests continuously (`npm run test:watch`)
   - [ ] Test locally as you go

3. **Post-Change**
   - [ ] Run automated tests (`npm test`) - must pass
   - [ ] Run smoke tests on iOS and Android
   - [ ] Run component tests for affected areas
   - [ ] Check console for new errors/warnings
   - [ ] Test on both iOS and Android

4. **Document**
   - [ ] Log any issues found
   - [ ] Update test checklist
   - [ ] Commit changes with test results in commit message

5. **Fix Issues**
   - [ ] Fix critical bugs immediately
   - [ ] Document high-priority bugs for later
   - [ ] Retest after fixes (automated + manual)

6. **Sign-off**
   - [ ] All automated tests pass
   - [ ] All critical manual tests pass
   - [ ] No new critical bugs
   - [ ] Ready for next phase

---

## 🚨 Rollback Plan

If consolidation introduces critical bugs:

1. **Immediate**: Revert to last known good commit
2. **Analyze**: Determine what broke
3. **Fix**: Make targeted fix
4. **Retest**: Full component tests
5. **Proceed**: Only when stable

---

## ✅ Final Release Checklist

Before considering consolidation complete:

- [ ] All Phase 1 tests passed (iOS & Android)
- [ ] All Phase 2 tests passed (iOS & Android)
- [ ] All Phase 3 tests passed (iOS & Android)
- [ ] Full regression test completed
- [ ] No critical bugs
- [ ] No high-priority bugs (or documented for future fix)
- [ ] Performance is same or better
- [ ] App size reduced as expected
- [ ] Code is cleaner and more maintainable
- [ ] All changes committed and pushed
- [ ] Build succeeds on both platforms
- [ ] Ready for production deployment

---

## 📈 Success Metrics

Track these throughout consolidation:

- **Code Size**: Should decrease by 50-100KB
- **Build Time**: Should stay same or improve
- **App Performance**: Should stay same or improve
- **Bug Count**: Should not increase
- **Test Coverage**: ✅ Started at 0%, now have automated tests for utilities (expanding during consolidation)
- **Automated Test Count**: ✅ 19 tests (will increase as we add more)
- **Developer Experience**: Code should be easier to maintain

---

## 💡 Testing Tips

1. **Test incrementally**: Don't consolidate everything at once
2. **Test both platforms**: iOS and Android can behave differently
3. **Test on real devices**: Simulators don't catch everything
4. **Keep notes**: Document what you test and what you find
5. **Don't skip smoke tests**: They catch most issues quickly
6. **Trust but verify**: Even "simple" changes can break things
7. **Test edge cases**: Empty states, long lists, special characters
8. **Test theme switching**: Dark/light mode transitions
9. **Test data persistence**: Close and reopen app frequently
10. **Test performance**: Especially with large datasets

---

## 🔄 Continuous Testing

**Current Status**: ✅ Automated testing is now active!

### During Consolidation:
- ✅ Run automated tests after every code change (`npm test`)
- ✅ Use watch mode during development (`npm run test:watch`)
- Run smoke tests before each commit
- Run full regression before each phase completion

### After Consolidation:
- Run automated tests before each commit (can add to git hooks)
- Run full regression before each release
- Continue expanding automated test coverage
- Keep this test plan updated as app evolves

### Future Improvements:
- Add E2E tests with Maestro (see [`AUTOMATED_TESTING_OPTIONS.md`](./AUTOMATED_TESTING_OPTIONS.md))
- Increase component test coverage
- Add CI/CD integration for automated tests
- Target 60%+ code coverage

