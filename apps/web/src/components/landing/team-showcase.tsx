'use client';

import Image from 'next/image';
import {SocialIcon} from '@/components/layout/social-disclosure';
import { useEffect, useRef } from 'react';
import type { Locale } from '@amc/shared';
import { Link } from '@/i18n/navigation';
import { SolarIcon, type SolarName } from '@/components/ui/solar-icon';
import { DirectorsReel } from './directors-reel';

interface TeamMember {
  id: string;
  badge: string;
  featured?: boolean;
  photo?: string;
  photoPosition?: string;
  linkedinUrl?: string;
  name: { en: string; ar: string };
  role: { en: string; ar: string };
  discipline: { en: string; ar: string };
  avatarType: 'ceo' | 'co_ceo' | 'coo' | 'creative' | 'growth' | 'tech' | 'operations' | 'client';
}

const careerIcons: Record<TeamMember['avatarType'], SolarName> = {
  ceo: 'chart-2-linear', co_ceo: 'case-round-linear', coo: 'layers-linear',
  creative: 'star-linear', growth: 'chart-2-linear', tech: 'code-square-linear',
  operations: 'calendar-linear', client: 'chat-round-line-linear',
};

const surroundingIcons: Record<TeamMember['avatarType'], [SolarName, SolarName, SolarName, SolarName]> = {
  ceo: ['chart-2-linear', 'star-linear', 'compass-linear', 'case-round-linear'],
  co_ceo: ['case-round-linear', 'users-group-rounded-linear', 'chart-2-linear', 'compass-linear'],
  coo: ['layers-linear', 'calendar-linear', 'check-circle-linear', 'users-group-rounded-linear'],
  creative: ['star-linear', 'layers-linear', 'lightbulb-linear', 'compass-linear'],
  growth: ['chart-2-linear', 'global-linear', 'compass-linear', 'users-group-rounded-linear'],
  tech: ['code-square-linear', 'layers-linear', 'monitor-linear', 'widget-2-linear'],
  operations: ['calendar-linear', 'check-circle-linear', 'layers-linear', 'case-round-linear'],
  client: ['chat-round-line-linear', 'users-group-rounded-linear', 'chart-2-linear', 'case-round-linear'],
};

function CareerAccents({ type, surrounding = false }: { type: TeamMember['avatarType']; surrounding?: boolean }) {
  const icons: SolarName[] = surrounding ? surroundingIcons[type] : [careerIcons[type], type === 'tech' ? 'layers-linear' : 'star-linear'];
  const positions = ['team-career-icon', 'team-career-orbit', 'team-career-extra-1', 'team-career-extra-2'];
  return <div className={`team-career-accents career-${type}`} aria-hidden="true">
    {icons.map((name, index) => <span key={name} className={positions[index]}><SolarIcon name={name} /></span>)}
  </div>;
}

