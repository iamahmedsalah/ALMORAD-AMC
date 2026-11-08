'use client';

import type { Locale } from '@amc/shared';
import { Link } from '@/i18n/navigation';
import { SolarIcon } from '@/components/ui/solar-icon';

interface TeamMember {
  id: string;
  badge: string;
  featured?: boolean;
  name: { en: string; ar: string };
  role: { en: string; ar: string };
  discipline: { en: string; ar: string };
  quote: { en: string; ar: string };
  tags: { en: string[]; ar: string[] };
  avatarType: 'ceo' | 'co_ceo' | 'coo' | 'creative' | 'growth' | 'tech' | 'operations' | 'client';
}

const CEO_MEMBER: TeamMember = {
  id: 'ceo',
  badge: '01 / FOUNDER & CEO',
  featured: true,
  name: { en: 'Eng.khaled Morad', ar: 'م.خالد مراد' },
  role: { en: 'Founder & Chief Executive Officer', ar: 'المؤسس والرئيس التنفيذي (CEO)' },
  discipline: { en: 'Executive Strategy & Brand Growth', ar: 'القيادة التنفيذية واستراتيجية النمو' },
  quote: {
    en: 'We built ALMORAD AMC so ambitious brands never have to choose between strategic rigor, bold creative direction, and engineering excellence.',
    ar: 'أسسنا المراد AMC لتمكين العلامات الطموحة من الجمع بين دقة الاستراتيجية، وقوة الإبداع البصري، والتميز التقني في منظومة واحدة.',
  },
  tags: {
    en: ['Brand Positioning', 'Growth Architecture', 'Executive Advisory'],
    ar: ['تموضع العلامة', 'هندسة النمو', 'الاستشارات التنفيذية'],
  },
  avatarType: 'ceo',
};

const CO_LEADERSHIP: readonly TeamMember[] = [
  {
    id: 'co-ceo',
    badge: '02 / EXECUTIVE LEADERSHIP',
    name: { en: 'Co-Chief Executive Officer', ar: 'الرئيس التنفيذي المشارك (Co-CEO)' },
    role: { en: 'Co-Chief Executive Officer & Partner', ar: 'الرئيس التنفيذي المشارك والشريك' },
    discipline: { en: 'Corporate Strategy & Global Partnerships', ar: 'الاستراتيجية المؤسسية والشراكات الدولية' },
    quote: {
      en: 'Driving institutional partnerships, market expansion, and long-term brand capital across regional and international sectors.',
      ar: 'قيادة الشراكات المؤسسية والتوسع السوقي وبناء القيمة المستدامة للعلامات عبر الأسواق الإقليمية والدولية.',
    },
    tags: {
      en: ['Market Expansion', 'Enterprise Strategy', 'Commercial Scale'],
      ar: ['التوسع السوقي', 'استراتيجية المؤسسات', 'النمو التجاري'],
    },
    avatarType: 'co_ceo',
  },
  {
    id: 'coo',
    badge: '03 / OPERATIONS EXCELLENCE',
    name: { en: 'Chief Operating Officer', ar: 'رئيس العمليات التنفيذي (COO)' },
    role: { en: 'Chief Operating Officer', ar: 'رئيس العمليات التنفيذي والشريك التشغيلي' },
    discipline: { en: 'Studio Delivery & Governance Systems', ar: 'إدارة العمليات وحوكمة المشاريع وجودة التسليم' },
    quote: {
      en: 'Ensuring seamless project execution, sprint velocity, and rigorous quality benchmarks across every multidisciplinary brief.',
      ar: 'ضمان دقة التنفيذ، وسرعة دورات العمل، وتطبيق أعلى معايير الجودة والحوكمة في كافة مشاريع الاستوديو.',
    },
    tags: {
      en: ['Operational Rigor', 'Delivery Excellence', 'Resource Architecture'],
      ar: ['حوكمة العمليات', 'دقة التسليم', 'إدارة الموارد'],
    },
    avatarType: 'coo',
  },
] as const;

