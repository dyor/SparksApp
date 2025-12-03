# Jest Testing Setup - Quick Reference

## ✅ What Was Installed

```bash
npm install --save-dev --legacy-peer-deps \
  jest \
  @testing-library/react-native \
  @types/jest
```

## 📁 Files Created

- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test setup and mocks
- `src/utils/dateUtils.ts` - Date utility functions
- `src/utils/idUtils.ts` - ID generation utilities
- `src/utils/__tests__/dateUtils.test.ts` - Date utils tests (11 tests)
- `src/utils/__tests__/idUtils.test.ts` - ID utils tests (8 tests)

## 🧪 Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## 📊 Current Test Status

**19/19 tests passing** ✅

- ✅ dateUtils: 11 tests
- ✅ idUtils: 8 tests

## 🎯 Next Steps for Code Consolidation

1. **Before each consolidation phase**, write tests for:
   - Utility functions you're creating
   - Shared components you're extracting

2. **Run tests after each change**:
   ```bash
   npm test
   ```

3. **Add tests as you create shared code**:
   - `src/utils/__tests__/colorUtils.test.ts`
   - `src/utils/__tests__/alertHelpers.test.ts`
   - `src/components/__tests__/CommonModal.test.tsx`
   - `src/components/__tests__/EmptyState.test.tsx`

## 📝 Writing Tests

### Utility Function Test Example

```typescript
// src/utils/__tests__/myUtil.test.ts
import { myFunction } from '../myUtil';

describe('myUtil', () => {
  describe('myFunction', () => {
    it('does what it should', () => {
      expect(myFunction('input')).toBe('expected output');
    });
  });
});
```

### Component Test Example (Future)

```typescript
// src/components/__tests__/MyComponent.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('handles button press', () => {
    const onPress = jest.fn();
    const { getByText } = render(<MyComponent onPress={onPress} />);
    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

## 🐛 Troubleshooting

### Tests failing with module errors?
- Check `jest.config.js` transformIgnorePatterns
- Make sure all dependencies are in node_modules

### Tests failing with timezone issues?
- Always use `setHours(0, 0, 0, 0)` when testing dates
- Use consistent date creation in tests

### Need to mock a module?
- Add mocks to `jest.setup.js`
- Or use `jest.mock()` in individual test files

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
