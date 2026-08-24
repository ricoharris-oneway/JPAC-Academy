export type MotionMetrics = { energy: number; balance: number; brightness: number };
export function analyzeMotion(current: Uint8ClampedArray, previous: Uint8ClampedArray | null, width: number, height: number): MotionMetrics {
  let brightness = 0; let leftMotion = 0; let rightMotion = 0; let samples = 0;
  for (let pixel = 0; pixel < width * height; pixel += 2) {
    const index = pixel * 4; brightness += (current[index] + current[index + 1] + current[index + 2]) / 3; samples += 1;
    if (previous) { const difference = (Math.abs(current[index] - previous[index]) + Math.abs(current[index + 1] - previous[index + 1]) + Math.abs(current[index + 2] - previous[index + 2])) / 3; if (pixel % width < width / 2) leftMotion += difference; else rightMotion += difference; }
  }
  const totalMotion = leftMotion + rightMotion; const energy = previous ? Math.min(100, totalMotion / samples * 2.8) : 0; const balance = totalMotion > 40 ? Math.max(-100, Math.min(100, (rightMotion - leftMotion) / totalMotion * 100)) : 0;
  return { energy, balance, brightness: samples ? brightness / samples : 0 };
}
export function movementFeedback(metrics: MotionMetrics, baseline: number) {
  if (metrics.brightness < 42) return 'The view looks dark. Face a light or brighten the room so movement is easier to see.';
  const adjusted = Math.max(0, metrics.energy - baseline);
  if (adjusted < 3) return 'Movement is low. Try a clear arm shape, step, or gentle weight shift.';
  if (adjusted > 42) return 'Big energy! Stay controlled, protect your space, and keep breathing.';
  return 'Nice movement energy. Keep the timing clear and your shapes intentional.';
}
export function balanceLabel(balance: number) { if (Math.abs(balance) < 14) return 'Centered'; return balance < 0 ? 'More movement on the left' : 'More movement on the right'; }