const CORE_TEAM_5: readonly TeamMember[] = [
  {
    id: 'creative',
    badge: '04 / BRAND ARCHITECTURE',
    name: { en: 'Creative Direction Lead', ar: 'إدارة الإبداع والهوية البصرية' },
    role: { en: 'Executive Creative Director', ar: 'المدير الإبداعي التنفيذي' },
    discipline: { en: 'Identity Systems & Visual Craft', ar: 'أنظمة الهوية والإخراج الفني' },
    quote: {
      en: 'Crafting timeless bilingual identity systems, typography, and motion languages that command attention across every touchpoint.',
      ar: 'صياغة أنظمة هوية بصرية ثنائية اللغة وتجارب حركية تترك أثراً دائماً عبر كافة نقاط التواصل.',
    },
    tags: {
      en: ['Visual Identity', 'Art Direction', '3D & Motion'],
      ar: ['الهوية البصرية', 'الإخراج الفني', 'التصميم ثلاثي الأبعاد'],
    },
    avatarType: 'creative',
  },
  {
    id: 'growth',
    badge: '05 / PERFORMANCE & MEDIA',
    name: { en: 'Growth & Media Lead', ar: 'إدارة النمو والحملات الإعلانية' },
    role: { en: 'Head of Performance & Campaigns', ar: 'رئيس قطاع النمو وشراء الوسائط' },
    discipline: { en: 'Media Buying, Outdoor & ROI', ar: 'شراء المساحات الإعلانية والحملات الخارجية' },
    quote: {
      en: 'Turning market research and audience intelligence into high-converting digital campaigns, outdoor billboards, and corporate events.',
      ar: 'تحويل أبحاث السوق وبيانات الجمهور إلى حملات رقمية ولوحات خارجية وفعاليات تحقق عائداً ملموساً.',
    },
    tags: {
      en: ['Media Buying', 'Outdoor Billboards', 'Market Analytics'],
      ar: ['شراء الإعلانات', 'اللوحات الخارجية', 'تحليلات السوق'],
    },
    avatarType: 'growth',
  },
  {
    id: 'tech',
    badge: '06 / DIGITAL ENGINEERING',
    name: { en: 'Digital Systems Lead', ar: 'إدارة الهندسة والمنصات الرقمية' },
    role: { en: 'Lead Technology & Web Architect', ar: 'كبير مهندسي المنصات وتطوير الويب' },
    discipline: { en: 'Full-Stack Web & E-Commerce', ar: 'تطوير المواقع والتجارة الإلكترونية' },
    quote: {
      en: 'Engineering high-speed, SEO-first flagships and custom e-commerce platforms built for reliability, conversion, and scale.',
      ar: 'هندسة وتطوير منصات رقمية ومتاجر إلكترونية فائقة السرعة ومهيأة لمحركات البحث بمعايير عالمية.',
    },
    tags: {
      en: ['Next.js & 3D Web', 'E-Commerce Systems', 'Technical SEO'],
      ar: ['منصات الويب التفاعلية', 'التجارة الإلكترونية', 'الأرشفة التقنية SEO'],
    },
    avatarType: 'tech',
  },
  {
    id: 'operations',
    badge: '07 / PRODUCTION & SPRINT',
    name: { en: 'Head of Production & Sprints', ar: 'إدارة الإنتاج وإدارة المشاريع' },
    role: { en: 'Senior Production Director', ar: 'مدير عام الإنتاج وإدارة المشاريع' },
    discipline: { en: 'Agile Delivery, Timelines & QA', ar: 'إدارة الجداول الزمنية وضمان الجودة البرمجية والتصميمية' },
    quote: {
      en: 'Aligning milestones, creative assets, and client sign-offs with unwavering precision and clockwork predictability.',
      ar: 'تنسيق الجداول الزمنية، ومخرجات التصميم، والتسليمات البرمجية بدقة تامة وانضباط احترافي.',
    },
    tags: {
      en: ['Sprint Leadership', 'QA Benchmarks', 'Resource Tracking'],
      ar: ['إدارة الدورات', 'معايير الجودة QA', 'إدارة المخرجات'],
    },
    avatarType: 'operations',
  },
  {
    id: 'client',
    badge: '08 / CLIENT SUCCESS & VALUE',
    name: { en: 'Client Strategy & Success Lead', ar: 'إدارة نجاح العملاء والاستشارات' },
    role: { en: 'Director of Strategic Client Success', ar: 'مدير نجاح العملاء والاستشارات الاستراتيجية' },
    discipline: { en: 'Account Growth, Reporting & Value', ar: 'إدارة حسابات الشركاء والتقارير وتحقيق العائد' },
    quote: {
      en: 'Serving as the direct strategic conduit between client goals and our multidisciplinary studio team at every phase.',
      ar: 'نقطة الاتصال الاستراتيجية المباشرة لضمان توافق أهداف العميل مع كافة مراحل العمل في الاستوديو.',
    },
    tags: {
      en: ['Client Advisory', 'Quarterly ROI', 'Partner Relations'],
      ar: ['استشارات العملاء', 'متابعة العائد ROI', 'علاقات الشركاء'],
    },
    avatarType: 'client',
  },
] as const;

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

