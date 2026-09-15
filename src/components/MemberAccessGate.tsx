import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { courseLockedMessage, enrollmentRequestUrl } from '../data/memberPrograms';

// A UI boundary in addition to the existing RPC/RLS authorization. Fail closed.
export function MemberAccessGate({ children, anyCourse = false }: { children: ReactNode; anyCourse?: boolean }) {
  const { courseId } = useParams();
  const { user, profile } = useAuth();
  const [result, setResult] = useState({ key: '', allowed: false, error: false });
  const [attempt, setAttempt] = useState(0);
  const key = `${user?.id}:${courseId || 'any'}:${attempt}`;
  const staff = !!profile && profile.role !== 'student';
  useEffect(() => {
    if (staff) return;
    let active = true;
    async function check() {
      try {
        if (!supabase) throw new Error('Configuration missing');
        const { data, error } = anyCourse
          ? await supabase.rpc('jpac_my_academy_courses')
          : await supabase.rpc('jpac_student_has_course_access', { target_course: courseId });
        if (active) setResult({ key, allowed: !error && (anyCourse ? Array.isArray(data) && data.length > 0 : data === true), error: !!error });
      } catch { if (active) setResult({ key, allowed: false, error: true }); }
    }
    void check();
    return () => { active = false; };
  }, [key, courseId, anyCourse, staff]);
  // Recheck on return to this tab, including access revoked by staff elsewhere.
  useEffect(() => { const refresh = () => setAttempt(value => value + 1); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, []);
  if (staff) return <>{children}</>;
  if (result.key !== key) return <div className="card card-pad" role="status">Checking course access…</div>;
  if (!result.allowed) return <section className="card card-pad locked-course"><span aria-hidden="true">🔒</span><h1>{anyCourse ? 'Unlock your course experience' : 'Course access locked'}</h1><p>{result.error ? 'We could not verify course access. Please retry.' : courseLockedMessage}</p><p>You can keep exploring with your free member account.</p><div className="welcome-actions"><Link className="button button-secondary" to="/programs">Explore Programs</Link><a className="button button-primary" href={enrollmentRequestUrl}>Request Enrollment</a><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Retry access check</button></div></section>;
  return <>{children}</>;
}
