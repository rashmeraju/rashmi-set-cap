
export interface SubtitleSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  EXTRACTING_AUDIO = 'EXTRACTING_AUDIO',
  GENERATING_SUBTITLES = 'GENERATING_SUBTITLES',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum TaskType {
  TRANSLATE = 'TRANSLATE', // Kannada -> English
  CAPTION = 'CAPTION',     // English -> English
}

export interface ProcessingState {
  status: ProcessingStatus;
  message?: string;
}

export interface GeminiResponseItem {
  start: string; // Format "MM:SS.mmm"
  end: string;   // Format "MM:SS.mmm"
  text: string;
}
