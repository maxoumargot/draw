
import React, { useState, useEffect, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import { Ball, Segment, SimulationState, PhysicalResonance, Vector2D, SegmentType, Goal, Obstacle } from './types';

const INITIAL_BALL_POS: Vector2D = { x: 100, y: 100 };

const App: React.FC = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentType, setActiveSegmentType] = useState<SegmentType>(SegmentType.Normal);
  const [simState, setSimState] = useState<SimulationState>(SimulationState.Paused);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [activePopup, setActivePopup] = useState<'settings' | 'drawing' | null>(null);
  const [ball, setBall] = useState<Ball>({
    pos: { ...INITIAL_BALL_POS },
    vel: { x: 2, y: 0 },
    radius: 12,
    color: '#000000'
  });
  
  const [goal, setGoal] = useState<Goal>({
    pos: { x: window.innerWidth - 150, y: window.innerHeight - 150 },
    radius: 35,
    reached: false
  });

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  // Gestion du maintien de la touche "D" pour le dessin (Momentané)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd' && !e.repeat) {
        setIsDrawingEnabled(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd') {
        setIsDrawingEnabled(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialisation et repositionnement si la fenêtre change
  useEffect(() => {
    const handleResize = () => {
      setGoal(prev => ({
        ...prev,
        pos: { x: window.innerWidth - 150, y: window.innerHeight - 150 }
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const generateObstacles = (targetPos: Vector2D) => {
    const newObs: Obstacle[] = [];
    const count = 1 + Math.floor(Math.random() * 2);
    
    const dirX = targetPos.x - INITIAL_BALL_POS.x;
    const dirY = targetPos.y - INITIAL_BALL_POS.y;
    
    for (let i = 0; i < count; i++) {
      const t = 0.3 + Math.random() * 0.4;
      const centerX = INITIAL_BALL_POS.x + dirX * t;
      const centerY = INITIAL_BALL_POS.y + dirY * t;
      
      const angle = Math.atan2(dirY, dirX) + (Math.PI / 2) + (Math.random() * 0.4 - 0.2);
      const length = 100 + Math.random() * 150;
      
      newObs.push({
        p1: {
          x: centerX - Math.cos(angle) * (length / 2),
          y: centerY - Math.sin(angle) * (length / 2)
        },
        p2: {
          x: centerX + Math.cos(angle) * (length / 2),
          y: centerY + Math.sin(angle) * (length / 2)
        }
      });
    }
    return newObs;
  };

  const randomizeGoal = () => {
    const padding = 150;
    let newX, newY, valid;
    let attempts = 0;
    
    do {
      newX = padding + Math.random() * (window.innerWidth - padding * 2);
      newY = padding + Math.random() * (window.innerHeight - padding * 2);
      valid = true;
      
      const distToBall = Math.sqrt(Math.pow(newX - INITIAL_BALL_POS.x, 2) + Math.pow(newY - INITIAL_BALL_POS.y, 2));
      if (distToBall < 300) valid = false;
      attempts++;
    } while (!valid && attempts < 50);

    const newPos = { x: newX, y: newY };
    setGoal(prev => ({
      ...prev,
      pos: newPos,
      reached: false
    }));
    return newPos;
  };

  const handleToggleSimulation = () => {
    if (simState === SimulationState.Playing) {
      resetBall();
      const newGoalPos = randomizeGoal();
      const newObs = generateObstacles(newGoalPos);
      setObstacles(newObs);
      setSegments([]); 
      setSimState(SimulationState.Paused);
    } else {
      setSimState(SimulationState.Playing);
    }
  };

  const resetBall = () => {
    setBall(prev => ({
      ...prev,
      pos: { ...INITIAL_BALL_POS },
      vel: { x: 2, y: 0 }
    }));
    setGoal(prev => ({ ...prev, reached: false }));
  };

  const clearDrawing = () => {
    setSegments([]);
    setGoal(prev => ({ ...prev, reached: false }));
  };

  const togglePopup = (popup: 'settings' | 'drawing') => {
    setActivePopup(activePopup === popup ? null : popup);
  };

  const handleGoalReached = useCallback(() => {
    if (!goal.reached) {
      setGoal(prev => ({ ...prev, reached: true }));
    }
  }, [goal.reached]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white text-black font-sans">
      {/* BACKGROUND VIDEO LAYER */}
      <video 
        id="webcam-preview" 
        className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 grayscale ${isCameraActive ? 'opacity-20' : 'opacity-0'}`}
        autoPlay 
        muted 
        playsInline
      />

      {/* SIMULATION LAYER */}
      <div className="absolute inset-0 z-10">
        <SimulationCanvas 
          segments={segments}
          setSegments={setSegments}
          ball={ball}
          setBall={setBall}
          goal={goal}
          obstacles={obstacles}
          onGoalReached={handleGoalReached}
          simState={simState}
          gravityScale={1.0}
          activeSegmentType={activeSegmentType}
          isCameraMode={isCameraActive}
          isDrawingEnabled={isDrawingEnabled}
        />
      </div>

      {/* UI TRIGGERS (ICONS) */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-30">
        
        {/* Left Toolbar */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Settings Toggle */}
          <div className="relative">
            <button 
              onClick={() => togglePopup('settings')}
              className={`w-12 h-12 flex items-center justify-center rounded-full glass border transition-all ${activePopup === 'settings' ? 'bg-gray-100 border-black' : 'border-black/20 hover:border-black'}`}
              title="Paramètres"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>

            {/* Settings Popup */}
            {activePopup === 'settings' && (
              <div className="absolute top-16 left-0 w-72 glass p-5 rounded-2xl shadow-sm border border-black animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] mono uppercase opacity-50 tracking-widest">Webcam / Tracking</label>
                    <button 
                      onClick={() => setIsCameraActive(!isCameraActive)}
                      className={`py-2 px-3 rounded-lg mono text-[10px] uppercase border transition-all flex items-center justify-between ${
                        isCameraActive ? 'bg-gray-100 text-black border-black' : 'border-black/10 text-black/40 hover:border-black/20'
                      }`}
                    >
                      <span>{isCameraActive ? 'Activé' : 'Désactivé'}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${isCameraActive ? 'bg-black' : 'bg-black/10'}`} />
                    </button>
                  </div>

                  <div className="h-px bg-black/10" />

                  <div className="flex flex-col gap-2">
                    <button onClick={resetBall} className="py-2 rounded-lg border border-black/10 text-[9px] uppercase hover:bg-gray-100">Reset Balle</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawing Tools Toggle */}
          <div className="relative">
            <button 
              onClick={() => togglePopup('drawing')}
              className={`w-12 h-12 flex items-center justify-center rounded-full glass border transition-all ${activePopup === 'drawing' ? 'bg-gray-100 border-black' : 'border-black/20 hover:border-black'}`}
              title="Outils de dessin"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="m2 2 5 5"></path><path d="m11 11 5 5"></path></svg>
            </button>

            {/* Drawing Tools Popup */}
            {activePopup === 'drawing' && (
              <div className="absolute top-16 left-0 w-72 glass p-5 rounded-2xl shadow-sm border border-black animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] mono uppercase opacity-50 tracking-widest">Effet du tracé</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: SegmentType.Normal, label: 'SOLIDE' },
                        { id: SegmentType.Bouncy, label: 'REBOND' },
                        { id: SegmentType.Attract, label: 'AIMANT' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setActiveSegmentType(type.id)}
                          className={`py-2 rounded-lg text-[8px] font-bold mono border transition-all flex flex-col items-center justify-center ${
                            activeSegmentType === type.id ? 'border-black bg-gray-100 text-black' : 'border-black/10 text-black/30 hover:border-black/20'
                          }`}
                        >
                          <span>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-black/10" />

                  <div className="flex flex-col gap-2">
                    <button onClick={clearDrawing} className="py-2 rounded-lg border border-black/10 text-[9px] uppercase hover:text-black hover:bg-gray-100">Nettoyer le tracé</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MAIN PLAY / RESET BUTTON */}
          <button 
            onClick={handleToggleSimulation}
            className={`px-4 h-12 flex items-center gap-2 rounded-full glass border transition-all ${simState === SimulationState.Playing ? 'bg-gray-100 border-black text-black' : 'border-black/20 text-black/80 hover:border-black'}`}
          >
            {simState === SimulationState.Playing ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                <span className="text-[10px] mono uppercase font-bold">Reset</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m7 4 12 8-12 8V4z"></path></svg>
                <span className="text-[10px] mono uppercase font-bold">Lancer Physique</span>
              </>
            )}
          </button>

          {/* DRAWING INFO BUTTON (Indicateur de statut) */}
          <div 
            className={`px-4 h-12 flex items-center gap-2 rounded-full glass border transition-all ${isDrawingEnabled ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19 7-7 3 3-7 7-3-3z"/>
              <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="m2 2 5 5"/>
              <path d="m11 11 5 5"/>
            </svg>
            <span className="text-[10px] mono uppercase font-bold">
              {isDrawingEnabled ? 'Dessin Actif' : 'Maintenir D (Doigt)'}
            </span>
          </div>
        </div>

        {/* GOAL FEEDBACK CENTERED (TOP) */}
        {goal.reached && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce">
            <div className="bg-white text-black px-6 py-2 rounded-full font-bold uppercase tracking-widest border-2 border-black">
              But Atteint !
            </div>
          </div>
        )}

      </div>

      {/* CLICK OUTSIDE OVERLAY */}
      {activePopup && (
        <div 
          className="absolute inset-0 z-20 pointer-events-auto" 
          onClick={() => setActivePopup(null)}
        />
      )}

      {/* STATUS INDICATOR (BOTTOM) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 glass rounded-full border border-black/20 z-30 pointer-events-none">
        <div className="flex items-center gap-3 text-[9px] mono uppercase tracking-widest text-black">
           <div className="flex items-center gap-1.5">
             <div className={`w-1 h-1 rounded-full ${isCameraActive ? 'bg-black' : 'bg-black/20'}`} />
             <span>Cam: {isCameraActive ? 'On' : 'Off'}</span>
           </div>
           <div className="w-px h-2 bg-black/20" />
           <div className="flex items-center gap-1.5">
             <div className={`w-1 h-1 rounded-full ${simState === SimulationState.Playing ? 'bg-black' : 'bg-black/20'}`} />
             <span>Sim: {simState}</span>
           </div>
           <div className="w-px h-2 bg-black/20" />
           <div className="flex items-center gap-1.5">
             <div className={`w-1 h-1 rounded-full ${isDrawingEnabled ? 'bg-black' : 'bg-black/20'}`} />
             <span>Dessin Doigt: {isDrawingEnabled ? 'D Hold' : 'Off'}</span>
           </div>
           {goal.reached && (
             <>
               <div className="w-px h-2 bg-black/20" />
               <div className="flex items-center gap-1.5">
                 <span>GOAL!</span>
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default App;
