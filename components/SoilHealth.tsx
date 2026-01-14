import React, { useState } from 'react';
import { FlaskConical, Save, RotateCcw, FileText, CheckCircle2 } from 'lucide-react';
import { INITIAL_SOIL_DATA, TRANSLATIONS } from '../constants';
import { Language, SoilData } from '../types';
import { queryGemini } from '../services/geminiService';

const SoilHealth: React.FC<{ language: Language }> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const [data, setData] = useState<SoilData>(INITIAL_SOIL_DATA);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof SoilData, value: number) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const generateReport = async () => {
    setLoading(true);
    setReport(null);
    try {
      const prompt = `
        Act as an expert Soil Scientist and Agronomist.
        Analyze this soil data:
        pH: ${data.ph}
        Nitrogen: ${data.nitrogen} kg/ha
        Phosphorus: ${data.phosphorus} kg/ha
        Potassium: ${data.potassium} kg/ha
        EC: ${data.ec} dS/m
        Moisture: ${data.moisture}%

        Generate a detailed "Soil Health & Fertility Report" in ${language} language.
        Format efficiently with Markdown headers.
        Structure:
        1. **Executive Summary**: Brief status (Acidic/Alkaline/Healthy).
        2. **Detailed Analysis**: Go through each parameter (N, P, K, pH) and explain if it's low, medium, or high.
        3. **Fertilizer Recommendation**:
           - Chemical: Exact dosage of Urea, DAP, MOP.
           - Organic: Manure/Compost suggestions.
        4. **Long-term Soil Management**: How to improve soil structure over 5 years.
      `;
      const response = await queryGemini(prompt, 'thinking'); // Use Thinking model for deep analysis
      setReport(response.text || "Analysis failed.");
    } catch (e) {
      setReport("Error generating report. Please check your internet connection or API quota.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FlaskConical className="text-emerald-600" /> {t.soil}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold mb-4 text-gray-600 uppercase tracking-wide text-xs">{t.enter_data}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">pH Level</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={data.ph} 
                  onChange={(e) => handleChange('ph', parseFloat(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">EC (dS/m)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={data.ec} 
                  onChange={(e) => handleChange('ec', parseFloat(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nitrogen (N)</label>
                <input 
                  type="number" 
                  value={data.nitrogen} 
                  onChange={(e) => handleChange('nitrogen', parseFloat(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phosphorus (P)</label>
                <input 
                  type="number" 
                  value={data.phosphorus} 
                  onChange={(e) => handleChange('phosphorus', parseFloat(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Potassium (K)</label>
                <input 
                  type="number" 
                  value={data.potassium} 
                  onChange={(e) => handleChange('potassium', parseFloat(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button 
                onClick={generateReport}
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium flex justify-center items-center gap-2 shadow-lg transition-all"
              >
                {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <><FileText size={18} /> {t.gen_report}</>}
              </button>
              <button 
                onClick={() => setData(INITIAL_SOIL_DATA)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {/* Report Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[300px] relative">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-600 uppercase tracking-wide text-xs">Analysis Result</h3>
                {report && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 size={12}/> AI Verified</span>}
             </div>
             
             {report ? (
               <div className="prose prose-sm prose-emerald max-w-none h-[400px] overflow-y-auto custom-scrollbar p-2">
                 {/* Simple formatting for markdown-like text */}
                 {report.split('\n').map((line, i) => {
                   if (line.startsWith('**') || line.startsWith('#')) return <h4 key={i} className="font-bold text-gray-800 mt-4 mb-2">{line.replace(/\*\*/g, '').replace(/#/g, '')}</h4>;
                   if (line.trim().startsWith('-')) return <li key={i} className="ml-4 text-gray-700 mb-1">{line.replace('-', '')}</li>;
                   return <p key={i} className="text-gray-600 mb-2">{line.replace(/\*\*/g, '')}</p>;
                 })}
               </div>
             ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 opacity-50">
                 <FlaskConical size={48} className="mb-2" />
                 <p>Enter lab data to generate report</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoilHealth;