
import React, { useState, useRef, useCallback, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import SubtitleEditor from './components/SubtitleEditor';
import { SubtitleSegment, ProcessingState, ProcessingStatus, TaskType } from './types';
import { generateSrt, parseSrt, formatTime } from './utils/timeUtils';
import { extractAudioBase64 } from './utils/audioUtils';
import { generateSubtitles } from './services/geminiService';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: ProcessingStatus.IDLE });
  const [duration, setDuration] = useState<number>(0);
  const [taskMode, setTaskMode] = useState<TaskType>(TaskType.CAPTION); // Defaulting to CAPTION for the user
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsAuthorized(hasKey);
      }
    };
    checkAuth();
  }, []);

  const handleConnectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setIsAuthorized(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setSubtitles([]);
    setDuration(0);
    setProcessingState({ status: ProcessingStatus.IDLE });
  };

  const handleGenerateSubtitles = async () => {
    if (!videoFile || duration === 0) {
      setProcessingState({ status: ProcessingStatus.ERROR, message: "Please load media first." });
      return;
    }

    try {
      setProcessingState({ status: ProcessingStatus.EXTRACTING_AUDIO, message: "Isolating voice frequencies..." });
      const audioBase64 = await extractAudioBase64(videoFile);
      
      const branding = taskMode === TaskType.TRANSLATE ? "Rashmi TRANSLATE" : "CGN CAP";
      setProcessingState({ 
        status: ProcessingStatus.GENERATING_SUBTITLES, 
        message: `${branding}: Syncing ${formatTime(duration)} with voice-onset precision...` 
      });
      
      const generatedSegments = await generateSubtitles(audioBase64, duration, taskMode);
      setSubtitles(generatedSegments);
      setProcessingState({ status: ProcessingStatus.COMPLETED });

    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        setIsAuthorized(false);
      }
      setProcessingState({ 
        status: ProcessingStatus.ERROR, 
        message: error.message || "An error occurred during generation."
      });
    }
  };

  const handleDownloadSrt = () => {
    if (subtitles.length === 0) return;
    const srtContent = generateSrt(subtitles);
    const blob = new Blob([srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const prefix = taskMode === TaskType.TRANSLATE ? "rashmi" : "cgn";
    a.href = url;
    a.download = videoFile ? `${videoFile.name.split('.')[0]}_${prefix}.srt` : `${prefix}_subtitles.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadSrt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const parsed = parseSrt(content);
          setSubtitles(parsed);
          setProcessingState({ status: ProcessingStatus.COMPLETED });
        } catch (err) {
          setProcessingState({ status: ProcessingStatus.ERROR, message: "Failed to parse SRT file." });
        }
      }
    };
    reader.readAsText(file);
    if (srtInputRef.current) srtInputRef.current.value = '';
  };

  const updateSubtitle = useCallback((id: string, newText: string) => {
    setSubtitles(prev => prev.map(s => s.id === id ? { ...s, text: newText } : s));
  }, []);

  const deleteSubtitle = useCallback((id: string) => {
    setSubtitles(prev => prev.filter(s => s.id !== id));
  }, []);

  const activeBrandingSuffix = taskMode === TaskType.TRANSLATE ? "TRANSLATE" : "CAP";
  const activeBrandingPrefix = taskMode === TaskType.TRANSLATE ? "Rashmi" : "CGN";
  const themeColor = taskMode === TaskType.TRANSLATE ? "brand" : "indigo";
  const themeBg = taskMode === TaskType.TRANSLATE ? "bg-brand-600" : "bg-indigo-600";
  const themeHover = taskMode === TaskType.TRANSLATE ? "hover:bg-brand-500" : "hover:bg-indigo-500";
  const themeText = taskMode === TaskType.TRANSLATE ? "text-brand-500" : "text-indigo-400";
  const themeShadow = taskMode === TaskType.TRANSLATE ? "shadow-brand-600/20" : "shadow-indigo-600/20";

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-600/10 via-transparent to-transparent opacity-50"></div>
        <div className="z-10 flex flex-col items-center max-w-lg text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-2xl shadow-indigo-500/20 mb-10 animate-pulse">R</div>
          <h1 className="text-4xl font-black tracking-tighter mb-4 italic">Rashmi <span className="text-brand-500 not-italic">SET</span></h1>
          <p className="text-gray-400 text-lg font-medium leading-relaxed mb-8">
            The professional AI suite featuring <span className="text-brand-400 font-bold">Rashmi TRANSLATE</span> and <span className="text-indigo-400 font-bold">CGN CAP</span>. 
            Connect your project to generate high-precision subtitles.
          </p>
          <button 
            onClick={handleConnectKey}
            className="px-12 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black tracking-widest uppercase text-sm shadow-2xl shadow-brand-600/40 transition-all hover:scale-105 active:scale-95 mb-6"
          >
            Enter Workspace
          </button>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
            Powered by Gemini 3 Pro <span className="mx-2">•</span> <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">Billing Docs</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-gray-950 text-white font-sans selection:bg-${themeColor}-500/30`}>
      <header className="h-14 border-b border-gray-800 bg-gray-900/40 backdrop-blur-lg flex items-center justify-between px-6 z-20">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 bg-gradient-to-br ${taskMode === TaskType.TRANSLATE ? 'from-brand-500 to-brand-700' : 'from-indigo-500 to-indigo-700'} rounded-lg flex items-center justify-center font-black shadow-lg shadow-indigo-500/10`}>
            {activeBrandingPrefix[0]}
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter">
              {activeBrandingPrefix} <span className={themeText}>{activeBrandingSuffix}</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
           <div className="bg-gray-800/80 p-0.5 rounded-lg border border-gray-700 flex shadow-inner">
             <button 
               onClick={() => setTaskMode(TaskType.TRANSLATE)}
               className={`px-4 py-1 rounded-md text-[10px] font-black tracking-widest transition-all ${taskMode === TaskType.TRANSLATE ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
             >
               TRANSLATE
             </button>
             <button 
               onClick={() => setTaskMode(TaskType.CAPTION)}
               className={`px-4 py-1 rounded-md text-[10px] font-black tracking-widest transition-all ${taskMode === TaskType.CAPTION ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
             >
               CGN CAP
             </button>
           </div>
           
           <div className={`hidden sm:flex items-center px-2 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded-md text-[9px] font-black text-emerald-400 uppercase tracking-widest`}>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
             G3P PRO
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <VideoPlayer 
            videoFile={videoFile} 
            subtitles={subtitles} 
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setDuration}
          />
          
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center w-full sm:w-auto">
              <input type="file" accept="video/*,audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-black tracking-widest uppercase transition-all border border-gray-700 flex items-center justify-center active:scale-95 shadow-lg"
              >
                <svg className="w-4 h-4 mr-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Import
              </button>
            </div>

            <button 
              onClick={handleGenerateSubtitles}
              disabled={!videoFile || processingState.status === ProcessingStatus.EXTRACTING_AUDIO || processingState.status === ProcessingStatus.GENERATING_SUBTITLES}
              className={`w-full sm:w-auto px-10 py-2.5 rounded-xl text-xs font-black tracking-[0.2em] transition-all flex items-center justify-center uppercase shadow-xl ${
                !videoFile || processingState.status === ProcessingStatus.EXTRACTING_AUDIO || processingState.status === ProcessingStatus.GENERATING_SUBTITLES
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                  : `${themeBg} ${themeHover} text-white ${themeShadow} active:scale-95`
              }`}
            >
              {processingState.status === ProcessingStatus.GENERATING_SUBTITLES ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Syncing...
                </span>
              ) : (
                `Generate ${activeBrandingPrefix} ${activeBrandingSuffix}`
              )}
            </button>
          </div>

          {(processingState.status === ProcessingStatus.EXTRACTING_AUDIO || processingState.status === ProcessingStatus.GENERATING_SUBTITLES) && (
            <div className={`bg-${themeColor}-500/5 border border-${themeColor}-500/20 px-4 py-3 rounded-xl flex items-center animate-pulse`}>
              <div className={`w-2 h-2 rounded-full bg-${themeColor}-500 mr-3`}></div>
              <p className={`text-[10px] font-black uppercase tracking-widest text-${themeColor}-300`}>{processingState.message}</p>
            </div>
          )}

          {processingState.status === ProcessingStatus.ERROR && (
             <div className="bg-red-500/5 border border-red-500/20 px-4 py-3 rounded-xl flex items-center">
              <span className="text-red-400 mr-3">⚠️</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-300">{processingState.message}</p>
           </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden backdrop-blur-xl">
            <div className="p-3 border-b border-gray-800 flex space-x-2 bg-gray-900/60">
               <input type="file" accept=".srt" ref={srtInputRef} onChange={handleLoadSrt} className="hidden" />
               <button onClick={() => srtInputRef.current?.click()} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 rounded-lg text-[9px] border border-gray-700 font-black uppercase tracking-widest transition-all">Import SRT</button>
               <button 
                 onClick={handleDownloadSrt} 
                 disabled={subtitles.length === 0} 
                 className={`flex-1 py-2 ${themeBg} ${themeHover} disabled:bg-gray-800 disabled:text-gray-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg ${themeShadow}`}
               >
                 Export SRT
               </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <SubtitleEditor 
                subtitles={subtitles} 
                currentTime={currentTime}
                duration={duration}
                onUpdateSubtitle={updateSubtitle}
                onSeek={setCurrentTime}
                onDelete={deleteSubtitle}
                accentColor={themeColor}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
