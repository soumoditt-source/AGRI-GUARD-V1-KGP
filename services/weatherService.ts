import { WeatherData } from "../types";

// WMO Weather interpretation codes (OpenMeteo)
const getWeatherCondition = (code: number): string => {
  if (code === 0) return "Clear Sky";
  if (code === 1 || code === 2 || code === 3) return "Partly Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
};

export const fetchRealWeather = async (lat: number, lng: number): Promise<WeatherData> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();

    const current = data.current;
    
    return {
      temp: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      condition: getWeatherCondition(current.weather_code),
      forecast: getWeatherCondition(data.daily.weather_code[1]) + " tomorrow",
      isRealData: true
    };
  } catch (error) {
    console.error("Weather API Error:", error);
    // Fallback
    return {
      temp: 28,
      humidity: 60,
      condition: "Sunny (Offline)",
      windSpeed: 10,
      forecast: "Data unavailable",
      isRealData: false
    };
  }
};