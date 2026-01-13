
export interface Vector2D {
  x: number;
  y: number;
}

export enum SegmentType {
  Normal = 'normal',
  Bouncy = 'bouncy',
  Attract = 'attract'
}

export interface Segment {
  p1: Vector2D;
  p2: Vector2D;
  type: SegmentType;
}

export interface Ball {
  pos: Vector2D;
  vel: Vector2D;
  radius: number;
  color: string;
}

export interface Goal {
  pos: Vector2D;
  radius: number;
  reached: boolean;
}

export interface Obstacle {
  p1: Vector2D;
  p2: Vector2D;
}

export enum SimulationState {
  Playing = 'playing',
  Paused = 'paused'
}

export interface PhysicalResonance {
  archetype: string;
  complexity: number;
  observation: string;
  gravityTweak: number;
}

export enum BrushType {
  Ink = 'Ink',
  Vapor = 'Vapor',
  Resonance = 'Resonance'
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface ResonanceFeedback {
  concept: string;
  mood: string;
  instruction: string;
  paletteSuggestion: string[];
}
