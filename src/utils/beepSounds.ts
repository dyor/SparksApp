// Generates short sine-wave WAV tones as data URIs so we can play F1-style
// countdown beeps without bundling audio asset files.
//
// Used by src/components/RecordSwing.tsx — the last three seconds of the
// pre-recording countdown emit low beeps, and recording start emits a higher
// BEEP. Pattern matches "beep beep beep BEEP" so the user can swing without
// looking at the screen.

const SAMPLE_RATE = 22050;

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function generateToneWav(frequencyHz: number, durationMs: number): ArrayBuffer {
  const numSamples = Math.floor((durationMs / 1000) * SAMPLE_RATE);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF / WAVE header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // 5ms linear fade in/out so we don't get clicks at the edges
  const fadeSamples = Math.floor((5 / 1000) * SAMPLE_RATE);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let envelope = 1;
    if (i < fadeSamples) envelope = i / fadeSamples;
    else if (i > numSamples - fadeSamples) envelope = (numSamples - i) / fadeSamples;
    const sample = Math.sin(2 * Math.PI * frequencyHz * t) * envelope * 0.7;
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }

  return buffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Build a binary string in chunks to avoid blowing the call-stack on
  // String.fromCharCode(...bytes) for large buffers (we're well under that
  // here, but stay safe).
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return (globalThis as any).btoa(binary);
}

function makeBeepUri(frequencyHz: number, durationMs: number): string {
  return 'data:audio/wav;base64,' + bufferToBase64(generateToneWav(frequencyHz, durationMs));
}

// 800 Hz / 120 ms — short, low-pitched tick.
export const COUNTDOWN_LOW_BEEP_URI = makeBeepUri(800, 120);

// 1200 Hz / 280 ms — longer, higher-pitched "GO" tone.
export const COUNTDOWN_HIGH_BEEP_URI = makeBeepUri(1200, 280);
