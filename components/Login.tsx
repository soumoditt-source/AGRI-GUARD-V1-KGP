import React, { useState } from 'react';
import { User, Lock, Globe, MapPin, Briefcase } from 'lucide-react';
import { Language, UserProfile } from '../types';
import { TRANSLATIONS } from '../constants';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, language, setLanguage }) => {
  const t = TRANSLATIONS[language];
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: 'Rajesh Kumar',
    location: 'Pune, Maharashtra',
    role: 'Farmer' as const,
    phone: '9876543210',
    password: 'password'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate Network Request
    setTimeout(() => {
      setLoading(false);
      
      // Create User Profile from Input
      const newUser: UserProfile = {
        name: formData.name,
        location: formData.location,
        role: formData.role as any,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${formData.name}`,
        stats: {
          fields: Math.floor(Math.random() * 5) + 1,
          scans: Math.floor(Math.random() * 200),
          actionsPending: Math.floor(Math.random() * 5)
        }
      };

      onLogin(newUser);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-700 to-green-900 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
         <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
         <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-full mb-4 shadow-lg shadow-emerald-500/30">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AgriGuard</h1>
          <p className="text-emerald-100">{t.tagline}</p>
        </div>

        <div className="mb-6">
          <label className="block text-emerald-100 text-xs uppercase font-bold tracking-wider mb-2">Select Language</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(Language).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2 py-1 text-xs rounded border transition-all ${
                  language === lang 
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                    : 'bg-white/5 border-white/10 text-emerald-200 hover:bg-white/10'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3.5 w-5 h-5 text-emerald-200" />
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full Name"
              className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-emerald-200" />
            <input
              name="location"
              type="text"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Location (City, State)"
              className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="relative">
             <Briefcase className="absolute left-3 top-3.5 w-5 h-5 text-emerald-200" />
             <select
               name="role"
               value={formData.role}
               onChange={handleInputChange}
               className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all appearance-none"
             >
               <option value="Farmer" className="bg-gray-800">Farmer</option>
               <option value="Agronomist" className="bg-gray-800">Agronomist</option>
               <option value="Researcher" className="bg-gray-800">Researcher</option>
             </select>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-6"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              t.login
            )}
          </button>
        </form>

        <p className="text-center text-emerald-200/60 text-xs mt-6">
          Designed & Developed by <strong>Soumoditya Das</strong>
          <br />
          <span className="opacity-75">soumoditt@gmail.com</span>
          <br />
          Kshitij 2026 • Precision Agriculture Track
        </p>
      </div>
    </div>
  );
};

export default Login;