export function TeamShowcase({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar';
  const ceo = CEO_MEMBER;

  return (
    <section id="chapter-team" aria-labelledby="team-title" className="lp-team-section my-20">
      {/* Section Header */}
      <div className="lp-team-header mb-12" data-reveal>
        <div>
          <p className="eyebrow badge badge-accent rounded-squircle-md mb-4">
            <span className="badge-dot" aria-hidden="true" />
            <span>{isAr ? '٠٦ — القيادة وفريق الاستوديو' : '06 — LEADERSHIP & STUDIO TEAM'}</span>
          </p>
          <h2 id="team-title" className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            {isAr
              ? 'رؤية يقودها المؤسسون. وتنفيذ بمعايير عالمية.'
              : 'Meet the minds shaping your next chapter.'}
          </h2>
        </div>
        <div>
          <p className="text-lg text-[var(--fg-muted)] leading-relaxed mb-6">
            {isAr
              ? 'نجمع بين القيادة الاستراتيجية المباشرة وخبراء الهوية والإعلان والهندسة الرقمية لنضمن لك تواصلاً مباشراً مع صناع القرار في كل مشروع.'
              : 'Direct partner-level leadership backed by multidisciplinary specialists across brand architecture, media performance, and full-stack engineering.'}
          </p>
          <p className="lp-team-preview-note">
            {isAr ? 'معاينة التصميم: الملفات التعريفية والرسوم التوضيحية مؤقتة لحين اعتماد الأسماء والصور والسير الذاتية.' : 'Design preview: profiles and illustrations are placeholders pending approved names, photographs and biographies.'}
          </p>
          <Link href="/booking" className="button button-primary rounded-squircle-md">
            <span>{isAr ? 'احجز جلسة استراتيجية مع الفريق' : 'Book a Strategy Session with Us'}</span>
            <SolarIcon name="arrow-right-up-linear" />
          </Link>
        </div>
      </div>

      {/* 1. Featured CEO Spotlight Card */}
      <article
        data-team-card
        data-scroll-card
        className="lp-team-ceo-card glass-surface rounded-squircle-xl mb-8"
      >
        <div className="lp-team-ceo-portrait rounded-squircle-lg">
          <ExecutivePortraitSvg type="ceo" isFeatured />
          <span className="lp-team-verified-pill">
            <span className="badge-dot" aria-hidden="true" />
            <span>{isAr ? 'رسم توضيحي مؤقت · CEO' : 'ILLUSTRATION PLACEHOLDER · CEO'}</span>
          </span>
        </div>

        <div className="lp-team-ceo-content">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="badge badge-accent rounded-squircle-sm">{ceo.badge}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              {ceo.discipline[locale]}
            </span>
          </div>

          <h3 className="lp-team-ceo-name">{ceo.name[locale]}</h3>
          <p className="lp-team-ceo-role">{ceo.role[locale]}</p>

          <p className="lp-team-ceo-quote">{ceo.quote[locale]}</p>

          <ul className="lp-team-tags" aria-label={isAr ? 'مجالات التخصص' : 'Specializations'}>
            {ceo.tags[locale].map((tag) => (
              <li key={tag} className="badge rounded-squircle-sm">
                {tag}
              </li>
            ))}
          </ul>

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
          <article
            key={member.id}
            data-team-card
            data-scroll-card
            className="lp-team-card glass-surface rounded-squircle-xl"
          >
            <div className="lp-team-card-portrait rounded-squircle-lg">
              <ExecutivePortraitSvg type={member.avatarType} isFeatured />
              <span className="lp-team-card-badge badge rounded-squircle-sm">
                {member.badge}
              </span>
            </div>

            <div className="lp-team-card-body">
              <small className="lp-team-card-discipline">{member.discipline[locale]}</small>
              <h4 className="lp-team-card-title">{member.name[locale]}</h4>
              <p className="lp-team-card-role">{member.role[locale]}</p>
              <p className="lp-team-card-bio">{member.quote[locale]}</p>

              <ul className="lp-team-tags mt-auto pt-4">
                {member.tags[locale].map((tag) => (
                  <li key={tag} className="badge rounded-squircle-sm">
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      {/* 3. Team of 5 Discipline Leads */}
      <div className="lp-team-sub-header mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">
          {isAr ? 'فريق القيادات المتخصصة (٥ قطاعات استراتيجية)' : 'DIRECTORS & DISCIPLINE LEADS (5 CORE PILLARS)'}
        </h3>
      </div>
      <div className="lp-team-grid-5">
        {CORE_TEAM_5.map((member) => (
          <article
            key={member.id}
            data-team-card
            data-scroll-card
            className="lp-team-card glass-surface rounded-squircle-xl"
          >
            <div className="lp-team-card-portrait rounded-squircle-lg">
              <ExecutivePortraitSvg type={member.avatarType} />
              <span className="lp-team-card-badge badge rounded-squircle-sm">
                {member.badge}
              </span>
            </div>

            <div className="lp-team-card-body">
              <small className="lp-team-card-discipline">{member.discipline[locale]}</small>
              <h4 className="lp-team-card-title text-lg">{member.name[locale]}</h4>
              <p className="lp-team-card-role text-xs">{member.role[locale]}</p>
              <p className="lp-team-card-bio text-xs leading-relaxed">{member.quote[locale]}</p>

              <ul className="lp-team-tags mt-auto pt-3">
                {member.tags[locale].map((tag) => (
                  <li key={tag} className="badge rounded-squircle-sm text-[0.7rem] px-2 py-0.5">
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
