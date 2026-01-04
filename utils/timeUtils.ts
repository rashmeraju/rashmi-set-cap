import { SubtitleSegment } from '../types';

/**
 * Converts seconds to "MM:SS.mmm" format (used for display and Gemini prompting).
 */
export const formatTime = (seconds: number): string => {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  const mmm = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${mm}:${ss}.${mmm}`;
};

/**
 * Converts seconds to SRT time format "HH:MM:SS,mmm".
 */
export const formatSrtTime = (seconds: number): string => {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  const hh = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  const mmm = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${hh}:${mm}:${ss},${mmm}`;
};

/**
 * Parses "MM:SS.mmm" or "HH:MM:SS,mmm" string to seconds.
 */
export const parseTimeString = (timeString: string): number => {
  if (!timeString) return 0;
  
  // Replace comma with dot for standard parsing if coming from SRT
  const normalized = timeString.replace(',', '.');
  const parts = normalized.split(':');
  
  let seconds = 0;
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    seconds += parseInt(parts[0], 10) * 3600;
    seconds += parseInt(parts[1], 10) * 60;
    seconds += parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS.mmm
    seconds += parseInt(parts[0], 10) * 60;
    seconds += parseFloat(parts[1]);
  }
  
  return seconds;
};

/**
 * Generates SRT file content from segments.
 */
export const generateSrt = (segments: SubtitleSegment[]): string => {
  return segments
    .map((seg, index) => {
      return `${index + 1}\n${formatSrtTime(seg.startTime)} --> ${formatSrtTime(seg.endTime)}\n${seg.text.trim()}\n`;
    })
    .join('\n');
};

/**
 * Parses SRT file content to segments.
 */
export const parseSrt = (srtContent: string): SubtitleSegment[] => {
  const segments: SubtitleSegment[] = [];
  // Normalize line endings
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');

  blocks.forEach((block) => {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      // Line 1: Index (ignored)
      // Line 2: Timecode
      const timecode = lines[1];
      const [startStr, endStr] = timecode.split(' --> ');
      
      // Line 3+: Text (joined)
      const text = lines.slice(2).join(' ');

      if (startStr && endStr) {
        segments.push({
          id: crypto.randomUUID(),
          startTime: parseTimeString(startStr),
          endTime: parseTimeString(endStr),
          text: text,
        });
      }
    }
  });

  return segments;
};
