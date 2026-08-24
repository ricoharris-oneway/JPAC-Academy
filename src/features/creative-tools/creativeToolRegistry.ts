import type { ComponentType } from 'react';
import { HarmonyBuilderTool } from './harmony/HarmonyBuilderTool';
import { SmartMetronomeTool } from './metronome/SmartMetronomeTool';
import { NotationTrainerTool } from './notation/NotationTrainerTool';
import { LoopBuilderTool } from './loop/LoopBuilderTool';
import { VirtualPianoTool } from './piano/VirtualPianoTool';

export type PremiumToolDefinition = { slug: string; title: string; icon: string; description: string; component: ComponentType };
export const premiumCreatorTools: PremiumToolDefinition[] = [
  { slug: 'harmony-builder', title: 'Harmony Builder', icon: '🎼', description: 'Build chord progressions for Pop, R&B, Gospel, Blues, Country, and cinematic ideas.', component: HarmonyBuilderTool },
  { slug: 'virtual-piano', title: 'Virtual Piano', icon: '🎹', description: 'Play two octaves, explore chord pads, and practice locally with Web Audio.', component: VirtualPianoTool },
  { slug: 'smart-metronome', title: 'Smart Metronome', icon: '⏱️', description: 'Strengthen your timing with accents, subdivisions, tap tempo, and visual beats.', component: SmartMetronomeTool },
  { slug: 'notation-trainer', title: 'Notation Trainer Pro', icon: '🎵', description: 'Practice treble and bass clef notes, rhythm values, and sketch a 64-bar score.', component: NotationTrainerTool },
  { slug: 'loop-builder', title: 'Loop Builder / Beat Lab', icon: '🥁', description: 'Create a 16-step groove with synthesized drums, bass, presets, and a live playhead.', component: LoopBuilderTool },
];
const aliases: Record<string, string> = { 'harmony-stack-pad': 'harmony-builder', 'jpac-virtual-piano': 'virtual-piano', metronome: 'smart-metronome', 'notation-trainer-pro': 'notation-trainer', 'music-reading-tool': 'notation-trainer', 'rhythm-reading': 'notation-trainer', 'beat-lab': 'loop-builder', 'loop-builder-songwriter': 'loop-builder', 'jpac-loop-builder': 'loop-builder', 'drum-sequencer': 'loop-builder' };
export function getPremiumCreatorTool(slug?: string) { const canonical = slug ? aliases[slug] || slug : ''; return premiumCreatorTools.find((tool) => tool.slug === canonical); }
