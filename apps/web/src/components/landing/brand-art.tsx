/**
 * Original, art-directed SVG compositions used as studio visuals.
 * They illustrate disciplines and services abstractly. They are not
 * client work, screenshots or third-party assets.
 * Colours come from CSS custom properties so every composition adapts to
 * light/dark themes automatically (see `.brand-art` in landing.css).
 */
export type BrandArtVariant =
  | 'social'
  | 'persona'
  | 'research'
  | 'identity'
  | 'media'
  | 'outdoor'
  | 'events'
  | 'commerce'
  | 'consulting'
  | 'store'
  | 'website'
  | 'palette';

export const serviceArt: Record<string, BrandArtVariant> = {
  'social-media-management': 'social',
  'personal-branding': 'persona',
  'market-research-analysis': 'research',
  branding: 'identity',
  'media-buying': 'media',
  'outdoor-advertising': 'outdoor',
  'corporate-events': 'events',
  'ecommerce-consulting': 'commerce',
  'management-consulting': 'consulting',
  'ecommerce-website-development': 'store',
  'company-websites-landing-pages': 'website',
};

export const pillarArt: Record<string, BrandArtVariant> = {
  marketing: 'identity',
  advertising: 'outdoor',
  consulting: 'consulting',
  'web-development': 'website',
};

function Social() {
  const cells = Array.from({ length: 12 }, (_, i) => i);
  return (
    <>
      {cells.map((i) => {
        const x = 60 + (i % 3) * 96;
        const y = 70 + Math.floor(i / 3) * 96;
        const accent = i === 4 || i === 9;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="84"
            height="84"
            rx="18"
            className={accent ? 'ba-acc' : i % 2 ? 'ba-soft' : 'ba-line'}
          />
        );
      })}
      <circle cx="198" cy="210" r="18" className="ba-ink" />
      <circle cx="198" cy="210" r="70" className="ba-line ba-pulse" />
      <circle cx="198" cy="210" r="120" className="ba-line ba-pulse ba-delay" />
    </>
  );
}

function Persona() {
  return (
    <>
      <circle cx="200" cy="200" r="150" className="ba-line" />
      <circle cx="200" cy="200" r="110" className="ba-line" />
      <circle cx="200" cy="168" r="46" className="ba-ink" />
      <path d="M118 300c14-52 50-80 82-80s68 28 82 80z" className="ba-ink" />
      <path d="M70 420c60-30 110 20 170-10s70-40 100-20" className="ba-line ba-thick" />
      <circle cx="318" cy="96" r="22" className="ba-acc" />
    </>
  );
}

function Research() {
  const bars = [120, 180, 150, 240, 210, 300];
  return (
    <>
      {[100, 180, 260, 340, 420].map((y) => (
        <line key={y} x1="40" x2="360" y1={y} y2={y} className="ba-line" />
      ))}
      {bars.map((h, i) => (
        <rect
          key={i}
          x={58 + i * 50}
          y={420 - h}
          width="30"
          height={h}
          rx="8"
          className={i === 3 ? 'ba-acc' : 'ba-soft'}
        />
      ))}
      <path
        d="M73 290 L123 240 L173 262 L223 168 L273 196 L323 110"
        className="ba-line ba-thick ba-ink-stroke"
      />
      {[
        [73, 290],
        [123, 240],
        [173, 262],
        [223, 168],
        [273, 196],
        [323, 110],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="7" className="ba-ink" />
      ))}
    </>
  );
}

function Identity() {
  return (
    <>
      {[80, 140, 200, 260, 320].map((v) => (
        <g key={v}>
          <line x1={v} x2={v} y1="40" y2="460" className="ba-line" />
          <line x1="40" x2="360" y1={v + 50} y2={v + 50} className="ba-line" />
        </g>
      ))}
      <circle cx="200" cy="250" r="120" className="ba-line ba-thick" />
      <path d="M110 340 L170 160 L200 230 L230 160 L290 340 Z" className="ba-ink" />
      <path d="M262 160 h70 l-24 70 h-38 l16-40 h-40 z" className="ba-acc" />
      <line x1="60" x2="340" y1="400" y2="100" className="ba-line" />
    </>
  );
}

function Media() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={70 + i * 30}
          y={80 + i * 70}
          width="230"
          height="150"
          rx="20"
          className={i === 2 ? 'ba-ink' : 'ba-soft'}
        />
      ))}
      <circle cx="245" cy="300" r="46" className="ba-acc" />
      <circle cx="245" cy="300" r="20" className="ba-bgfill" />
      <circle cx="245" cy="300" r="8" className="ba-acc" />
      <line x1="60" x2="340" y1="430" y2="430" className="ba-line" />
      <rect x="60" y="420" width="160" height="20" rx="10" className="ba-acc" />
    </>
  );
}

function Outdoor() {
  return (
    <>
      <circle cx="300" cy="120" r="54" className="ba-acc" />
      <line x1="20" x2="380" y1="380" y2="380" className="ba-line ba-thick" />
      <rect x="70" y="150" width="260" height="140" rx="16" className="ba-ink" />
      <rect x="96" y="178" width="120" height="16" rx="8" className="ba-bgfill" />
      <rect x="96" y="208" width="80" height="12" rx="6" className="ba-acc" />
      <rect x="140" y="290" width="14" height="90" className="ba-ink" />
      <rect x="246" y="290" width="14" height="90" className="ba-ink" />
      {[60, 110, 330].map((x) => (
        <rect key={x} x={x} y={400} width={30} height={40} rx="6" className="ba-soft" />
      ))}
    </>
  );
}

