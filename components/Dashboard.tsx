import React, { useEffect, useState } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { CloudRain, Droplets, Wind, Activity, TrendingUp, TrendingDown, CheckSquare, Clock, MapPin, Newspaper, Volume2, Plus, RefreshCw, X, Check } from 'lucide-react';
import { Language, UserProfile, WeatherData, MarketItem, NewsItem, FarmTask } from '../types';
import { TRANSLATIONS } from '../constants';
import ThreeDPlant from './ThreeDPlant';
import { fetchRealWeather } from '../services/weatherService';

interface DashboardProps {
  user: UserProfile;
  weather: WeatherData;
  language: Language;
}

const getNews = (lang: Language): NewsItem[] => {
  const news = {
    [Language.ENGLISH]: [
      { id: '1', headline: "Government hikes MSP for Wheat by ₹150/quintal", source: "AgriNews", time: "2h ago", priority: 'high' },
      { id: '2', headline: "Monsoon expected to be normal this year: IMD", source: "Weather Bureau", time: "4h ago", priority: 'normal' },
      { id: '3', headline: "New organic farming subsidy scheme launched", source: "Govt of India", time: "6h ago", priority: 'high' }
    ],
    [Language.HINDI]: [
      { id: '1', headline: "गेहूं के एमएसपी में ₹150/क्विंटल की बढ़ोतरी", source: "कृषि समाचार", time: "2 घंटे पहले", priority: 'high' },
      { id: '2', headline: "इस वर्ष मानसून सामान्य रहने की उम्मीद: IMD", source: "मौसम विभाग", time: "4 घंटे पहले", priority: 'normal' }
    ]
  };
  return (news as any)[lang] || news[Language.ENGLISH];
};