const CEO_MEMBER: TeamMember = {
  "id": "ceo",
  photo: "/images/team/khaled-morad.webp",
  "badge": "CEO",
  "name": {
    "en": "Eng. Khaled Morad",
    "ar": "\u0645. \u062e\u0627\u0644\u062f \u0645\u0631\u0627\u062f"
  },
  "role": {
    "en": "Chief Executive Officer",
    "ar": "\u0627\u0644\u0631\u0626\u064a\u0633 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a"
  },
  "discipline": {
    "en": "Chief Executive Officer",
    "ar": "\u0627\u0644\u0631\u0626\u064a\u0633 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a"
  },
  "avatarType": "ceo",
  "featured": true
};
const CO_LEADERSHIP: readonly TeamMember[] = [
  {
    "id": "co-ceo",
    linkedinUrl: "https://www.linkedin.com/in/mohamed-khaled-morad-97882a1b0/",
    photo: "/images/team/mohamed-khaled-morad.webp",
    "badge": "CO-CEO",
    "name": {
      "en": "Eng. Mohamed Khaled Morad",
      "ar": "\u0645. \u0645\u062d\u0645\u062f \u062e\u0627\u0644\u062f \u0645\u0631\u0627\u062f"
    },
    "role": {
      "en": "Co-Chief Executive Officer",
      "ar": "\u0627\u0644\u0631\u0626\u064a\u0633 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a \u0627\u0644\u0645\u0634\u0627\u0631\u0643"
    },
    "discipline": {
      "en": "Co-Chief Executive Officer",
      "ar": "\u0627\u0644\u0631\u0626\u064a\u0633 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a \u0627\u0644\u0645\u0634\u0627\u0631\u0643"
    },
    "avatarType": "co_ceo"
  },
  {
    "id": "coo",
    photo: "/images/team/belal-khaled-morad.webp",
    "badge": "COO",
    "name": {
      "en": "Dr. Belal Khaled Morad",
      "ar": "\u062f. \u0628\u0644\u0627\u0644 \u062e\u0627\u0644\u062f \u0645\u0631\u0627\u062f"
    },
    "role": {
      "en": "Chief Operating Officer",
      "ar": "\u0631\u0626\u064a\u0633 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a"
    },
    "discipline": {
      "en": "Chief Operating Officer",
      "ar": "\u0631\u0626\u064a\u0633 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a"
    },
    "avatarType": "coo"
  }
];
const CORE_TEAM: readonly TeamMember[] = [
  {
    "id": "research",
    "name": {
      "en": "Farah Mohamed",
      "ar": "\u0641\u0631\u062d \u0645\u062d\u0645\u062f"
    },
    "role": {
      "en": "R&D Specialist",
      "ar": "\u0623\u062e\u0635\u0627\u0626\u064a\u0629 \u0628\u062d\u062b \u0648\u062a\u0637\u0648\u064a\u0631"
    },
    "discipline": {
      "en": "Research, Insights & New Ideas",
      "ar": "\u0627\u0644\u0628\u062d\u062b \u0648\u0627\u0644\u0631\u0624\u0649 \u0648\u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629"
    },
    "badge": "RESEARCH & DEVELOPMENT",
    "avatarType": "creative"
  },
  {
    "id": "research-fatma",
    "name": {
      "en": "Dr. Fatma Ahmed",
      "ar": "\u062f. \u0641\u0627\u0637\u0645\u0629 \u0623\u062d\u0645\u062f"
    },
    "role": {
      "en": "R&D Specialist",
      "ar": "\u0623\u062e\u0635\u0627\u0626\u064a\u0629 \u0628\u062d\u062b \u0648\u062a\u0637\u0648\u064a\u0631"
    },
    "discipline": {
      "en": "Research, Insights & New Ideas",
      "ar": "\u0627\u0644\u0628\u062d\u062b \u0648\u0627\u0644\u0631\u0624\u0649 \u0648\u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629"
    },
    "badge": "RESEARCH & DEVELOPMENT",
    "avatarType": "creative"
  },
  {
    "id": "growth",
    "name": {
      "en": "Omar Allam",
      "ar": "\u0639\u0645\u0631 \u0639\u0644\u0627\u0645"
    },
    "role": {
      "en": "Digital Marketing Specialist",
      "ar": "\u0623\u062e\u0635\u0627\u0626\u064a \u062a\u0633\u0648\u064a\u0642"
    },
    "discipline": {
      "en": "Campaigns, Audiences & Brand Growth",
      "ar": "\u0627\u0644\u062d\u0645\u0644\u0627\u062a \u0648\u0627\u0644\u062c\u0645\u0647\u0648\u0631 \u0648\u0646\u0645\u0648 \u0627\u0644\u0639\u0644\u0627\u0645\u0629"
    },
    "badge": "MARKETING",
    "avatarType": "growth",
    "photo": "/images/team/omar-allam.webp",
    "linkedinUrl": "https://www.linkedin.com/in/omar3llam/"
  },
  {
    "id": "tech",
    "name": {
      "en": "Ahmed Soliman",
      "ar": "\u0623\u062d\u0645\u062f \u0633\u0644\u064a\u0645\u0627\u0646"
    },
    "role": {
      "en": "Full-Stack Engineer & Web Developer",
      "ar": "\u0645\u0647\u0646\u062f\u0633 \u0628\u0631\u0645\u062c\u064a\u0627\u062a \u0645\u062a\u0643\u0627\u0645\u0644\u0629 \u0648\u0645\u0637\u0648\u0631 \u0648\u064a\u0628"
    },
    "discipline": {
      "en": "Web Platforms, Engineering & E-Commerce",
      "ar": "\u0645\u0646\u0635\u0627\u062a \u0627\u0644\u0648\u064a\u0628 \u0648\u0627\u0644\u0647\u0646\u062f\u0633\u0629 \u0648\u0627\u0644\u062a\u062c\u0627\u0631\u0629 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0629"
    },
    "badge": "SOFTWARE ENGINEERING",
    "avatarType": "tech",
    "photo": "/images/team/ahmed-soliman.webp",
    "linkedinUrl": "https://www.linkedin.com/in/iamahmedsoliman/",
    "photoPosition": "50% 80%"
  },
  {
    "id": "moderation",
    "name": {
      "en": "Mayar Alaa",
      "ar": "\u0645\u064a\u0627\u0631 \u0639\u0644\u0627\u0621"
    },
    "role": {
      "en": "Front office receptionist & Social Media Moderation",
      "ar": "\u0623\u062e\u0635\u0627\u0626\u064a\u0629 \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062a\u0641\u0627\u0639\u0644"
    },
    "discipline": {
      "en": "Content, Community & Engagement",
      "ar": "\u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0648\u0627\u0644\u0645\u062c\u062a\u0645\u0639 \u0648\u0627\u0644\u062a\u0641\u0627\u0639\u0644"
    },
    "badge": "SOCIAL MEDIA & MODERATION",
    "avatarType": "client",
    "photo": "/images/team/mayar-alaa.webp",
    "linkedinUrl": "https://www.linkedin.com/in/mayar-alaa-722523447/"
  },
  {
    "id": "client",
    "name": {
      "en": "Alaa Hassan",
      "ar": "\u0622\u0644\u0627\u0621 \u062d\u0633\u0646"
    },
    "role": {
      "en": "Account Manager",
      "ar": "\u0645\u062f\u064a\u0631\u0629 \u062d\u0633\u0627\u0628\u0627\u062a"
    },
    "discipline": {
      "en": "Account Growth, Reporting & Value",
      "ar": "\u0646\u0645\u0648 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0648\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u0648\u0627\u0644\u0642\u064a\u0645\u0629"
    },
    "badge": "ACCOUNT MANAGEMENT",
    "avatarType": "client",
    "photo": "/images/team/alaa-hassen.webp",
    "linkedinUrl": "https://www.linkedin.com/in/alaa-hassan-722523447/"
  }
];

