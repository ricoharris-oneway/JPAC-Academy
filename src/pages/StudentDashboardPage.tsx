import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceHero } from '../components/WorkspaceHero';
import { useAuth } from '../context/AuthContext';
import { resolveDisplayName } from '../lib/displayName';
import { continueDestination, loadMyCourses, type AcademyCourse } from '../lib/studentAccess';
import { supabase } from '../lib/supabase';

const dailyPrompts = [
  'Create one 30-second moment today that shows your confidence.',
  'Choose one creative skill and practice it slowly, boldly, and with intention.',
  'Turn one feeling from today into a lyric, movement, scene, sound, or visual idea.',
] as const;

const weeklyChallenges = [
  'Show your growth: rehearse, record, reflect, and share one polished creative moment.',
  'Try one technique outside your comfort zone, then write down what surprised you.',
  'Build a mini showcase that combines preparation, personality, and one brave creative choice.',
] as const;

type CommunityPreviewPost = {
  id: string;
  post_type: string;
  body: string;
  created_at: string;
  is_announcement: boolean;
};

function calendarIndex(period: 'day' | 'week', length: number) {
  const now = new Date();
  const divisor = period === 'day' ? 86_400_000 : 604_800_000;
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / divisor) % length;
}

function readablePostType(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? 'Recently shared'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function loadApprovedCommunityPreview() {
  if (!supabase) return { data: [] as CommunityPreviewPost[], unavailable: true };

  const { data, error } = await supabase
    .from('community_posts')
    .select('id,post_type,body,created_at,is_announcement')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(3);

  return {
    data: error ? [] : ((data as CommunityPreviewPost[] | null) ?? []),
    unavailable: Boolean(error),
  };
}

export function StudentDashboardPage() {
  const { profile, user } = useAuth();
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPreviewPost[]>([]);
  const [communityUnavailable, setCommunityUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    void Promise.all([loadMyCourses(), loadApprovedCommunityPreview()]).then(([courseResult, communityResult]) => {
      if (!active) return;
      setCourses(courseResult.data);
      setMessage(courseResult.error);
      setCommunityPosts(communityResult.data);
      setCommunityUnavailable(communityResult.unavailable);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const recent = useMemo(
    () => [...courses]
      .filter((item) => item.last_accessed_at)
      .sort((a, b) => String(b.last_accessed_at).localeCompare(String(a.last_accessed_at)))[0],
    [courses],
  );
  const destination = useMemo(() => continueDestination(courses), [courses]);
  const dailyPrompt = dailyPrompts[calendarIndex('day', dailyPrompts.length)];
  const weeklyChallenge = weeklyChallenges[calendarIndex('week', weeklyChallenges.length)];
  const displayName = resolveDisplayName(profile, user);
  const welcomeName = displayName.includes('@') ? displayName : displayName.split(' ')[0];
  const xp = profile?.total_xp || 0;

  return <div className="student-access-page creative-home">
    <div className="creative-home-hero">
      <WorkspaceHero
        eyebrow="Your JPAC creative home base"
        title={`Welcome back, ${welcomeName}.`}
        description="Step back into your creative world. Learn, create, share, and grow with the JPAC community."
        environment="lobby"
        ariaLabel="Your creative momentum"
        ariaMessage="A small creative step today can become your next breakthrough."
        actions={<Link className="button button-primary" to={destination.to}>{loading ? 'Loading…' : destination.label}</Link>}
        stats={[
          { icon: '🎓', value: courses.length, label: 'Active programs' },
          { icon: '✨', value: xp.toLocaleString(), label: 'Canonical XP' },
        ]}
      />
    </div>

    {message ? <div className="admin-message">{message}</div> : null}

    <section className="creative-engagement-grid" aria-label="Creative inspiration">
      <article className="creative-engagement-card prompt-card">
        <div className="creative-card-icon" aria-hidden="true">✦</div>
        <div className="eyebrow">Daily Creative Prompt</div>
        <h2>Make one creative moment today.</h2>
        <p>{dailyPrompt}</p>
        <span className="creative-card-note">A fresh prompt appears each day.</span>
      </article>

      <article className="creative-engagement-card challenge-card">
        <div className="creative-card-icon" aria-hidden="true">★</div>
        <div className="eyebrow">Weekly Creative Challenge</div>
        <h2>Stretch your creative voice.</h2>
        <p>{weeklyChallenge}</p>
        <span className="creative-card-note">Create at your pace—this is inspiration, not a graded assignment.</span>
      </article>

      <article className="creative-engagement-card continue-card">
        <div className="creative-card-icon" aria-hidden="true">▶</div>
        <div className="eyebrow">Continue Creating</div>
        <h2>{recent?.title ?? (courses[0]?.title || 'Your next creative step')}</h2>
        <p>{recent
          ? `Pick up where you left off. Last opened ${new Date(recent.last_accessed_at!).toLocaleDateString()}.`
          : courses.length
            ? 'Your active program is ready whenever inspiration strikes.'
            : 'Your programs will appear when an active Academy enrollment is connected.'}</p>
        <Link className="button button-primary" to={destination.to}>{loading ? 'Loading…' : destination.label}</Link>
      </article>

      <article className="creative-engagement-card community-preview-card">
        <div className="community-preview-heading">
          <div>
            <div className="eyebrow">Community Highlights</div>
            <h2>Creative energy from JPAC</h2>
          </div>
          <Link className="text-link" to="/community">Visit Community →</Link>
        </div>
        {communityPosts.length ? <div className="creative-community-list">
          {communityPosts.map((post) => <div key={post.id}>
            <span>{post.is_announcement ? 'JPAC Announcement' : readablePostType(post.post_type)} · {displayDate(post.created_at)}</span>
            <p>{post.body}</p>
          </div>)}
        </div> : <div className="creative-community-fallback">
          <strong>{communityUnavailable ? 'Community inspiration is taking a quick intermission.' : 'Be part of the next creative highlight.'}</strong>
          <p>{communityUnavailable
            ? 'Your approved Community Wall will be ready again soon.'
            : 'Approved celebrations, questions, and encouragement will appear here.'}</p>
        </div>}
        <small className="creative-safety-copy">Posts and showcases are reviewed before they appear.</small>
      </article>
    </section>

    <section className="card card-pad dashboard-access-section">
      <div className="section-head">
        <div><div className="eyebrow">Active programs</div><h2>Your learning</h2></div>
        <Link className="text-link" to="/courses">View all →</Link>
      </div>
      {loading ? <p className="muted">Loading your programs…</p> : courses.length ? <div className="dashboard-course-list">
        {courses.slice(0, 4).map((course) => <article key={course.course_id}>
          <div>
            <strong>{course.title}</strong>
            <small>{Math.round(Number(course.progress || 0))}% active-level mastery · Level {course.enrollment_level}</small>
          </div>
          <div className="access-progress"><i style={{ width: `${Math.min(100, Number(course.progress || 0))}%` }} /></div>
          <Link className="button button-secondary" to={`/courses/${course.course_id}`}>{Number(course.progress) > 0 ? 'Continue' : 'Open'}</Link>
        </article>)}
      </div> : <div className="access-empty">
        <span>🔒</span>
        <h3>No active courses yet</h3>
        <p className="muted">Your programs will appear after an active Academy enrollment is synchronized or created by JPAC staff.</p>
      </div>}
    </section>
  </div>;
}
