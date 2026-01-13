
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrushType, StrokePoint } from '../types';

interface CanvasProps {
  brushType: BrushType;
  brushSize: number;
  color: string;
  onDrawEnd: (canvas: HTMLCanvasElement) => void;
}

const Canvas: React.FC<CanvasProps> = ({ brushType, brushSize, color, onDrawEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPoint = useRef<StrokePoint | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;

    const handleResize = () => {
      const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.putImageData(tempImage, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const drawInk = (ctx: CanvasRenderingContext2D, from: StrokePoint, to: StrokePoint) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const drawVapor = (ctx: CanvasRenderingContext2D, from: StrokePoint, to: StrokePoint) => {
    const dist = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
    const steps = Math.max(1, Math.floor(dist / 2));
    
    for (let i = 0; i < steps; i++) {
      const x = from.x + (to.x - from.x) * (i / steps);
      const y = from.y + (to.y - from.y) * (i / steps);
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushSize * 2);
      gradient.addColorStop(0, color + '33');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, brushSize * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawResonance = (ctx: CanvasRenderingContext2D, from: StrokePoint, to: StrokePoint) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    
    // Main line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Chaotic echoes
    for(let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * brushSize * 5;
      const offsetY = (Math.random() - 0.5) * brushSize * 5;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(from.x + offsetX, from.y + offsetY);
      ctx.lineTo(to.x + offsetX, to.y + offsetY);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCoordinates(e);
    lastPoint.current = { x, y, pressure: 1, timestamp: Date.now() };
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current || !lastPoint.current) return;

    const { x, y } = getCoordinates(e);
    const currentPoint: StrokePoint = { x, y, pressure: 1, timestamp: Date.now() };
    const ctx = contextRef.current;

    switch (brushType) {
      case BrushType.Ink:
        drawInk(ctx, lastPoint.current, currentPoint);
        break;
      case BrushType.Vapor:
        drawVapor(ctx, lastPoint.current, currentPoint);
        break;
      case BrushType.Resonance:
        drawResonance(ctx, lastPoint.current, currentPoint);
        break;
      default:
        drawInk(ctx, lastPoint.current, currentPoint);
    }

    lastPoint.current = currentPoint;
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      onDrawEnd(canvasRef.current);
    }
    setIsDrawing(false);
    lastPoint.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseOut={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      className="absolute inset-0 z-0 bg-transparent"
    />
  );
};

export default Canvas;