function MemberPortrait({member, locale, featured=false}: {member: TeamMember; locale: Locale; featured?: boolean}) {
  return member.photo ? <Image unoptimized src={member.photo} alt={member.name[locale]} fill sizes="(max-width: 767px) 70vw, 260px" style={{objectFit: 'cover', objectPosition: member.photoPosition || '50% 25%'}}/> : <ExecutivePortraitSvg type={member.avatarType} isFeatured={featured}/>;
}

function MemberLinkedIn({member, locale}: {member: TeamMember; locale: Locale}) {
  // Publish only explicitly supplied personal profile URLs.
  if (!member.linkedinUrl || !/^https:\/\/(www\.)?linkedin\.com\/in\/[^/?#]+\/?$/.test(member.linkedinUrl)) return null;
  const label = `${member.name[locale]} - LinkedIn`;
  return <a className="team-linkedin icon-button rounded-squircle-md" href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><SocialIcon name="linkedin"/></a>;
}

function ExecutivePortraitSvg({ type, isFeatured }: { type: TeamMember['avatarType']; isFeatured?: boolean }) {
  return (
    <svg
      viewBox="0 0 420 460"
      className="lp-team-portrait-svg"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`bg-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#191610" />
          <stop offset="55%" stopColor="#0E0C09" />
          <stop offset="100%" stopColor="#080705" />
        </linearGradient>
        <radialGradient id={`halo-${type}`} cx="50%" cy="36%" r="55%">
          <stop offset="0%" stopColor="#BE9D5B" stopOpacity={isFeatured ? '0.42' : '0.26'} />
          <stop offset="60%" stopColor="#7A5F28" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0B0A08" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`suit-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#26221B" />
          <stop offset="100%" stopColor="#0D0B08" />
        </linearGradient>
        <linearGradient id={`gold-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5F1E7" />
          <stop offset="45%" stopColor="#D8BE86" />
          <stop offset="100%" stopColor="#7A5F28" />
        </linearGradient>
      </defs>

      {/* Studio Portrait Backdrop */}
      <rect width="420" height="460" fill={`url(#bg-${type})`} />
      <rect width="420" height="460" fill={`url(#halo-${type})`} />

      {/* Architectural Grid Lines */}
      <g stroke="rgba(216, 190, 134, 0.08)" strokeWidth="1">
        <line x1="70" y1="0" x2="70" y2="460" />
        <line x1="210" y1="0" x2="210" y2="460" />
        <line x1="350" y1="0" x2="350" y2="460" />
        <line x1="0" y1="130" x2="420" y2="130" />
        <line x1="0" y1="280" x2="420" y2="280" />
      </g>

      {/* Halo Ring Behind Executive Silhouette */}
      <circle
        cx="210"
        cy="175"
        r={isFeatured ? '108' : '92'}
        fill="none"
        stroke={`url(#gold-${type})`}
        strokeWidth={isFeatured ? '2' : '1.2'}
        strokeDasharray={isFeatured ? 'none' : '6 6'}
        opacity="0.65"
      />
      {isFeatured && (
        <circle
          cx="210"
          cy="175"
          r="126"
          fill="none"
          stroke="rgba(190, 157, 91, 0.25)"
          strokeWidth="1"
        />
      )}

      {/* Stylized Executive Bust & Tailored Suit Silhouette */}
      <g>
        {/* Shoulders & Suit Jacket */}
        <path
          d="M65 460 C68 345 125 296 210 296 C295 296 352 345 355 460 Z"
          fill={`url(#suit-${type})`}
          stroke="rgba(216, 190, 134, 0.45)"
          strokeWidth="2"
        />
        {/* Crisp Lapel & Collar Geometry */}
        <path
          d="M168 298 L210 385 L252 298"
          fill="none"
          stroke={`url(#gold-${type})`}
          strokeWidth="2.2"
        />
        {(type === 'ceo' || type === 'co_ceo') && (
          <path
            d="M204 328 L216 328 L220 415 L210 430 L200 415 Z"
            fill="#BE9D5B"
            opacity="0.85"
          />
        )}

        {/* Executive Head & Sculpted Lighting Contour */}
        <rect x="191" y="242" width="38" height="58" rx="14" fill="#211D16" />
        <ellipse
          cx="210"
          cy="182"
          rx="54"
          ry="68"
          fill="#2A241B"
          stroke={`url(#gold-${type})`}
          strokeWidth="2.2"
        />
        {/* Rim-Lit Facial Structure Highlight */}
        <path
          d="M174 152 C188 128 232 128 246 152"
          fill="none"
          stroke="rgba(245, 241, 231, 0.35)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Glasses / Visor Details */}
        {type === 'ceo' && (
          <g stroke="#D8BE86" strokeWidth="2" fill="rgba(11,10,8,0.45)">
            <rect x="174" y="166" width="30" height="18" rx="4" />
            <rect x="216" y="166" width="30" height="18" rx="4" />
            <line x1="204" y1="174" x2="216" y2="174" />
          </g>
        )}
        {type === 'creative' && (
          <circle cx="232" cy="174" r="14" fill="none" stroke="#BE9D5B" strokeWidth="2" />
        )}
      </g>

      {/* Top Corner Studio Watermark */}
      <g transform="translate(24, 26)">
        <rect width="84" height="26" rx="8" fill="rgba(11, 10, 8, 0.78)" stroke="rgba(190, 157, 91, 0.45)" />
        <text x="42" y="17" textAnchor="middle" fill="#D8BE86" fontSize="10" fontWeight="700" fontFamily="monospace">
          {type === 'ceo' ? 'FOUNDER' : type === 'co_ceo' || type === 'coo' ? 'EXECUTIVE' : 'LEADERSHIP'}
        </text>
      </g>
    </svg>
  );
}

export function TeamShowcase({ locale, standalone = false }: { locale: Locale; standalone?: boolean }) {
  const Heading = standalone ? 'h1' : 'h2';
  const isAr = locale === 'ar';
  const ceo = CEO_MEMBER;
  const teamRoot = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = teamRoot.current;
    if (!element) return;
    const visibility = () => { element.dataset.pageVisible = String(!document.hidden); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting); });
    }, { rootMargin: '40px' });
    element.querySelectorAll('.director-portrait-stage').forEach(stage => observer.observe(stage));
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { (entry.target as HTMLElement).dataset.cardInView = String(entry.isIntersecting); });
    }, { rootMargin: '0px 0px -8% 0px' });
    element.querySelectorAll('.team-card-reveal').forEach(card => revealObserver.observe(card));
    return () => { observer.disconnect(); revealObserver.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  return (
    <section ref={teamRoot} id="chapter-team" aria-labelledby="team-title" className="lp-team-section my-20">
      {/* Section Header */}
      <div className="lp-team-header mb-12" data-reveal>
        <div>
          <p className="eyebrow badge badge-accent rounded-squircle-md mb-4">
            <span className="badge-dot" aria-hidden="true" />
            <span>{isAr ? 'القيادة وفريق الاستوديو' : 'LEADERSHIP & STUDIO TEAM'}</span>
          </p>
          <Heading id="team-title" className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            {isAr
              ? 'رؤية يقودها المؤسسون. وتنفيذ بمعايير عالمية.'
              : 'Meet the minds shaping your next chapter.'}
          </Heading>
        </div>
        <div>
          <p className="text-lg text-[var(--fg-muted)] leading-relaxed mb-6">
            {isAr
              ? 'نجمع بين القيادة الاستراتيجية المباشرة وخبراء الهوية والإعلان والهندسة الرقمية لنضمن لك تواصلاً مباشراً مع صناع القرار في كل مشروع.'
              : 'Direct partner-level leadership backed by multidisciplinary specialists across brand architecture, media performance, and full-stack engineering.'}
          </p>
          <p className="lp-team-preview-note">
            {isAr ? 'الأسماء والأدوار معتمدة من المراد AMC. نعرض صور الفريق المتاحة، والرسوم المتبقية توضيحية مؤقتة.' : 'Team names and roles supplied by ALMORAD AMC. Supplied team photographs are shown where available; remaining illustrations are placeholders.'}
          </p>
          <Link href="/booking" className="button button-primary rounded-squircle-md">
            <span>{isAr ? 'احجز جلسة استراتيجية مع الفريق' : 'Book a Strategy Session with Us'}</span>
            <SolarIcon name="arrow-right-up-linear" />
          </Link>
          <a href="#directors" className="button button-secondary team-directors-link">
            {isAr ? 'تعرّف على مديري التخصصات' : 'Meet the discipline leads'}
            <SolarIcon name="arrow-down-linear" />
          </a>
        </div>
      </div>

      {/* 1. Featured CEO Spotlight Card */}
      <article
        data-team-card
        data-scroll-card
        className="lp-team-ceo-card glass-surface rounded-squircle-xl mb-8"
      >
        <div className="lp-team-ceo-portrait rounded-squircle-lg">
          <MemberPortrait member={ceo} locale={locale} featured/>
          {!ceo.photo && <span className="lp-team-verified-pill">
            <span className="badge-dot" aria-hidden="true" />
            <span>{isAr ? 'رسم توضيحي مؤقت · CEO' : 'ILLUSTRATION PLACEHOLDER · CEO'}</span>
          </span>}
        </div>

        <div className="lp-team-ceo-content">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="team-title-badge badge rounded-squircle-sm">{ceo.badge}</span>
          </div>

          <h3 className="lp-team-ceo-name">{ceo.name[locale]}</h3>
          <MemberLinkedIn member={ceo} locale={locale}/>

          <div className="lp-team-ceo-actions">
            <Link href="/booking" className="button button-primary rounded-squircle-md">
              <span>{isAr ? 'احجز اجتماعاً' : 'Book a meeting'}</span>
              <SolarIcon name="arrow-right-up-linear" />
            </Link>
            <Link href="/contact" className="button button-secondary rounded-squircle-md">
              <span>{isAr ? 'تواصل مع مكتب الإدارة' : 'Direct Inquiry'}</span>
              <SolarIcon name="arrow-right-linear" />
            </Link>
          </div>
        </div>
      </article>

      {/* 2. Co-Leadership Row: Co-CEO & COO */}
      <div className="lp-team-sub-header mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">
          {isAr ? 'القيادة التنفيذية المشاركة (Co-CEO & COO)' : 'CO-EXECUTIVE & OPERATIONS LEADERSHIP'}
        </h3>
      </div>
      <div className="lp-team-grid-2 mb-10">
        {CO_LEADERSHIP.map((member) => (
          <div key={member.id} className="team-card-reveal">
          <article
            data-team-card
            className="lp-team-card lp-team-portrait-card glass-surface rounded-squircle-xl"
          >
            <div className="director-portrait-stage">
              <div className="lp-team-card-portrait rounded-squircle-lg">
                <MemberPortrait member={member} locale={locale} featured/>
              </div>
              <CareerAccents type={member.avatarType} surrounding />
            </div>

            <div className="lp-team-card-body">
              <span className="team-title-badge lp-team-card-badge director-card-kicker badge rounded-squircle-sm">{member.badge}</span>
              <h4 className="lp-team-card-title">{member.name[locale]}</h4>
              <p className="lp-team-card-role">{member.role[locale]}</p><MemberLinkedIn member={member} locale={locale}/>
            </div>
          </article>
          </div>
        ))}
      </div>

      {/* 3. Team of 5 Discipline Leads */}
      <DirectorsReel locale={locale} count={CORE_TEAM.length}>
        {CORE_TEAM.map((member) => (
          <div key={member.id} className="team-card-reveal">
          <article
            data-team-card
            data-director-slide
            className="lp-team-card lp-team-portrait-card glass-surface rounded-squircle-xl"
          >
            <div className="director-portrait-stage">
              <div className="lp-team-card-portrait rounded-squircle-lg">
                <MemberPortrait member={member} locale={locale}/>
              </div>
              <CareerAccents type={member.avatarType} surrounding />
            </div>

            <div className="lp-team-card-body">
              <span className="team-title-badge lp-team-card-badge director-card-kicker badge rounded-squircle-sm">{member.badge}</span>
              <h4 className="lp-team-card-title text-lg">{member.name[locale]}</h4>
              <p className="lp-team-card-role text-xs">{member.role[locale]}</p><MemberLinkedIn member={member} locale={locale}/>
            </div>
          </article>
          </div>
        ))}
      </DirectorsReel>
    </section>
  );
}
