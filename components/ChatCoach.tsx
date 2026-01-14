import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Bot, User as UserIcon, Volume2, StopCircle, Globe, Map as MapIcon, Brain, Zap, Phone, Radio } from 'lucide-react';
import { queryGemini, transcribeAudio, createLiveSession, ChatMode } from '../services/geminiService';
import { ChatMessage, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { LiveServerMessage } from '@google/genai';

interface ChatCoachProps {
  language: Language;
}

// Audio Helpers for Live API
const floatTo16BitPCM = (input: Float32Array) => {
  let output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
};

const base64EncodeAudio = (float32Array: Float32Array) => {
  const int16Array = floatTo16BitPCM(float32Array);
  let binary = '';
  const bytes = new Uint8Array(int16Array.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const ChatCoach: React.FC<ChatCoachProps> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: t.welcome + "! " + t.tagline, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('standard');
  const [location, setLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  
  // Transcription State
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live API State
  const [isLive, setIsLive] = useState(false);
  const [isConnectingLive, setIsConnectingLive] = useState(false);
  const [liveVolume, setLiveVolume] = useState(0); // Visualization
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveInputContextRef = useRef<AudioContext | null>(null);
  const liveOutputContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Get Location on Mount for Maps
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Loc unavailable", err)
      );
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // --- STANDARD CHAT HANDLER ---
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // PASS LANGUAGE TO SERVICE
      const response = await queryGemini(userMsg.text, mode, location, language);
      
      let botText = response.text;
      
      // Append Grounding Info
      if (response.grounding) {
         if (mode === 'search') {
           const links = response.grounding.map((c: any) => c.web?.uri).filter(Boolean);
           if (links.length > 0) botText += `\n\nSources:\n${links.map((l: string) => `- ${l}`).join('\n')}`;
         } else if (mode === 'maps') {
           const places = response.grounding.map((c: any) => c.maps?.title).filter(Boolean);
           if (places.length > 0) botText += `\n\nPlaces Found: ${places.join(', ')}`;
         }
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: "Error connecting to AI. Please try again or check API Key.",
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // --- TRANSCRIPTION HANDLER ---
  const toggleTranscription = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            setLoading(true);
            try {
              const text = await transcribeAudio(base64Audio);
              setInput(prev => prev + " " + text);
            } catch (e) {
              console.error("Transcription failed", e);
            } finally {
              setLoading(false);
            }
          };
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setRecording(true);
      } catch (err) {
        alert("Microphone access denied");
      }
    }
  };

  // --- LIVE API HANDLER ---
  const startLiveSession = async () => {
    try {
      setIsConnectingLive(true);
      
      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      liveInputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      liveOutputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const session = await createLiveSession({
        onopen: () => {
          setIsConnectingLive(false);
          setIsLive(true);
          
          // Setup Input Processing
          if (!liveInputContextRef.current) return;
          sourceRef.current = liveInputContextRef.current.createMediaStreamSource(stream);
          processorRef.current = liveInputContextRef.current.createScriptProcessor(4096, 1, 1);
          
          processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            // Visualization volume
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            setLiveVolume(Math.sqrt(sum / inputData.length));

            const base64Data = base64EncodeAudio(inputData);
            session.sendRealtimeInput({
               media: { mimeType: 'audio/pcm;rate=16000', data: base64Data }
            });
          };
          
          sourceRef.current.connect(processorRef.current);
          processorRef.current.connect(liveInputContextRef.current.destination);
        },
        onmessage: async (msg: LiveServerMessage) => {
          const pcmData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (pcmData && liveOutputContextRef.current) {
             const binaryString = atob(pcmData);
             const len = binaryString.length;
             const bytes = new Uint8Array(len);
             for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
             
             const float32Data = new Float32Array(bytes.length / 2);
             const dataView = new DataView(bytes.buffer);
             for (let i = 0; i < bytes.length / 2; i++) {
               float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
             }
             
             const buffer = liveOutputContextRef.current.createBuffer(1, float32Data.length, 24000);
             buffer.getChannelData(0).set(float32Data);
             
             const source = liveOutputContextRef.current.createBufferSource();
             source.buffer = buffer;
             source.connect(liveOutputContextRef.current.destination);
             
             const currentTime = liveOutputContextRef.current.currentTime;
             if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
             source.start(nextStartTimeRef.current);
             nextStartTimeRef.current += buffer.duration;
          }
        },
        onclose: () => {
           setIsLive(false);
           cleanupLiveSession();
        },
        onerror: (e) => {
          console.error(e);
          setIsLive(false);
          cleanupLiveSession();
        }
      });
      
      liveSessionRef.current = session;

    } catch (e) {
      console.error("Failed to start live session", e);
      setIsConnectingLive(false);
    }
  };

  const cleanupLiveSession = () => {
    liveSessionRef.current?.close();
    sourceRef.current?.disconnect();
    processorRef.current?.disconnect();
    liveInputContextRef.current?.close();
    liveOutputContextRef.current?.close();
    liveSessionRef.current = null;
    setIsLive(false);
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header with Mode Toggles */}
      <div className="bg-white p-2 border-b border-gray-200 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex gap-2">
           <button 
             onClick={() => setMode('standard')}
             className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${mode === 'standard' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500'}`}
           >
             <Bot size={16} /> Chat
           </button>
           <button 
             onClick={() => setMode('lite')}
             className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${mode === 'lite' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500'}`}
           >
             <Zap size={16} /> Fast
           </button>
           <button 
             onClick={() => setMode('thinking')}
             className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${mode === 'thinking' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}
           >
             <Brain size={16} /> Deep
           </button>
           <button 
             onClick={() => setMode('search')}
             className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${mode === 'search' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
           >
             <Globe size={16} /> Web
           </button>
           <button 
             onClick={() => setMode('maps')}
             className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${mode === 'maps' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}
           >
             <MapIcon size={16} /> Maps
           </button>
        </div>
        <button 
          onClick={startLiveSession}
          className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg hover:bg-red-600 animate-pulse"
        >
          <Phone size={14} /> LIVE
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] uppercase tracking-wider font-bold">
                {msg.sender === 'user' ? <UserIcon size={10} /> : <Bot size={10} />}
                <span>{msg.sender === 'user' ? 'You' : 'AgriGuard'}</span>
              </div>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2 items-center">
          <button
            onClick={toggleTranscription}
            className={`p-3 rounded-full transition-all ${
              recording ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {recording ? <StopCircle size={20} /> : <Mic size={20} />}
          </button>
          
          <div className="flex-1 relative">
             <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={recording ? "Listening..." : mode === 'maps' ? "Ask for locations..." : "Ask your AI Agronomist..."}
              className="w-full bg-gray-100 border-0 rounded-full py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
              disabled={recording}
            />
            <div className="absolute right-3 top-3 text-gray-400">
              {mode === 'search' && <Globe size={16} />}
              {mode === 'maps' && <MapIcon size={16} />}
              {mode === 'thinking' && <Brain size={16} />}
              {mode === 'lite' && <Zap size={16} />}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Live Overlay */}
      {(isLive || isConnectingLive) && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8">
           {isConnectingLive ? (
             <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
           ) : (
             <>
               <div className="relative mb-8">
                  <div className={`w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center transition-transform duration-100`} style={{ transform: `scale(${1 + liveVolume * 5})` }}>
                    <Radio size={48} />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-300 animate-ping opacity-20"></div>
               </div>
               <h2 className="text-2xl font-bold mb-2">AgriGuard Live</h2>
               <p className="text-gray-400 mb-8">Listening...</p>
               <button 
                 onClick={cleanupLiveSession}
                 className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold text-lg shadow-2xl flex items-center gap-3"
               >
                 <Phone size={24} className="rotate-[135deg]" /> End Call
               </button>
             </>
           )}
        </div>
      )}
    </div>
  );
};

export default ChatCoach;