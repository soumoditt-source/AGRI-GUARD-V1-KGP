import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle, X, Sprout, Shield } from 'lucide-react';
import { analyzeCropImage } from '../services/geminiService';
import { PestDetection, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface ScannerProps {
  language: Language;
}

const Scanner: React.FC<ScannerProps> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<PestDetection[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Start Camera
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setImage(dataUrl);
    handleAnalysis(dataUrl);
    stopCamera();
  };

  const handleAnalysis = async (base64Data: string) => {
    setAnalyzing(true);
    setResults([]);
    try {
      // Convert base64 to simple string for API part (remove header)
      const base64Content = base64Data.split(',')[1];
      const data = await analyzeCropImage(base64Content, language);
      setResults(data.detections);
    } catch (err) {
      setError("Failed to analyze image. Check internet.");
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResults([]);
    setError(null);
    startCamera();
  };

  // Helper to render bounding boxes over the image
  const renderOverlays = () => {
    return results.map((det) => {
      const [ymin, xmin, ymax, xmax] = det.bbox;
      // Convert 0-1000 scale to percentage
      const top = ymin / 10;
      const left = xmin / 10;
      const width = (xmax - xmin) / 10;
      const height = (ymax - ymin) / 10;

      const borderColor = det.severity === 'critical' ? 'border-red-500 animate-pulse-red' 
                        : det.severity === 'high' ? 'border-orange-500' 
                        : 'border-yellow-500';

      return (
        <div
          key={det.id}
          className={`absolute border-2 ${borderColor} rounded bg-black/10`}
          style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
        >
          <div className="absolute -top-6 left-0 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap flex items-center gap-1">
             <span className="font-bold">{det.name}</span>
             <span className="text-gray-300">({Math.round(det.confidence * 100)}%)</span>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
           <Camera className="w-5 h-5 text-emerald-400" /> {t.scanner}
        </h2>
        {image && (
          <button onClick={reset} className="p-2 bg-white/20 rounded-full text-white backdrop-blur">
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex items-center justify-center">
        {!image ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute w-full h-full object-cover"
            />
            {/* AR Guide Frame */}
            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative z-10 flex items-center justify-center">
               <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1"></div>
               <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1"></div>
               <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1"></div>
               <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1"></div>
               {error && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center">
                   <p className="text-red-400">{error}</p>
                 </div>
               )}
            </div>
            
            <div className="absolute bottom-10 z-20">
              <button 
                onClick={captureImage}
                className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-emerald-500 rounded-full"></div>
              </button>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full bg-gray-900">
            <img src={image} alt="Captured" className="w-full h-full object-contain" />
            {renderOverlays()}
            {analyzing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-white font-semibold animate-pulse">{t.analyzing}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Panel */}
      {results.length > 0 && (
        <div className="bg-white rounded-t-2xl p-6 shadow-2xl relative z-40 max-h-[50vh] overflow-y-auto animate-slide-up">
           <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
           <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
             <AlertTriangle className="w-5 h-5 text-orange-500" /> Diagnosis Report
           </h3>
           <div className="space-y-4">
             {results.map((det) => (
               <div key={det.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">{det.name}</h4>
                      <p className="text-xs text-gray-500 italic">{det.scientificName}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                      det.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      det.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {det.severity}
                    </span>
                  </div>
                  
                  {/* Lifecycle Insight */}
                  <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2 rounded mb-3">
                     <Sprout size={16} />
                     <span className="font-semibold">Stage: {det.lifecycle}</span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-bold text-gray-700 flex items-center gap-1"><Shield size={14}/> {t.organic}:</p>
                      <p className="text-gray-600 pl-5">{det.treatment.organic}</p>
                    </div>
                    <div>
                       <p className="font-bold text-gray-700 flex items-center gap-1"><AlertTriangle size={14}/> {t.chemical}:</p>
                       <p className="text-gray-600 pl-5">{det.treatment.chemical}</p>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                       <p className="font-bold text-emerald-800 mb-1">IPM Strategy (Long-term):</p>
                       <p className="text-emerald-700 text-xs">{det.treatment.prevention}</p>
                    </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}
      {!analyzing && image && results.length === 0 && (
         <div className="absolute bottom-10 left-0 right-0 flex justify-center z-40">
            <div className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
               <CheckCircle size={18} /> {t.healthy}
            </div>
         </div>
      )}
    </div>
  );
};

export default Scanner;