import React from 'react';

// A lightweight CSS-only 3D plant representation (Digital Twin Concept)
const ThreeDPlant: React.FC<{ health: number }> = ({ health }) => {
  const color = health > 80 ? 'bg-green-500' : health > 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="w-full h-48 flex items-center justify-center overflow-hidden perspective-1000">
      <div className="relative w-20 h-32 spinner-3d">
        {/* Stem */}
        <div className={`absolute top-10 left-9 w-2 h-24 ${color} opacity-80 rounded`}></div>
        
        {/* Leaves */}
        <div className={`absolute top-12 left-2 w-8 h-8 ${color} rounded-tr-3xl rounded-bl-3xl transform -rotate-45 opacity-90 shadow-lg`}></div>
        <div className={`absolute top-16 right-2 w-8 h-8 ${color} rounded-tl-3xl rounded-br-3xl transform rotate-45 opacity-90 shadow-lg`}></div>
        <div className={`absolute top-4 left-6 w-8 h-8 ${color} rounded-full opacity-60 transform scale-x-50`}></div>
        
        {/* Floating Health Badge */}
        <div className="absolute -top-4 left-0 w-20 text-center text-xs font-bold text-gray-700 bg-white/80 rounded px-1 backdrop-blur-sm">
          Health: {health}%
        </div>
      </div>
    </div>
  );
};

export default ThreeDPlant;