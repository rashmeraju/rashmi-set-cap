
import React, { useEffect, useRef, useState } from 'react';
import { SubtitleSegment } from '../types';

interface VideoPlayerProps {
  videoFile: File | null;
  subtitles: SubtitleSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoFile, 
  subtitles, 
  currentTime, 
  onTimeUpdate,
  onDurationChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const [isAudio, setIsAudio] = useState(false);

  useEffect(() => {
    if (videoFile) {
      setIsAudio(videoFile.type.startsWith('audio/'));
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
      const url = URL.createObjectURL(videoFile);
      videoUrlRef.current = url;
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
      }
    }
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, [videoFile]);

  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && onDurationChange) {
      onDurationChange(videoRef.current.duration);
    }
  };

  const currentSubtitle = subtitles.find(
    seg => currentTime >= seg.startTime && currentTime <= seg.endTime
  );

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col group">
      {videoFile ? (
        <>
          {isAudio && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-0">
               <div className="flex flex-col items-center animate-pulse">
                  <svg className="w-24 h-24 text-brand-500 opacity-40 mb-4" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                  <div className="flex space-x-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-1 bg-brand-500/50 rounded-full h-8 animate-bounce" style={{animationDelay: `${i*0.1}s`}}></div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          <video
            ref={videoRef}
            className={`w-full h-full object-contain relative z-10 ${isAudio ? 'h-14 absolute bottom-0 opacity-90' : ''}`}
            controls
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          >
            Your browser does not support the video tag.
          </video>

          {/* Subtitle Overlay for Video */}
          {!isAudio && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none px-6 z-20">
              {currentSubtitle && (
                <div className="bg-black/80 text-white px-6 py-2.5 text-center rounded-lg text-lg md:text-xl lg:text-2xl font-bold shadow-2xl backdrop-blur-sm transition-all duration-75 leading-snug border border-white/10 max-w-[90%] whitespace-pre-wrap font-sans tracking-tight">
                  {currentSubtitle.text}
                </div>
              )}
            </div>
          )}

          {/* Subtitle Display for Audio */}
          {isAudio && currentSubtitle && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 px-12 pb-20">
               <div className="bg-gray-800/90 text-white px-10 py-6 text-center rounded-3xl text-2xl md:text-4xl font-bold shadow-2xl backdrop-blur-xl border border-gray-700/50 max-w-[85%] leading-tight whitespace-pre-wrap font-sans">
                  {currentSubtitle.text}
               </div>
             </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-600 z-10 p-10 text-center">
          <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800">
            <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-400">Rashmi SET Player</h3>
          <p className="text-sm mt-2 max-w-xs">Upload a video or audio file to start generating subtitles with Gemini 3 Pro</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