function Events() {
  const seats = Array.from({ length: 24 }, (_, i) => i);
  return (
    <>
      <path d="M140 60 L80 300 H200 Z" className="ba-acc ba-glow" />
      <path d="M260 60 L200 300 H320 Z" className="ba-soft" />
      <path d="M40 300 Q200 250 360 300 V330 Q200 280 40 330 Z" className="ba-ink" />
      {seats.map((i) => (
        <circle
          key={i}
          cx={70 + (i % 8) * 37}
          cy={380 + Math.floor(i / 8) * 30}
          r="9"
          className={i === 11 ? 'ba-acc' : 'ba-soft'}
        />
      ))}
    </>
  );
}

function Commerce() {
  return (
    <>
      <path d="M60 90 H340 L280 200 H120 Z" className="ba-soft" />
      <path d="M120 210 H280 L240 300 H160 Z" className="ba-line ba-thick" />
      <path d="M160 310 H240 L215 370 H185 Z" className="ba-acc" />
      <circle cx="200" cy="420" r="16" className="ba-ink" />
      <line x1="200" x2="200" y1="370" y2="404" className="ba-line ba-thick ba-ink-stroke" />
      {[90, 310].map((x) => (
        <circle key={x} cx={x} cy={420} r="10" className="ba-line" />
      ))}
    </>
  );
}

function Consulting() {
  const nodes: Array<[number, number]> = [
    [200, 110],
    [100, 250],
    [300, 250],
    [150, 390],
    [250, 390],
  ];
  return (
    <>
      <circle cx="200" cy="250" r="160" className="ba-line" />
      {nodes.slice(1).map(([x, y]) => (
        <line key={`${x}-${y}`} x1="200" y1="110" x2={x} y2={y} className="ba-line ba-thick" />
      ))}
      <line x1="100" y1="250" x2="300" y2="250" className="ba-line" />
      {nodes.map(([x, y], i) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={i === 0 ? 30 : 20} className={i === 0 ? 'ba-acc' : 'ba-ink'} />
      ))}
      <path d="M200 200 l14 50 -14 50 -14 -50z" className="ba-ink" />
    </>
  );
}

function Store() {
  return (
    <>
      <rect x="40" y="60" width="320" height="380" rx="24" className="ba-line ba-thick" />
      <line x1="40" x2="360" y1="104" y2="104" className="ba-line" />
      {[64, 84, 104].map((cx) => (
        <circle key={cx} cx={cx} cy={82} r="6" className="ba-soft" />
      ))}
      {[0, 1, 2, 3].map((i) => {
        const x = 66 + (i % 2) * 140;
        const y = 126 + Math.floor(i / 2) * 150;
        return (
          <g key={i}>
            <rect x={x} y={y} width="128" height="96" rx="14" className={i === 1 ? 'ba-acc' : 'ba-soft'} />
            <rect x={x} y={y + 106} width="90" height="10" rx="5" className="ba-ink" />
            <rect x={x} y={y + 122} width="56" height="8" rx="4" className="ba-soft" />
          </g>
        );
      })}
    </>
  );
}

function Website() {
  return (
    <>
      <rect x="30" y="70" width="340" height="360" rx="24" className="ba-ink" />
      <rect x="44" y="110" width="312" height="306" rx="14" className="ba-bgfill" />
      {[52, 70, 88].map((cx) => (
        <circle key={cx} cx={cx} cy={90} r="5" className="ba-acc" />
      ))}
      <rect x="66" y="140" width="190" height="22" rx="8" className="ba-ink" />
      <rect x="66" y="172" width="150" height="22" rx="8" className="ba-ink" />
      <rect x="66" y="212" width="120" height="10" rx="5" className="ba-soft" />
      <rect x="66" y="242" width="96" height="30" rx="10" className="ba-acc" />
      <circle cx="290" cy="220" r="44" className="ba-line ba-thick" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={66 + i * 98} y={310} width="86" height="84" rx="12" className="ba-soft" />
      ))}
    </>
  );
}

function Palette() {
  const swatches = [
    ['#0B1F44', 'Navy'],
    ['#F7761E', 'Orange'],
    ['#FBF1E6', 'Cream'],
    ['#B84A05', 'Burnt'],
  ];
  return (
    <>
      {swatches.map(([fill], i) => (
        <rect
          key={fill}
          x={50 + i * 78}
          y={100}
          width="66"
          height="300"
          rx="16"
          fill={fill}
          className="ba-swatch"
        />
      ))}
      <line x1="40" x2="360" y1="430" y2="430" className="ba-line" />
    </>
  );
}

const variants: Record<BrandArtVariant, () => React.JSX.Element> = {
  social: Social,
  persona: Persona,
  research: Research,
  identity: Identity,
  media: Media,
  outdoor: Outdoor,
  events: Events,
  commerce: Commerce,
  consulting: Consulting,
  store: Store,
  website: Website,
  palette: Palette,
};

export function BrandArt({
  variant,
  className = '',
}: {
  variant: BrandArtVariant;
  className?: string;
}) {
  const Composition = variants[variant];
  return (
    <svg
      className={`brand-art ${className}`}
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="400" height="500" className="ba-bg" />
      <Composition />
    </svg>
  );
}
