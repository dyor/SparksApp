/**
 * Mock LogBoxData to bypass missing file in expo-metro-runtime
 */

export const reportLogBoxError = (error: any, componentStack?: string) => {
    console.error('LogBox Error:', error, componentStack);
};

export const reportUnexpectedLogBoxError = (error: any, componentStack?: string) => {
    console.error('Unexpected LogBox Error:', error, componentStack);
};

export const isLogBoxErrorMessage = (message: string) => false;
export const isMessageIgnored = (message: string) => false;
export const addLog = (log: any) => { };
export const addException = (error: any) => { };
export const symbolicateLogNow = (type: any, log: any) => { };
export const retrySymbolicateLogNow = (type: any, log: any) => { };
export const symbolicateLogLazy = (type: any, log: any) => { };
export const clear = () => { };
export const setSelectedLog = (index: number) => { };
export const clearWarnings = () => { };
export const clearErrors = () => { };
export const dismiss = (log: any) => { };
export const getIgnorePatterns = () => [];
export const addIgnorePatterns = (patterns: any[]) => { };
export const setDisabled = (value: boolean) => { };
export const isDisabled = () => false;
export const observe = (observer: any) => ({ unsubscribe: () => { } });
export const withSubscription = (WrappedComponent: any) => WrappedComponent;

export default {
    reportLogBoxError,
    reportUnexpectedLogBoxError,
    isLogBoxErrorMessage,
    isMessageIgnored,
    addLog,
    addException,
    symbolicateLogNow,
    retrySymbolicateLogNow,
    symbolicateLogLazy,
    clear,
    setSelectedLog,
    clearWarnings,
    clearErrors,
    dismiss,
    getIgnorePatterns,
    addIgnorePatterns,
    setDisabled,
    isDisabled,
    observe,
    withSubscription,
};
