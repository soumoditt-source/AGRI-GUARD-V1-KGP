export enum AppMode {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SCANNER = 'SCANNER',
  FIELD_ARCHITECT = 'FIELD_ARCHITECT',
  SOIL_LAB = 'SOIL_LAB',
  CHAT_COACH = 'CHAT_COACH',
  COMMUNITY = 'COMMUNITY'
}

export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  BENGALI = 'bn',
  TAMIL = 'ta',
  TELUGU = 'te',
  MARATHI = 'mr'
}

export type UnitSystem = 'metric' | 'imperial';

export interface SavedField {
  id: string;
  name: string;
  points: { lat: number; lng: number }[];
  area: number;
  date: number;
}

export interface UserProfile {
  name: string;
  role: 'Farmer' | 'Agronomist' | 'Researcher';
  location: string;
  coordinates?: { lat: number; lng: number };
  avatar: string;
  stats: {
    fields: number;
    scans: number;
    actionsPending: number;
  };
}

export interface WeatherData {
  temp: number;
  humidity: number;
  condition: string;
  windSpeed: number;
  forecast: string;
  isRealData?: boolean;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  time: string;
  priority: 'high' | 'normal';
}

export interface SoilData {
  ph: number;
  moisture: number; // 0-100%
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ec: number; // Electrical Conductivity
}

export interface SensorNode {
  id: string;
  lat: number;
  lng: number;
  type: 'moisture' | 'npk' | 'general';
  value: number; // Normalized 0-100
  battery: number;
  lastUpdate: number;
  status: 'active' | 'warning' | 'offline';
}

export interface PestDetection {
  id: string;
  name: string;
  scientificName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  bbox: [number, number, number, number]; // [y_min, x_min, y_max, x_max] normalized 0-1000
  lifecycle: string; // e.g., "Larval Stage - High Vulnerability"
  treatment: {
    organic: string;
    chemical: string;
    prevention: string; // Companion planting, IPM strategy
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  isVoice?: boolean;
}

export interface MarketItem {
  id?: string;
  crop: string;
  price: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export interface FarmTask {
  id: string;
  title: string;
  due: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}