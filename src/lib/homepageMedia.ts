import { homepageMediaSlots, programArtwork, careerArtwork, toolArtwork, heroArtwork } from '../data/memberAssetMap';
import { supabase } from './supabase';

export type HomepageMediaOverride = {
  slot_key: string;
  section: string;
  item_name: string;
  default_image_path: string;
  override_image_url: string | null;
  alt_text: string;
  active: boolean;
  published: boolean;
};

export type HomepageMediaSlot = (typeof homepageMediaSlots)[number] & {
  defaultImagePath: string;
};

const defaultForSlot = (slotKey: string) => {
  const [kind, id] = slotKey.split(':');
  if (kind === 'program') return programArtwork[id] || '';
  if (kind === 'career') return careerArtwork[id] || '';
  if (kind === 'hero') return heroArtwork;
  return toolArtwork[id] || '';
};

export function getHomepageMediaSlots(): HomepageMediaSlot[] {
  return homepageMediaSlots.map((slot) => ({ ...slot, defaultImagePath: defaultForSlot(slot.slotKey) }));
}

export async function loadHomepageMediaOverrides(): Promise<Map<string, HomepageMediaOverride>> {
  const result = new Map<string, HomepageMediaOverride>();
  if (!supabase) return result;
  const { data } = await supabase
    .from('homepage_media_overrides')
    .select('slot_key,section,item_name,default_image_path,override_image_url,alt_text,active,published')
    .eq('active', true)
    .eq('published', true);
  for (const row of (data || []) as HomepageMediaOverride[]) {
    if (row.override_image_url?.trim()) result.set(row.slot_key, row);
  }
  return result;
}

export function resolveHomepageMedia(slot: HomepageMediaSlot, overrides: Map<string, HomepageMediaOverride>) {
  return overrides.get(slot.slotKey)?.override_image_url?.trim() || slot.defaultImagePath;
}

export function resolveHomepageMediaUrl(slotKey: string, overrides: Map<string, HomepageMediaOverride>) {
  const slot = getHomepageMediaSlots().find((item) => item.slotKey === slotKey);
  return slot ? resolveHomepageMedia(slot, overrides) : '';
}
