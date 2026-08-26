import type { InstructorActivity } from '../shared/InstructorActivityPanel';

export type MotionMetrics = { energy: number; balance: number; brightness: number };
export const choreoGoals = ['Warm up movement', 'Learn choreography', 'Improve stage presence', 'Practice freestyle', 'Build performance confidence'] as const;
export type ChoreoGoal = typeof choreoGoals[number];
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
export function viewQualityLabel(brightness: number) { return brightness < 42 ? 'Needs more light' : 'View is clear'; }

export const choreoHelpers = [
  ['Reference Frame', 'Use the left side as the teacher, routine, or movement target you are following.'],
  ['Tracking Frame', 'Your private live mirror appears on the right and stays inside this browser.'],
  ['Motion energy', 'Frame differences estimate how much movement is happening—not how well you dance.'],
  ['Balance', 'Balance compares visible motion across the left and right halves of the tracking frame.'],
  ['Stage presence', 'Clear focus, posture, intentional shapes, and confident stillness help tell the story.'],
] as const;

export const choreoActivities: readonly InstructorActivity[] = [
  { id: 'posture', title: 'Stage-Ready Posture', coachFocus: 'Use alignment, focus, and intentional stillness.', task: 'Practice entering a confident ready position.', steps: ['Choose Stage Presence.', 'Start the camera.', 'Check the Reference Frame target.', 'Calibrate in a neutral position.', 'Hold a confident shape, then stop.'], successTarget: 'Your position looks intentional and remains controlled without unnecessary movement.', nextMove: 'Add one clear entrance and return to the ready shape.', reflectionPrompt: 'What made your posture feel stage-ready?' },
  { id: 'eight-count', title: 'Clean 8-Count', coachFocus: 'Make the beginning, accents, and ending easy to recognize.', task: 'Repeat one short eight-count with consistent timing.', steps: ['Choose Choreography mode.', 'Start the camera.', 'Mark the reference timing.', 'Repeat one eight-count twice.', 'Check energy and balance, then stop.'], successTarget: 'Both repetitions have a clear start, matching accents, and a finished ending.', nextMove: 'Try the same eight-count with smaller, cleaner movement.', reflectionPrompt: 'Which count needs the most attention?' },
  { id: 'freestyle', title: 'Freestyle Confidence', coachFocus: 'Develop one movement idea instead of rushing through many ideas.', task: 'Create, repeat, and vary one freestyle phrase.', steps: ['Choose Freestyle.', 'Start the camera.', 'Create one movement idea.', 'Repeat it with a level or direction change.', 'Finish in a confident still shape.'], successTarget: 'Your phrase has one recognizable idea and one intentional variation.', nextMove: 'Repeat it with a different energy quality.', reflectionPrompt: 'Which choice made the phrase feel like you?' },
  { id: 'balance', title: 'Balance and Spacing', coachFocus: 'Use both sides of your practice space safely and intentionally.', task: 'Explore centered, left, and right movement without leaving the frame.', steps: ['Clear your safe practice area.', 'Start and calibrate the camera.', 'Move left, center, then right.', 'Watch the balance feedback.', 'Return to center and stop.'], successTarget: 'You use the space intentionally and stay visible with controlled movement.', nextMove: 'Add a direction change while keeping your ending centered.', reflectionPrompt: 'Which side of the space felt easiest to use?' },
  { id: 'showcase', title: 'Showcase Performance Run', coachFocus: 'Combine timing, energy, focus, and a clear finish.', task: 'Complete one short performance-quality run.', steps: ['Choose your performance goal.', 'Start and calibrate the camera.', 'Check your reference target.', 'Perform the phrase with clear focus.', 'Hold the ending, stop, and save locally.'], successTarget: 'The run has a prepared start, intentional energy, and a confident ending.', nextMove: 'Choose one improvement for the next run—not five.', reflectionPrompt: 'What is the one strongest part of your run?' },
];
