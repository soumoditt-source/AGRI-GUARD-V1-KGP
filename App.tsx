import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Scan, Map, Sprout, MessageSquare, Users, Volume2, VolumeX, Leaf } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import FieldArchitect from './components/FieldArchitect';
import SoilHealth from './components/SoilHealth';
import ChatCoach from './components/ChatCoach';
import { AppMode, Language, UserProfile, WeatherData } from './types';
import { MOCK_USER, TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LOGIN);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [user, setUser] = useState<UserProfile>(MOCK_USER);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const hasGreeted = useRef(false);

  // --- TTS LOGIC ---
  const speak = (text: string, force = false) => {
    if (!voiceEnabled && !force) return;
    window.speechSynthesis.cancel(); // Stop previous
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to match language code
    const langCode = language === Language.HINDI ? 'hi-IN' : 
                     language === Language.BENGALI ? 'bn-IN' :
                     language === Language.TAMIL ? 'ta-IN' :
                     'en-US';
    utterance.lang = langCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const t = TRANSLATIONS[language];
    if (hour < 12) return t.greeting_morning;
    if (hour < 18) return t.greeting_afternoon;
    return t.greeting_evening;
  };

  // --- STATE ---
  const [weather, setWeather] = useState<WeatherData>({
    temp: 28,
    humidity: 65,
    condition: "Sunny",
    windSpeed: 12,
    forecast: "Clear skies expected"
  });

  // Load Persistence
  useEffect(() => {
    const savedUser = localStorage.getItem('agri_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setMode(AppMode.DASHBOARD);
    }
    const savedLang = localStorage.getItem('agri_lang');
    if (savedLang) {
      setLanguage(savedLang as Language);
    }
  }, []);

  // Trigger Greeting on Dashboard Load
  useEffect(() => {
    if (mode === AppMode.DASHBOARD && !hasGreeted.current) {
      const t = TRANSLATIONS[language];
      const greeting = `${getGreeting()}, ${user.name.split(' ')[0]}. ${t.tutorial_intro}`;
      
      // Small delay to allow UI to render
      setTimeout(() => speak(greeting, true), 1000);
      hasGreeted.current = true;
    }
  }, [mode, language]);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setMode(AppMode.DASHBOARD);
    localStorage.setItem('agri_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setMode(AppMode.LOGIN);
    localStorage.removeItem('agri_user');
    hasGreeted.current = false;
  }

  const NavItem: React.FC<{ icon: React.ElementType, label: string, target: AppMode }> = ({ icon: Icon, label, target }) => (
    <button
      onClick={() => setMode(target)}
      className={`flex flex-col items-center justify-center p-2 w-full transition-all active:scale-95 ${
        mode === target ? 'text-emerald-600 bg-emerald-50 rounded-xl shadow-sm' : 'text-gray-400 hover:text-emerald-600'
      }`}
    >
      <Icon className={`w-6 h-6 mb-1 ${mode === target ? 'animate-bounce-subtle' : ''}`} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );

  if (mode === AppMode.LOGIN) {
    return <Login onLogin={handleLogin} language={language} setLanguage={(l) => { setLanguage(l); localStorage.setItem('agri_lang', l); }} />;
  }

  const t = TRANSLATIONS[language];

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-[100vw] overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white border-b border-gray-100 shadow-sm z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 blur-sm"></div>
            <Leaf size={24} className="relative z-10" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-none text-lg">AgriGuard</h1>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Kshitij 2026 • Soumoditya Das
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setVoiceEnabled(!voiceEnabled)}
             className={`p-2 rounded-full transition-colors ${voiceEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
          >
             {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <img src={user.avatar} alt="User" className="w-9 h-9 rounded-full border-2 border-emerald-100" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative animate-fade-in">
        {mode === AppMode.DASHBOARD && <Dashboard user={user} weather={weather} language={language} />}
        {mode === AppMode.SCANNER && <Scanner language={language} />}
        {mode === AppMode.FIELD_ARCHITECT && <FieldArchitect language={language} />}
        {mode === AppMode.SOIL_LAB && <SoilHealth language={language} />}
        {mode === AppMode.CHAT_COACH && <ChatCoach language={language} />}
        {mode === AppMode.COMMUNITY && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <Users className="w-16 h-16 mb-4 opacity-50" />
             <h2 className="text-xl font-bold">Community Forum</h2>
             <p className="text-sm">Coming in Next Update</p>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="bg-white border-t border-gray-100 pb-safe pt-2 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          <NavItem icon={LayoutDashboard} label={t.dashboard} target={AppMode.DASHBOARD} />
          <NavItem icon={Scan} label={t.scanner} target={AppMode.SCANNER} />
          <NavItem icon={Map} label={t.field} target={AppMode.FIELD_ARCHITECT} />
          <NavItem icon={Sprout} label={t.soil} target={AppMode.SOIL_LAB} />
          <NavItem icon={MessageSquare} label={t.coach} target={AppMode.CHAT_COACH} />
        </div>
      </nav>
    </div>
  );
};

export default App;