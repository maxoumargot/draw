
import { Vector2D, Segment } from './types';

export const vecAdd = (v1: Vector2D, v2: Vector2D): Vector2D => ({ x: v1.x + v2.x, y: v1.y + v2.y });
export const vecSub = (v1: Vector2D, v2: Vector2D): Vector2D => ({ x: v1.x - v2.x, y: v1.y - v2.y });
export const vecMult = (v: Vector2D, s: number): Vector2D => ({ x: v.x * s, y: v.y * s });
export const vecDot = (v1: Vector2D, v2: Vector2D): number => v1.x * v2.x + v1.y * v2.y;
export const vecMag = (v: Vector2D): number => Math.sqrt(v.x * v.x + v.y * v.y);
export const vecNormalize = (v: Vector2D): Vector2D => {
  const m = vecMag(v);
  return m === 0 ? { x: 0, y: 0 } : vecMult(v, 1 / m);
};

export const getNearestPointOnSegment = (p: Vector2D, s: Segment): Vector2D => {
  const v = vecSub(s.p2, s.p1);
  const w = vecSub(p, s.p1);
  const t = Math.max(0, Math.min(1, vecDot(w, v) / vecDot(v, v)));
  return vecAdd(s.p1, vecMult(v, t));
};

export const reflect = (v: Vector2D, n: Vector2D, bounciness: number): Vector2D => {
  const dot = vecDot(v, n);
  // Rebond + Damping
  return vecSub(v, vecMult(n, 2 * dot * bounciness));
};
