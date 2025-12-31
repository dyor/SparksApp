import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { RecordSwing } from "../RecordSwing";

// Mock expo-camera
// Mock expo-camera
jest.mock("expo-camera", () => {
  const React = require("react");

  // Scoped variable to handle recording promise resolution
  let stopRecordingCallback: (() => void) | null = null;

  const mockRecordAsync = jest.fn(async ({ maxDuration }) => {
    return new Promise((resolve) => {
      stopRecordingCallback = () => {
        resolve({ uri: "file://test-video.mp4" });
        stopRecordingCallback = null;
      };

      // If maxDuration is provided, simulate auto-stop
      if (maxDuration) {
        setTimeout(() => {
          if (stopRecordingCallback) stopRecordingCallback();
        }, maxDuration * 1000);
      }
    });
  });

  const mockStopRecording = jest.fn(() => {
    if (stopRecordingCallback) {
      stopRecordingCallback();
    }
  });

  const CameraView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      recordAsync: mockRecordAsync,
      stopRecording: mockStopRecording,
    }));
    return React.createElement("View", props, props.children);
  });

  return {
    CameraView,
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

// Mock expo-av
jest.mock("expo-av", () => ({
  Video: "Video",
  ResizeMode: { COVER: "cover" },
}));

// Mock expo-media-library
jest.mock("expo-media-library", () => ({
  usePermissions: () => [{ granted: true }, jest.fn()],
  createAssetAsync: jest.fn(() => Promise.resolve({ id: "asset-1" })),
  getAlbumAsync: jest.fn(() => Promise.resolve({ id: "album-1" })),
  addAssetsToAlbumAsync: jest.fn(() => Promise.resolve()),
  createAlbumAsync: jest.fn(() => Promise.resolve()),
}));

// Mock HapticFeedback
jest.mock("../../utils/haptics", () => ({
  HapticFeedback: {
    light: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("RecordSwing", () => {
  const mockOnRecordingComplete = jest.fn();
  const mockColors = {
    primary: "#007AFF",
    surface: "#FFFFFF",
    text: "#000000",
    textSecondary: "#666666",
    error: "#FF3B30",
  };

  const defaultProps = {
    holeNumber: 1,
    shotNumber: 2,
    club: "Driver",
    countdownSeconds: 5,
    durationSeconds: 30,
    onRecordingComplete: mockOnRecordingComplete,
    colors: mockColors,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Record Swing button", () => {
    const { getByText } = render(<RecordSwing {...defaultProps} />);
    expect(getByText(/Record Swing/)).toBeTruthy();
  });

  it("shows countdown when recording starts", async () => {
    jest.useFakeTimers();
    const { getByText, getByTestId } = render(
      <RecordSwing {...defaultProps} />
    );

    fireEvent.press(getByText(/Record Swing/));

    // Ensure countdown element appears
    await waitFor(() => {
      const el = getByTestId("countdown-text");
      expect(el).toBeTruthy();
      expect(String(el.props.children)).toMatch(/\d+/);
    });

    jest.useRealTimers();
  });

  it("updates countdown every second", async () => {
    jest.useFakeTimers();
    const { getByText, getByTestId } = render(
      <RecordSwing {...defaultProps} />
    );

    fireEvent.press(getByText(/Record Swing/));

    // Capture the initial countdown number and ensure it changes after advancing time
    await waitFor(() => expect(getByTestId("countdown-text")).toBeTruthy());
    const first = String(getByTestId("countdown-text").props.children);

    jest.advanceTimersByTime(1000);
    await waitFor(() =>
      expect(String(getByTestId("countdown-text").props.children)).not.toBe(
        first
      )
    );

    const second = String(getByTestId("countdown-text").props.children);
    jest.advanceTimersByTime(1000);
    await waitFor(() =>
      expect(String(getByTestId("countdown-text").props.children)).not.toBe(
        second
      )
    );

    jest.useRealTimers();
  });

  it("shows recording duration during recording", async () => {
    jest.useFakeTimers();
    const { getByText, getAllByTestId } = render(
      <RecordSwing {...defaultProps} />
    );

    fireEvent.press(getByText(/Record Swing/));

    // Wait for countdown to finish (5 seconds)
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(getAllByTestId("stop-recording-button").length).toBeGreaterThan(0);
    });

    jest.useRealTimers();
  });

  it("calls onRecordingComplete with metadata when recording finishes", async () => {
    jest.useFakeTimers();
    const { getByText, getByTestId } = render(
      <RecordSwing {...defaultProps} />
    );

    fireEvent.press(getByText(/Record Swing/));

    // Wait for countdown (5s) + some recording time
    jest.advanceTimersByTime(7000);

    // Stop recording
    await waitFor(() =>
      expect(getByTestId("stop-recording-button")).toBeTruthy()
    );
    const stopBtn = getByTestId("stop-recording-button");
    fireEvent.press(stopBtn);

    await waitFor(() => {
      expect(mockOnRecordingComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          holeNumber: 1,
          shotNumber: 2,
          club: "Driver",
          uri: expect.any(String),
          timestamp: expect.any(Number),
        })
      );
    });

    jest.useRealTimers();
  });

  it("auto-stops recording after duration seconds", async () => {
    jest.useFakeTimers();
    const { getByText, getAllByText } = render(
      <RecordSwing {...defaultProps} durationSeconds={10} />
    );

    fireEvent.press(getByText(/Record Swing/));

    // Wait for countdown (5s) + duration (10s)
    jest.advanceTimersByTime(15000);

    await waitFor(() => {
      expect(mockOnRecordingComplete).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it("displays thumbnail after recording", async () => {
    jest.useFakeTimers();
    const { getByText, getByTestId } = render(
      <RecordSwing {...defaultProps} />
    );

    // Start recording flow
    fireEvent.press(getByText(/Record Swing/));

    // Advance timers to finish countdown and some recording time
    jest.advanceTimersByTime(7000);

    // Stop recording
    await waitFor(() =>
      expect(getByTestId("stop-recording-button")).toBeTruthy()
    );
    const stopBtn = getByTestId("stop-recording-button");
    fireEvent.press(stopBtn);

    // Wait for thumbnail to appear
    await waitFor(() => {
      const thumbnail = getByTestId("video-thumbnail");
      expect(thumbnail).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it("shows correct shot info in thumbnail label", async () => {
    jest.useFakeTimers();
    const { getByText, getByTestId } = render(
      <RecordSwing {...defaultProps} />
    );

    // Start recording and finish
    fireEvent.press(getByText(/Record Swing/));
    jest.advanceTimersByTime(7000);
    await waitFor(() =>
      expect(getByTestId("stop-recording-button")).toBeTruthy()
    );
    const stopBtn = getByTestId("stop-recording-button");
    fireEvent.press(stopBtn);

    // After recording, should show shot info
    await waitFor(() => {
      expect(getByText(/Hole 1 Shot 2 - Driver/)).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it("uses custom countdown seconds from settings", async () => {
    jest.useFakeTimers();
    const { getByText, getByTestId } = render(
      <RecordSwing {...defaultProps} countdownSeconds={3} />
    );

    fireEvent.press(getByText(/Record Swing/));

    await waitFor(() => {
      const el = getByTestId("countdown-text");
      expect(String(el.props.children)).toBe("3");
    });

    jest.useRealTimers();
  });

  it("uses custom duration seconds from settings", async () => {
    jest.useFakeTimers();
    const { getByText } = render(
      <RecordSwing {...defaultProps} countdownSeconds={2} durationSeconds={5} />
    );

    fireEvent.press(getByText(/Record Swing/));

    // Wait for countdown (2s) + duration (5s)
    jest.advanceTimersByTime(7000);

    await waitFor(() => {
      expect(mockOnRecordingComplete).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });
});
