
import React, { useRef, useEffect, useState } from 'react';
import { Vector2D, Segment, Ball, SimulationState, SegmentType, Goal, Obstacle } from '../types';
import * as Phys from '../PhysicsUtils';

interface Props {
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  goal: Goal;
  obstacles: Obstacle[];
  onGoalReached: () => void;
  simState: SimulationState;
  gravityScale: number;
  activeSegmentType: SegmentType;
  isCameraMode: boolean;
  isDrawingEnabled: boolean;
}

const SimulationCanvas: React.FC<Props> = ({ 
  segments, setSegments, ball, setBall, goal, obstacles, onGoalReached, simState, gravityScale, activeSegmentType, isCameraMode, isDrawingEnabled 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const procCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const lastFrameData = useRef<Uint8ClampedArray | null>(null);
  
  // États de contrôle du dessin
  const [isMouseDown, setIsMouseDown] = useState(false);
  const lastDrawPos = useRef<Vector2D | null>(null);
  const currentPointerPos = useRef<Vector2D | null>(null);
  
  // Références persistantes pour le moteur physique
  const physBall = useRef<Ball>({ ...ball });
  const physSegments = useRef<Segment[]>([]);

  // Configuration Tracking & Dessin
  const PROC_W = 160;
  const PROC_H = 120;
  const DIFF_THRESHOLD = 20; // Plus sensible
  const MOTION_MIN_COUNT = 5; // Plus sensible
  const MIN_MOVE_DIST = 4; // Traits plus denses
  const LERP_FACTOR = 0.35; // Suivi plus nerveux

  // Configuration Physique
  const SUB_STEPS = 10;
  const GRAVITY_Y = 0.35; // Gravité "normale"
  const FRICTION = 0.992; // Friction légère
  
  const TYPE_CONFIG: Record<SegmentType, { color: string; solid: boolean; bounce?: number; attraction?: number }> = {
    [SegmentType.Normal]: { color: '#000000', bounce: 0.6, solid: true },
    [SegmentType.Bouncy]: { color: '#666666', bounce: 1.2, solid: true },
    [SegmentType.Attract]: { color: '#aaaaaa', attraction: 0.12, solid: false }
  };

  // Synchronisation des segments
  useEffect(() => { physSegments.current = segments; }, [segments]);
  useEffect(() => { if (simState === SimulationState.Paused) physBall.current = { ...ball }; }, [ball, simState]);

  // Initialisation Webcam
  useEffect(() => {
    if (isCameraMode) {
      const initWebcam = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, frameRate: 30 }, 
            audio: false 
          });
          const video = document.getElementById('webcam-preview') as HTMLVideoElement;
          if (video) {
            video.srcObject = stream;
            videoRef.current = video;
          }
        } catch (e) { console.error(e); }
      };
      initWebcam();
      return () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
      };
    }
  }, [isCameraMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      procCanvasRef.current.width = PROC_W;
      procCanvasRef.current.height = PROC_H;
    };
    window.addEventListener('resize', resize);
    resize();

    let rafId: number;

    const runMotionTracking = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return { detected: false };
      const pCtx = procCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!pCtx) return { detected: false };
      
      pCtx.save();
      pCtx.scale(-1, 1);
      pCtx.drawImage(video, -PROC_W, 0, PROC_W, PROC_H);
      pCtx.restore();
      
      const frame = pCtx.getImageData(0, 0, PROC_W, PROC_H);
      const data = frame.data;
      let topY = PROC_H;
      let targetPoint: Vector2D | null = null;
      let motionCount = 0;
      
      if (lastFrameData.current) {
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const prevAvg = (lastFrameData.current[i] + lastFrameData.current[i + 1] + lastFrameData.current[i + 2]) / 3;
          if (Math.abs(avg - prevAvg) > DIFF_THRESHOLD) {
            const x = (i / 4) % PROC_W;
            const y = Math.floor((i / 4) / PROC_W);
            motionCount++;
            if (y < topY) { topY = y; targetPoint = { x, y }; }
          }
        }
      }
      lastFrameData.current = new Uint8ClampedArray(data);
      
      if (motionCount > MOTION_MIN_COUNT && targetPoint) {
        const screenX = (targetPoint.x / PROC_W) * canvas.width;
        const screenY = (targetPoint.y / PROC_H) * canvas.height;
        if (!currentPointerPos.current) {
          currentPointerPos.current = { x: screenX, y: screenY };
        } else {
          currentPointerPos.current.x += (screenX - currentPointerPos.current.x) * LERP_FACTOR;
          currentPointerPos.current.y += (screenY - currentPointerPos.current.y) * LERP_FACTOR;
        }
        return { detected: true, pos: currentPointerPos.current };
      }
      return { detected: false };
    };

    const mainLoop = () => {
      let activePos: Vector2D | null = null;
      let drawingActive = false;
      let detected = false;
      
      if (isCameraMode) {
        const tracking = runMotionTracking();
        detected = tracking.detected;
        if (detected) {
          activePos = tracking.pos!;
          drawingActive = isDrawingEnabled; // Déclenché par la touche D
        }
      } else {
        activePos = currentPointerPos.current;
        drawingActive = isMouseDown;
        detected = isMouseDown || !!activePos;
      }

      // LOGIQUE DE DESSIN VECTORIEL AMÉLIORÉE
      if (drawingActive && activePos) {
        if (!lastDrawPos.current) {
          lastDrawPos.current = { ...activePos };
        } else {
          const dist = Phys.vecMag(Phys.vecSub(activePos, lastDrawPos.current));
          if (dist > MIN_MOVE_DIST) {
            const newSeg: Segment = {
              p1: { ...lastDrawPos.current },
              p2: { ...activePos },
              type: activeSegmentType
            };
            
            // On ajoute directement le segment à la référence physique pour éviter le lag de l'état React
            const updatedSegments = [...physSegments.current, newSeg];
            physSegments.current = updatedSegments;
            setSegments(updatedSegments);
            
            lastDrawPos.current = { ...activePos };
          }
        }
      } else {
        // En mode suivi simple ou repos, on synchronise l'ancre pour éviter les traits géants
        if (activePos) {
          lastDrawPos.current = { ...activePos };
        } else {
          lastDrawPos.current = null;
        }
      }

      // Moteur Physique (Simulé plusieurs fois par frame pour plus de stabilité)
      if (simState === SimulationState.Playing) {
        const b = physBall.current;
        const gStep = Phys.vecMult({ x: 0, y: GRAVITY_Y * gravityScale }, 1 / SUB_STEPS);
        for (let i = 0; i < SUB_STEPS; i++) {
          b.vel = Phys.vecAdd(b.vel, gStep);
          b.vel = Phys.vecMult(b.vel, Math.pow(FRICTION, 1 / SUB_STEPS));
          b.pos = Phys.vecAdd(b.pos, Phys.vecMult(b.vel, 1 / SUB_STEPS));
          
          const distToGoal = Phys.vecMag(Phys.vecSub(b.pos, goal.pos));
          if (distToGoal < b.radius + goal.radius) onGoalReached();
          
          obstacles.forEach(obs => {
            const near = Phys.getNearestPointOnSegment(b.pos, { p1: obs.p1, p2: obs.p2, type: SegmentType.Normal });
            const diff = Phys.vecSub(b.pos, near);
            const dist = Phys.vecMag(diff);
            if (dist < b.radius && dist > 0) {
              const norm = Phys.vecNormalize(diff);
              b.pos = Phys.vecAdd(b.pos, Phys.vecMult(norm, b.radius - dist));
              const relV = Phys.vecDot(b.vel, norm);
              if (relV < 0) b.vel = Phys.vecAdd(b.vel, Phys.vecMult(norm, -1.8 * relV));
            }
          });
          
          physSegments.current.forEach(seg => {
            const cfg = TYPE_CONFIG[seg.type];
            const near = Phys.getNearestPointOnSegment(b.pos, seg);
            const diff = Phys.vecSub(b.pos, near);
            const dist = Phys.vecMag(diff);
            
            if (cfg.solid && dist < b.radius && dist > 0) {
              const norm = Phys.vecNormalize(diff);
              b.pos = Phys.vecAdd(b.pos, Phys.vecMult(norm, b.radius - dist));
              const relV = Phys.vecDot(b.vel, norm);
              if (relV < 0) b.vel = Phys.vecAdd(b.vel, Phys.vecMult(norm, -2 * relV * (cfg.bounce || 0.5)));
            } else if (seg.type === SegmentType.Attract && dist > 0 && dist < 250) {
              const force = (cfg.attraction || 0.05) * (1 - dist / 250);
              b.vel = Phys.vecAdd(b.vel, Phys.vecMult(Phys.vecNormalize(Phys.vecSub(near, b.pos)), force));
            }
          });
          
          if (b.pos.y + b.radius > canvas.height || b.pos.y - b.radius < 0) b.vel.y *= -0.5;
          if (b.pos.x + b.radius > canvas.width || b.pos.x - b.radius < 0) b.vel.x *= -0.5;
          b.pos.x = Math.max(b.radius, Math.min(canvas.width - b.radius, b.pos.x));
          b.pos.y = Math.max(b.radius, Math.min(canvas.height - b.radius, b.pos.y));
        }
      }

      // Rendu Graphique
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Obstacles décoratifs
        obstacles.forEach(obs => {
          ctx.beginPath();
          ctx.moveTo(obs.p1.x, obs.p1.y);
          ctx.lineTo(obs.p2.x, obs.p2.y);
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#000000';
          ctx.setLineDash([10, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // But
        ctx.beginPath();
        ctx.arc(goal.pos.x, goal.pos.y, goal.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        if (!goal.reached) ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Segments dessinés
        [SegmentType.Normal, SegmentType.Bouncy, SegmentType.Attract].forEach(t => {
          const cfg = TYPE_CONFIG[t];
          ctx.beginPath();
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth = 4;
          if (t === SegmentType.Attract) { ctx.setLineDash([2, 10]); ctx.lineWidth = 2; }
          else if (t === SegmentType.Bouncy) { ctx.setLineDash([5, 5]); }
          else { ctx.setLineDash([]); }
          physSegments.current.filter(s => s.type === t).forEach(s => {
            ctx.moveTo(s.p1.x, s.p1.y);
            ctx.lineTo(s.p2.x, s.p2.y);
          });
          ctx.stroke();
        });

        // Curseur
        if (activePos) {
          const isDraw = isCameraMode ? (detected && isDrawingEnabled) : isMouseDown;
          const { x, y } = activePos;
          ctx.save();
          ctx.translate(x, y);
          ctx.beginPath();
          ctx.arc(0, 0, isDraw ? 22 : 14, 0, Math.PI * 2);
          ctx.fillStyle = isDraw ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.05)';
          ctx.fill();
          ctx.strokeStyle = isDraw ? '#000000' : 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
          ctx.restore();
        }

        // Balle
        const ballObj = physBall.current;
        ctx.beginPath();
        ctx.arc(ballObj.pos.x, ballObj.pos.y, ballObj.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
      }
      rafId = requestAnimationFrame(mainLoop);
    };
    rafId = requestAnimationFrame(mainLoop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [simState, isCameraMode, gravityScale, activeSegmentType, isMouseDown, goal, obstacles, onGoalReached, isDrawingEnabled]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCameraMode) return;
    setIsMouseDown(true);
    const pos = { x: e.clientX, y: e.clientY };
    currentPointerPos.current = pos;
    lastDrawPos.current = pos;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isCameraMode) return;
    currentPointerPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { setIsMouseDown(false); lastDrawPos.current = null; };

  return (
    <canvas 
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="absolute inset-0 bg-transparent touch-none"
    />
  );
};

export default SimulationCanvas;
