
/**
 * Helper to write a string into a DataView
 */
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts an ArrayBuffer to a Base64 string in a memory-efficient way.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    // Use spread operator only on manageable chunks
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Extracts audio data from a video/audio file and converts it to a valid WAV base64 string.
 * Resamples to 16kHz Mono.
 */
export const extractAudioBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000, 
  });

  let audioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    throw new Error("Failed to decode audio data. Ensure the file is a valid video or audio format.");
  }
  
  // Render offline to resample and mix down to mono
  const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  const renderedBuffer = await offlineContext.startRendering();
  const channelData = renderedBuffer.getChannelData(0); 

  // Create WAV file structure (44 bytes header + PCM data)
  const buffer = new ArrayBuffer(44 + channelData.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + channelData.length * 2, true); 
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, 16000, true); 
  view.setUint32(28, 16000 * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, channelData.length * 2, true); 

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); 
    offset += 2;
  }

  return arrayBufferToBase64(buffer);
};
