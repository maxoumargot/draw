
import React from 'react';
import { BrushType, ResonanceFeedback } from '../types';

interface SidebarProps {
  currentBrush: BrushType;
  setBrush: (b: BrushType) => void;
  brushSize: number;
  setBrushSize: (s: number) => void;
  color: string;
  setColor: (c: string) => void;
  feedback: ResonanceFeedback | null;
  isAnalyzing: boolean;
  onClear: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentBrush, setBrush, 
  brushSize, setBrushSize, 
  color, setColor, 
  feedback, isAnalyzing,
  onClear
}) => {
  return (
    <div className="fixed top-6 left-6 w-80 z-10 flex flex-col gap-6 select-none pointer-events-none">
      {/* Title Card */}
      <div className="glass p-6 rounded-2xl pointer-events-auto">
        <h1 className="text-xl font-bold tracking-tight mb-1 uppercase text-white">L'Atelier</h1>
        <p className="text-xs mono opacity-50 uppercase tracking-widest mb-6">Des Résonances v1.0</p>
        
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-2 block opacity-60">Brush Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(BrushType).map((type) => (
                <button
                  key={type}
                  onClick={() => setBrush(type)}
                  className={`px-3 py-2 rounded-lg text-xs mono transition-all border ${
                    currentBrush === type 
                      ? 'bg-white text-black border-white' 
                      : 'border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider mb-2 block opacity-60">Brush Size: {brushSize}px</label>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full accent-white h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
          </div>

          <div className="flex gap-2 items-center">
            <input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 bg-transparent border-none rounded-full cursor-pointer overflow-hidden"
            />
            <button 
              onClick={onClear}
              className="flex-1 border border-white/10 hover:border-red-500/50 hover:text-red-400 py-2 rounded-lg text-xs mono transition-all uppercase"
            >
              Clear Canvas
            </button>
          </div>
        </div>
      </div>

      {/* AI Feedback Card */}
      <div className={`glass p-6 rounded-2xl pointer-events-auto transition-all duration-700 ${isAnalyzing ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <label className="text-[10px] uppercase tracking-wider block opacity-60">Gemini Resonance</label>
          <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-amber-400' : 'bg-green-500'}`} />
        </div>

        {feedback ? (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium leading-tight text-white mb-1">"{feedback.concept}"</p>
              <p className="text-xs italic opacity-60">{feedback.mood}</p>
            </div>
            
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-[10px] uppercase tracking-wider mb-2 opacity-50">Subconscious Instruction</p>
              <p className="text-sm mono leading-relaxed text-amber-200">{feedback.instruction}</p>
            </div>

            <div className="flex gap-2">
              {feedback.paletteSuggestion.map((c, i) => (
                <div 
                  key={i} 
                  onClick={() => setColor(c)}
                  className="w-full h-8 rounded-md cursor-pointer border border-white/10 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs mono opacity-40">Start drawing to trigger a subconscious resonance...</p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
