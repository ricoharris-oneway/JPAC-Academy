import { supabase } from './supabase';
import type { Activity, Course, Lesson, Media, Module } from './moduleReadiness';

// Page all five reads: a truncated table must never make curriculum appear missing.
async function readAll<T>(table: string, columns: string, published = false): Promise<T[]> {
  if (!supabase) throw new Error('Supabase configuration is required to load readiness.');
  const rows: T[] = [];
  const pageSize = 500;
  for (let offset = 0; ;) {
    let query = supabase.from(table).select(columns, { count: 'exact' }).order('id').range(offset, offset + pageSize - 1);
    if (published) query = query.eq('status', 'published');
    const { data, error, count } = await query;
    if (error) throw new Error(`Unable to read ${table}: ${error.message}`);
    rows.push(...(data as unknown as T[] || []));
    offset += data?.length || 0;
    if (count === null) throw new Error(`Unable to verify complete ${table} results.`);
    if (offset >= count) return rows;
    if (!data?.length) throw new Error(`Incomplete ${table} results. Retry readiness.`);
  }
}

export async function loadModuleReadiness() {
  const [courses, modules, lessons, activities, media] = await Promise.all([
    readAll<Course>('courses', 'id,title,slug,status', true),
    readAll<Module>('course_modules', 'id,course_id,title,status,sort_order,level_module_number,description,ai_summary,learning_objectives,career_connection,active_instructional_media_id,primary_video_url,video_title,video_provider', true),
    readAll<Lesson>('lessons', 'id,module_id,title,status'),
    readAll<Activity>('activities', 'id,module_id,lesson_id,title,status'),
    readAll<Media>('module_instructional_media', 'id,module_id,status,title,provider,normalized_url,source_url'),
  ]);
  return { courses: courses.sort((a, b) => a.title.localeCompare(b.title)), modules: modules.sort((a, b) => a.sort_order - b.sort_order), lessons, activities, media };
}