const Dashboard: React.FC<DashboardProps> = ({ user, weather: initialWeather, language }) => {
  const t = TRANSLATIONS[language];
  const [weather, setWeather] = useState<WeatherData>(initialWeather);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // Real Persistent Data
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [marketData, setMarketData] = useState<MarketItem[]>([]);

  // Initial Load Effects
  useEffect(() => {
    if (user.coordinates) {
      setLoadingWeather(true);
      fetchRealWeather(user.coordinates.lat, user.coordinates.lng)
        .then(setWeather)
        .finally(() => setLoadingWeather(false));
    }
    setNews(getNews(language));

    // Load Local Data or Init Default Real-Looking Data
    const savedTasks = localStorage.getItem('agri_tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      const defaultTasks: FarmTask[] = [
        { id: '1', title: "Irrigation for Field B", due: "Today", priority: 'high', completed: false },
        { id: '2', title: "Soil Sample Collection", due: "Tomorrow", priority: 'medium', completed: false }
      ];
      setTasks(defaultTasks);
      localStorage.setItem('agri_tasks', JSON.stringify(defaultTasks));
    }

    const savedMarket = localStorage.getItem('agri_market');
    if (savedMarket) {
      setMarketData(JSON.parse(savedMarket));
    } else {
      const defaultMarket: MarketItem[] = [
        { id: '1', crop: "Wheat (Lokwan)", price: 2250, trend: "up", change: 3.2 },
        { id: '2', crop: "Mustard", price: 5400, trend: "stable", change: 0.5 },
        { id: '3', crop: "Soybean", price: 4600, trend: "down", change: -2.1 }
      ];
      setMarketData(defaultMarket);
      localStorage.setItem('agri_market', JSON.stringify(defaultMarket));
    }
  }, [user.coordinates, language]);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: FarmTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      due: 'Today',
      priority: 'medium',
      completed: false
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    localStorage.setItem('agri_tasks', JSON.stringify(updated));
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    localStorage.setItem('agri_tasks', JSON.stringify(updated));
  };

  const deleteCompleted = () => {
    const updated = tasks.filter(t => !t.completed);
    setTasks(updated);
    localStorage.setItem('agri_tasks', JSON.stringify(updated));
  }

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.greeting_morning;
    if (hour < 18) return t.greeting_afternoon;
    return t.greeting_evening;
  };

  const sensorData = Array.from({ length: 15 }, (_, i) => ({
    time: i,
    moisture: 60 + Math.sin(i * 0.5) * 15 + Math.random() * 5,
  }));

  return (
    <div className="p-4 space-y-6 pb-24 overflow-y-auto h-full bg-gray-50/50">
      
      {/* Welcome & Weather Banner */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
               <h2 className="text-3xl font-bold tracking-tight mb-1">{getGreeting()}, {user.name.split(' ')[0]}</h2>
               <div className="flex items-center gap-2 text-emerald-100 text-sm font-medium opacity-90">
                  <MapPin size={14} /> {user.location}
               </div>
            </div>
            <div className="text-right">
              {loadingWeather ? (
                <div className="animate-pulse h-8 w-16 bg-white/20 rounded"></div>
              ) : (
                <>
                  <div className="text-4xl font-bold">{weather.temp}°</div>
                  <div className="text-sm text-emerald-100 flex items-center justify-end gap-1">
                    {weather.condition}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2">
               <Wind size={16} className="text-emerald-200" />
               <span className="text-sm font-bold">{weather.windSpeed} km/h</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2">
               <Droplets size={16} className="text-blue-200" />
               <span className="text-sm font-bold">{weather.humidity}% Humidity</span>
            </div>
          </div>
        </div>
        
        {/* Decorative BG */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>
      </div>

      {/* News Ticker */}
      <div className="bg-white border-y border-gray-100 py-2 overflow-hidden relative flex items-center">
        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 ml-2 rounded uppercase flex items-center gap-1 z-10 shadow-md">
           <Newspaper size={10} /> News
        </div>
        <div className="whitespace-nowrap animate-marquee flex items-center gap-8 pl-4">
           {news.map((n, i) => (
             <span key={i} className="text-sm text-gray-700 font-medium inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {n.headline} <span className="text-gray-400 text-xs">({n.source})</span>
             </span>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Digital Twin Widget */}
        <div className="md:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
           <div className="z-10 flex-1">
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="font-bold text-gray-800">Crop Health</h3>
                 <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Live Model</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Field A • Wheat (Day 45)</p>
              <div className="flex gap-2">
                <div className="text-center bg-gray-50 p-2 rounded-lg">
                   <p className="text-[10px] text-gray-400">Chlorophyll</p>
                   <p className="font-bold text-emerald-600">High</p>
                </div>
                <div className="text-center bg-gray-50 p-2 rounded-lg">
                   <p className="text-[10px] text-gray-400">Water Stress</p>
                   <p className="font-bold text-blue-600">None</p>
                </div>
              </div>
           </div>
           <div className="w-28 h-28 relative">
             <ThreeDPlant health={92} />
           </div>
        </div>

        {/* Real Tasks */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full relative">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
               <CheckSquare size={18} className="text-emerald-600" />
               <h3 className="font-bold text-gray-800 text-sm">{t.tasks}</h3>
             </div>
             <div className="flex gap-1">
                {tasks.some(t => t.completed) && (
                  <button onClick={deleteCompleted} className="p-1 text-gray-400 hover:text-red-500"><X size={14}/></button>
                )}
                <button onClick={() => setShowAddTask(true)} className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200">
                  <Plus size={14} />
                </button>
             </div>
           </div>
           <div className="space-y-2 overflow-y-auto max-h-40 flex-1">
              {tasks.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No pending tasks</p>}
              {tasks.map(task => (
                <div key={task.id} onClick={() => toggleTask(task.id)} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${task.completed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-orange-50/50 border-orange-100'}`}>
                   <div className={`w-4 h-4 rounded border flex items-center justify-center ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-400'}`}>
                      {task.completed && <Check size={10} className="text-white" />}
                   </div>
                   <div className="flex-1">
                      <p className={`text-xs font-bold text-gray-800 ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                      <p className="text-[10px] text-gray-500">{task.due} • {task.priority}</p>
                   </div>
                </div>
              ))}
           </div>
           
           {showAddTask && (
             <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col justify-center p-4 rounded-2xl">
                <h4 className="font-bold text-gray-700 mb-2">New Farm Task</h4>
                <input 
                  autoFocus
                  type="text" 
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Spray Pesticide"
                  className="border rounded p-2 text-sm mb-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <div className="flex gap-2">
                   <button onClick={addTask} className="flex-1 bg-emerald-600 text-white text-xs py-2 rounded font-bold">Add</button>
                   <button onClick={() => setShowAddTask(false)} className="flex-1 bg-gray-200 text-gray-600 text-xs py-2 rounded font-bold">Cancel</button>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Market Prices & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Market Data */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600"><TrendingUp size={18} /></div>
                Live Market
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                Live Sync
              </div>
           </div>
           <div className="space-y-4 relative z-10">
             {marketData.map((item, idx) => (
               <div key={idx} className="flex justify-between items-center pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                       {item.crop[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{item.crop}</p>
                      <p className="text-[10px] text-gray-400">₹/Quintal</p>
                    </div>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-gray-800">₹{item.price}</p>
                   <p className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${item.trend === 'up' ? 'text-emerald-500' : item.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                     {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '•'} {Math.abs(item.change)}%
                   </p>
                 </div>
               </div>
             ))}
           </div>
           {/* Background Pulse Effect */}
           <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-amber-50 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        </div>

        {/* Live Sensor Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600"><Activity size={18} /></div>
                Moisture Trends
              </h3>
              <div className="flex items-center gap-2">
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 <span className="text-xs font-bold text-emerald-600">IOT-NODE-A4</span>
              </div>
           </div>
           <div className="h-48 w-full min-h-[12rem]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0}>
               <AreaChart data={sensorData}>
                 <defs>
                   <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                   itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
                 />
                 <Area 
                   type="monotone" 
                   dataKey="moisture" 
                   stroke="#10B981" 
                   strokeWidth={3} 
                   fillOpacity={1} 
                   fill="url(#colorMoisture)" 
                 />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;