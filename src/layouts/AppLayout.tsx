import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { academyConfig } from '../config/academy';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth, type AppRole } from '../context/AuthContext';
import { resolveDisplayName } from '../lib/displayName';

const nav = [
  ['Home', '/', '✨', ['student', 'teacher', 'admin', 'developer']],
  ['My Academy', '/courses', '🎓', ['student']],
  ['Practice Submissions', '/practice-coach', '🎧', ['student', 'teacher', 'admin', 'developer']],
  ['Student Intelligence', '/student-intelligence', '🧬', ['student', 'teacher', 'admin', 'developer']],
  ['Teacher Studio', '/teacher', '👥', ['teacher', 'admin', 'developer']],
  ['Curriculum Studio', '/curriculum', '🧩', ['teacher', 'admin', 'developer']],
  ['Certificates & Portfolio', '/certificates', '📜', ['student', 'teacher', 'admin', 'developer']],
  ['Creative Studio', '/studio', '🎨', ['student', 'teacher', 'admin', 'developer']],
  ['Enrollment Manager', '/enrollment', '🚪', ['admin', 'developer']],
  ['Admissions Center', '/manual-student', '🎟️', ['admin', 'developer']],
  ['JPAC LAB Manager', '/lab-manager', '🧰', ['admin', 'developer']],
  ['Admin Center', '/admin', '🛡️', ['admin', 'developer']],
] as const;

export function AppLayout() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (profile?.role || 'student') as AppRole;
  const name = resolveDisplayName(profile, user);
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return <div className={`app-shell ${mobileOpen ? 'mobile-nav-open' : ''}`}>
    <button className="mobile-nav-shade" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
    <aside className="sidebar" aria-label="Academy navigation">
      <button className="mobile-close-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>×</button>
      <div className="brand"><img src="/assets/jpac-official-logo.png.png" alt="J. Moné's Performing Arts Center" /><div><h1>{academyConfig.shortName}</h1><p>{academyConfig.tagline}</p></div></div>
      <div className="authenticated-role"><span>Signed in as</span><strong>{role.replace('_', ' ')}</strong></div>
      <nav className="nav" aria-label="Workspace menu">{nav.filter((item) => (item[3] as readonly string[]).includes(role)).map((item) => <NavLink key={item[1]} to={item[1]} end={item[1] === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><b>{item[2]}</b><span>{item[0]}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><span className="avatar">{initials}</span><div><strong>{name}</strong><small>{user?.email}</small></div><button className="logout-button" onClick={() => void signOut()}>Sign out</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu-button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>☰</button><div><strong>JPAC Academy · Creative Operating System</strong><div className="muted">Learning and creative operations in one workspace</div></div><div className="topbar-actions"><div className="status">● {isSupabaseConfigured ? 'Supabase configured' : 'Supabase key needed'}</div></div></header>
      <div className="content" key={location.pathname}><Outlet /></div>
    </main>
  </div>;
}
