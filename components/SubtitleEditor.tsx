
import React, { useRef, useEffect, useMemo } from 'react';
import { SubtitleSegment } from '../types';
import { formatTime } from '../utils/timeUtils';

interface SubtitleEditorProps {
  subtitles: SubtitleSegment[];
  currentTime: number;
  duration: number;
  onUpdateSubtitle: (id: string, newText: string) => void;
  onSeek: (time: number) => void;
  onDelete: (id: string) => void;
  accentColor?: string;
}

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  currentTime,
  duration,
  onUpdateSubtitle,
  onSeek,
  onDelete,
  accentColor = 'brand'
}) => {
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  const stats = useMemo(() => {
    if (subtitles.length === 0 || duration === 0