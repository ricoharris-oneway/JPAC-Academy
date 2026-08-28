import '../../styles/guided-avatar.css';

export function GuidedAvatar({ speaking = false, size = 'large' }: { speaking?: boolean; size?: 'small' | 'large' }): JSX.Element {
  return <span className={`guided-avatar guided-avatar-${size} ${speaking ? 'is-speaking' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 96 96" role="img">
      <defs>
        <linearGradient id="aria-jpac-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#5b2a82"/><stop offset="1" stopColor="#24112f"/></linearGradient>
      </defs>
      <circle cx="48" cy="48" r="47" fill="url(#aria-jpac-bg)" stroke="#e4bd57" strokeWidth="2"/>
      <g fill="#251420">
        <circle cx="29" cy="30" r="13"/><circle cx="42" cy="23" r="14"/><circle cx="56" cy="24" r="14"/><circle cx="68" cy="33" r="13"/><circle cx="26" cy="43" r="11"/><circle cx="70" cy="45" r="11"/>
      </g>
      <path d="M28 45c0-19 9-29 20-29s21 10 21 29c0 19-9 32-21 32S28 64 28 45Z" fill="#8d5037"/>
      <path d="M29 43c4-2 8-9 10-17 7 7 18 10 29 9 1 3 1 7 1 10-5-6-8-9-11-13-7 6-17 10-29 11Z" fill="#251420"/>
      <ellipse cx="40" cy="49" rx="2.4" ry="2" fill="#201319"/><ellipse cx="57" cy="49" rx="2.4" ry="2" fill="#201319"/>
      <path d="M41 60c4 4 10 4 15 0" fill="none" stroke="#fff0e6" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M31 53c-6 0-6 12 0 12M66 53c6 0 6 12 0 12" fill="none" stroke="#e4bd57" strokeWidth="2"/>
      <path d="M21 91c3-14 13-22 27-22s24 8 27 22" fill="#6a3291"/><path d="M44 71l4 9 5-9" fill="#e4bd57"/>
    </svg>
    {speaking ? <i className="guided-avatar-speaking"><b/><b/><b/></i> : null}
  </span>;
}
