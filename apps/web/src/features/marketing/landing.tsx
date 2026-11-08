import { FaqAccordion } from '@/components/ui/faq-accordion';
import { pillars, services, type Locale } from '@amc/shared';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/layout/shell';
import { SolarIcon } from '@/components/ui/solar-icon';
import { LandingMotion } from '@/components/landing/motion';
import { BrandArt, serviceArt } from '@/components/landing/brand-art';
import { DisciplineCombiner } from '@/components/landing/discipline-combiner';
import { TeamShowcase } from '@/components/landing/team-showcase';
import { ArrowIcon, Lines } from '@/components/landing/primitives';
import { StudioPhotoShowcase, StudioShowreel } from '@/components/landing/studio-media';
import { AmcMarkContainer } from '@/components/three/amc-mark-container';
import { copyFor } from './copy';
import { landingCopyFor } from './landing-copy';

const icons = ['chart-2-linear', 'star-linear', 'compass-linear', 'code-square-linear'] as const;
const heroFramePhotos = ['/studio/studio-01.svg', '/studio/studio-02.svg', '/studio/studio-03.svg'] as const;
const pillarPhotos = ['/studio/studio-01.svg', '/studio/studio-02.svg', '/studio/studio-04.svg', '/studio/studio-03.svg'] as const;
const galleryAspectClasses = ['lp-gallery-art-tall', 'lp-gallery-art-wide', 'lp-gallery-art-square'] as const;

export function Landing({ locale }: { locale: Locale }) {
  const c = copyFor(locale);
  const lc = landingCopyFor(locale);
  const isRtl = locale === 'ar';

  return (
    <LandingMotion>
      {/* Persistent Full-Length 3D / Fallback Vector Mark + 6-Chapter HUD */}
      <AmcMarkContainer dir={isRtl ? 'rtl' : 'ltr'} />

      {/* Main Content with Premotio-Inspired Editorial Architecture */}
      <div className="studio-content">
        <Container>
          {/* Section B (Chapter 01): Hero Section */}
          <section
            id="chapter-hero"
            className="lp-hero-grid"
            aria-labelledby="hero-title"
          >
            <div
              data-chapter-panel
              className="hero-copy studio-hero-copy"
            >
              <p className="eyebrow studio-hero-eyebrow mb-5">
                <span className="badge-dot" aria-hidden="true" />
                <span>{c.eyebrow}</span>
              </p>
              <h1 id="hero-title" data-hero-line className="studio-hero-title">
                {c.hero[0]}
                <br />
                <em className="studio-hero-accent">
                  {c.hero[1]}
                </em>
              </h1>
              <p data-hero-line className="intro studio-hero-intro">
                {c.intro}
              </p>
              <div data-hero-line className="actions flex flex-wrap gap-4 items-center">
                <Link
                  className="button button-primary rounded-squircle-md"
                  href="/services"
                >
                  <span>{c.cta}</span>
                  <SolarIcon name="arrow-right-up-linear" />
                </Link>
                <Link
                  className="button button-secondary rounded-squircle-md"
                  href="/about"
                >
                  <span>{c.secondary}</span>
                  <SolarIcon name="arrow-right-linear" />
                </Link>
              </div>

              <div className="lp-hero-facts" data-hero-line>
                {lc.hero.facts.map(([num, label]) => (
                  <div key={label} className="lp-hero-fact studio-stat">
                    <strong>{num}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Floating Studio Preview Frames alongside the 3D Mark */}
            <div className="lp-hero-stage">
              <div className="lp-hero-frames">
                {lc.hero.frames.map(([title, sub], idx) => (
                  <div
                    key={title}
                    data-hero-frame
                    className="lp-hero-frame rounded-squircle-lg"
                  >
                    <div className="lp-hero-frame-art rounded-squircle-md">
                      <img
                        src={heroFramePhotos[idx] ?? '/studio/studio-01.svg'}
                        alt=""
                        width={480}
                        height={320}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <strong>{title}</strong>
                    <small>{sub}</small>
                  </div>
                ))}
              </div>
              <a
                className="badge rounded-squircle-md self-start hover:border-[var(--primary)] transition-colors"
                href="#chapter-strategy"
              >
                <SolarIcon name="arrow-down-linear" />
                <span>{c.scroll}</span>
              </a>
            </div>
          </section>
        </Container>

        {/* Discipline Strip */}
        <div className="discipline-strip border-y border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md py-4 my-8">
          <Container>
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-[var(--fg-muted)]">
              {c.strip.map((s) => (
                <span key={s} className="badge rounded-squircle-md">
                  <SolarIcon name="star-linear" className="text-[var(--amc-orange-500)]" />
                  <span>{s}</span>
                </span>
              ))}
            </div>
          </Container>
        </div>

        <Container>
          {/* Chapter 02: Strategy & Studio Manifesto — Stacked Header Above Wide TV Monitor */}
          <section
            id="chapter-strategy"
            className="editorial-section manifesto manifesto-stacked my-20 lg:my-28"
          >
            <div
              data-chapter-panel
              className="manifesto-header glass-surface rounded-squircle-xl p-8 sm:p-12"
            >
              <div className="manifesto-header-top">
                <p className="eyebrow badge badge-accent rounded-squircle-md mb-4">
                  <span className="badge-dot" aria-hidden="true" />
                  <span>{c.manifesto.label}</span>
                </p>
                <Lines
                  as="h2"
                  text={c.manifesto.title}
                  className="manifesto-kinetic-title text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                />
              </div>
              <div className="manifesto-header-bottom">
                <p className="large-copy text-lg text-[var(--fg-muted)] leading-relaxed mb-6">
                  {c.manifesto.body}
                </p>
                <Link
                  className="button button-secondary rounded-squircle-md"
                  href="/about"
                >
                  <span>{c.manifesto.link}</span>
                  <SolarIcon name="arrow-right-up-linear" />
                </Link>
              </div>
            </div>

            {/* Wide Cinema TV Studio Monitor Showreel Below Header */}
            <div className="manifesto-tv-wrap">
              <StudioShowreel locale={locale} />
            </div>
          </section>

          {/* Section C (Chapter 03): Product / Feature Showcase — Four Connected Disciplines */}
          <section
            id="chapter-identity"
            className="expertise-section section-space my-20 lg:my-28"
            aria-labelledby="expertise-title"
          >
            <div
              data-chapter-panel
              className="section-heading   glass-surface rounded-squircle-xl p-8 sm:p-12 mb-12"
            >
              <div>
                <p className="eyebrow badge badge-accent rounded-squircle-md mb-4">
                  <span className="badge-dot" aria-hidden="true" />
                  <span>{c.expertise.label}</span>
                </p>
                <h2 id="expertise-title" className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                  {c.expertise.title}
                </h2>
              </div>
              <div>
                <p className="text-lg text-[var(--fg-muted)] mb-6">
                  {c.expertise.body}
                </p>
                <Link
                  className="button button-secondary rounded-squircle-md"
                  href="/services"
                >
                  <span>{c.expertise.link}</span>
                  <SolarIcon name="arrow-right-up-linear" />
                </Link>
              </div>
            </div>

            <div className="lp-cap-list service-card-stack" data-card-stack>
              {pillars.map((p, i) => {
                const pillarServices = services.filter((s) => s.pillar === p.id);
                return (
                  <article
                    className="lp-cap-card expertise-row glass-surface rounded-squircle-xl"
                    key={p.id}
                    data-stack-card
                    style={{ '--stack-index': i } as React.CSSProperties}
                  >
                    <div className="lp-cap-visual rounded-squircle-lg">
                      <span className="lp-cap-visual-badge badge badge-accent rounded-squircle-sm">
                        0{i + 1} / 0{pillars.length}
                      </span>
                      <img
                        src={pillarPhotos[i] ?? '/studio/studio-01.svg'}
                        alt={p[locale]}
                        width={600}
                        height={400}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="lp-cap-copy">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="pillar-symbol rounded-squircle text-2xl text-[var(--amc-orange-500)]">
                            <SolarIcon name={icons[i]!} />
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-bold">
                            <Link
                              href={`/services/${p.id}`}
                              className="hover:text-[var(--amc-orange-500)] transition-colors"
                            >
                              {p[locale]}
                            </Link>
                          </h3>
                        </div>
                        <p className="text-base text-[var(--fg-muted)] leading-relaxed mb-5">
                          {c.pillars[i]}
                        </p>
                        <ul className="flex flex-wrap gap-2">
                          {pillarServices.map((s) => (
                            <li key={s.slug}>
                              <Link
                                href={`/services/${s.slug}`}
                                className="badge rounded-squircle-sm hover:border-[var(--amc-orange-500)] transition-colors"
                              >
                                <span>{s[locale]}</span>
                                <SolarIcon name="arrow-right-up-linear" className="w-3 h-3" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2">
                        <Link
                          href={`/services/${p.id}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-text)] hover:underline underline-offset-4"
                        >
                          <span>{lc.capabilities.explore}</span>
                          <ArrowIcon />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Section D (Chapter 04): Categories / Curated Visual Gallery & Possibilities */}
          <section
            id="chapter-digital"
            className="possibilities section-space my-20 lg:my-28"
            aria-labelledby="possibilities-title"
          >
            <div
              data-chapter-panel
              className="section-heading   glass-surface rounded-squircle-xl p-8 sm:p-12 mb-12"
            >
              <div>
                <p className="eyebrow badge badge-accent rounded-squircle-md mb-4">
                  <span className="badge-dot" aria-hidden="true" />
                  <span>{lc.gallery.label}</span>
                </p>
                <h2 id="possibilities-title" className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                  {lc.gallery.title}
                </h2>
              </div>
              <div>
                <p className="text-lg text-[var(--fg-muted)] mb-6">
                  {lc.gallery.body}
                </p>
                <Link
                  className="button button-secondary rounded-squircle-md"
                  href="/services"
                >
                  <span>{lc.gallery.all}</span>
                  <SolarIcon name="arrow-right-up-linear" />
                </Link>
              </div>
            </div>

            {/* Mock Studio Photography Grid (6 Asymmetric Editorial Shots) */}
            <div className="  mb-14">
              <StudioPhotoShowcase locale={locale} />
            </div>

            {/* Asymmetric Curated Service Gallery Rail (All 11 Services) */}
            <div className="lp-gallery-wrap mb-14" aria-label={lc.gallery.title}>
              <div className="lp-gallery-track" data-gallery-track>
                {services.map((service, idx) => {
                  const parentPillar = pillars.find((p) => p.id === service.pillar);
                  const artVariant = serviceArt[service.slug] ?? 'identity';
                  const aspectClass = galleryAspectClasses[idx % galleryAspectClasses.length]!;
                  return (
                    <article
                      key={service.slug}
                      data-service-card
                      style={{ '--service-index': idx, '--service-column': idx % 2 } as React.CSSProperties}
                      className="lp-gallery-card glass-surface rounded-squircle-lg"
                    >
                      <div>
                        <div className={`lp-gallery-art ${aspectClass} rounded-squircle-md`}>
                          <BrandArt variant={artVariant} />
                        </div>
                        <div className="lp-gallery-meta">
                          <span className="badge badge-accent rounded-squircle-sm">
                            {idx < 9 ? `0${idx + 1}` : idx + 1}
                          </span>
                          <span>{parentPillar?.[locale]}</span>
                        </div>
                        <h3>
                          <Link
                            href={`/services/${service.slug}`}
                            className="hover:text-[var(--amc-orange-500)] transition-colors"
                          >
                            {service[locale]}
                          </Link>
                        </h3>
                      </div>
                      <Link
                        href={`/services/${service.slug}`}
                        className="inline-flex items-center justify-between text-xs font-semibold text-[var(--accent-text)] pt-3 border-t border-[var(--border)]"
                      >
                        <span>{lc.gallery.open}</span>
                        <ArrowIcon />
                      </Link>
                    </article>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--fg-muted)] mt-2">{lc.gallery.note}</p>
            </div>

            {/* Project Possibilities Trio */}
            <div className="possibility-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {c.possibilities.items.map((title, i) => (
                <article
                  key={title}
                  data-scroll-card
                  className="work-card glass-surface rounded-squircle-lg p-6 sm:p-8 flex flex-col justify-between"
                >
                  <div>
                    <div className={`concept-art concept-${i % 3} rounded-squircle-lg mb-6`} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <b className="badge badge-accent rounded-squircle-sm">0{i + 1}</b>
                    </div>
                    <p className="eyebrow badge rounded-squircle-sm mb-3">
                      {c.possibilities.tags[i]}
                    </p>
                    <h3 className="text-xl font-bold">{title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Section E & F (Chapter 05): How It Works + Interactive Discipline Combiner + Cross-Device Showcase */}
          <section
            id="chapter-scale"
            className="approach section-space my-20 lg:my-28"
            aria-labelledby="approach-title"
          >
            {/* Section E: How It Works — 4-Step Connected Workflow */}
            <div
              data-process-band
              className="lp-process-band glass-surface rounded-squircle-xl mb-16  "
            >
              <div className="mb-6">
                <p className="eyebrow badge badge-accent rounded-squircle-md mb-4">
                  <span className="badge-dot" aria-hidden="true" />
                  <span>{c.approach.label}</span>
                </p>
                <h2 id="approach-title" className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
                  {c.approach.title}
                </h2>
                <p className="text-base text-[var(--fg-muted)] max-w-2xl">
                  {lc.process.body}
                </p>
              </div>

              <div className="lp-process-rail" aria-hidden="true">
                <div data-process-progress className="lp-process-progress" />
              </div>

              <ol className="approach-grid grid sm:grid-cols-2 gap-6">
                {c.approach.steps.map(([title, body], i) => (
                  <li
                    key={title}
                    data-scroll-card
                    className="approach-card glass-surface rounded-squircle-lg p-6 sm:p-8"
                  >
                    <span className="index badge badge-accent rounded-squircle-sm mb-4">
                      0{i + 1}
                    </span>
                    <h3 className="text-xl font-bold mb-2">{title}</h3>
                    <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                      {body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Section F: Advanced Features — Interactive Discipline Combiner */}
            <div id="chapter-together" className="my-20" data-together>
              <div className="mb-8" data-reveal>
                <p className="eyebrow badge badge-accent rounded-squircle-md mb-4">
                  <span className="badge-dot" aria-hidden="true" />
                  <span>{lc.connected.label}</span>
                </p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                  {lc.connected.title}
                </h2>
                <p className="text-lg text-[var(--fg-muted)] max-w-2xl">
                  {lc.connected.body}
                </p>
              </div>

              <DisciplineCombiner
                locale={locale}
                copy={{
                  legend: lc.connected.legend,
                  result: lc.connected.result,
                  empty: lc.connected.empty,
                  cta: lc.connected.cta,
                  centre: lc.connected.centre,
                }}
              />
            </div>

            {/* Section G: Cross-Device Experience Showcase */}
            <div id="chapter-devices" className="lp-devices-grid my-20 glass-surface rounded-squircle-xl p-8 sm:p-12">
              <div data-reveal>
                <p className="eyebrow badge badge-accent rounded-squircle-md mb-4">
                  <span className="badge-dot" aria-hidden="true" />
                  <span>{lc.devices.label}</span>
                </p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                  {lc.devices.title}
                </h2>
                <p className="text-base text-[var(--fg-muted)] leading-relaxed">
                  {lc.devices.body}
                </p>
                <ul className="lp-device-points">
                  {lc.devices.points.map((pt) => (
                    <li key={pt}>
                      <SolarIcon name="check-circle-linear" className="text-[var(--amc-orange-500)]" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/services/web-development"
                  className="button button-secondary rounded-squircle-md"
                >
                  <span>{lc.devices.cta}</span>
                  <ArrowIcon />
                </Link>
              </div>

              <div className="lp-device-stage" aria-hidden="true">
                <div data-device-float className="lp-device-frame rounded-squircle-lg">
                  <div className="lp-device-bar">
                    <span className="lp-device-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>Desktop · 1440px</span>
                  </div>
                  <div className="lp-device-screen">
                    <img
                      src="/studio/studio-03.svg"
                      alt=""
                      width={600}
                      height={400}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="lp-device-stack">
                  <div data-device-float className="lp-device-frame rounded-squircle-lg">
                    <div className="lp-device-bar">
                      <span className="lp-device-dots">
                        <i />
                        <i />
                      </span>
                      <span>Tablet · 768px</span>
                    </div>
                    <div className="lp-device-screen">
                      <img
                        src="/studio/studio-01.svg"
                        alt=""
                        width={600}
                        height={400}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div data-device-float className="lp-device-frame rounded-squircle-lg">
                    <div className="lp-device-bar">
                      <span className="lp-device-dots">
                        <i />
                      </span>
                      <span>Mobile · 390px</span>
                    </div>
                    <div className="lp-device-screen lp-device-screen-mobile">
                      <img
                        src="/studio/studio-05.svg"
                        alt=""
                        width={600}
                        height={400}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section H: Leadership & Studio Team Showcase (Replacing 06 — Engagement) */}
            <TeamShowcase locale={locale} />
          </section>

          {/* Section I (Chapter 06): Final CTA & FAQ */}
          <section
            id="chapter-booking"
            className="contact-finale my-20 lg:my-32"
          >
            <div
              data-chapter-panel
              className="finale-banner-grid glass-surface rounded-squircle-xl"
            >
              <div className="finale-banner-main">
                <p className="eyebrow badge badge-accent rounded-squircle-md mb-5">
                  <span className="badge-dot" aria-hidden="true" />
                  <span>{c.contact.label}</span>
                </p>
                <Lines
                  as="h2"
                  text={c.contact.title}
                  className="finale-banner-title font-bold tracking-tight"
                />
              </div>

              <div className="finale-banner-aside">
                <p className="finale-banner-copy text-lg text-[var(--fg-muted)] leading-relaxed">
                  {c.contact.body}
                </p>
                <div className="finale-banner-actions">
                  <Link
                    href="/booking"
                    className="button button-primary rounded-squircle-md"
                  >
                    <span>{locale === 'ar' ? 'احجز استشارة نمو' : 'Book a Growth Consultation'}</span>
                    <SolarIcon name="arrow-right-up-linear" />
                  </Link>
                  <Link
                    href="/contact"
                    className="button button-secondary rounded-squircle-md"
                  >
                    <span>{c.contact.link}</span>
                    <SolarIcon name="arrow-right-linear" />
                  </Link>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div id="chapter-faq" className="faq-section mt-16">
              <div className="mb-6" data-reveal>
                <p className="eyebrow badge badge-accent rounded-squircle-md mb-3">
                  <span className="badge-dot" aria-hidden="true" />
                  <span>{c.faq.label}</span>
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                  {c.faq.title}
                </h2>
              </div>
              <Link href="/faq" className="faq-page-link">
                {locale === 'ar' ? 'جميع الأسئلة' : 'All questions'} <ArrowIcon />
              </Link>
              <FaqAccordion items={c.faq.items} locale={locale} />
            </div>
          </section>
        </Container>
      </div>
    </LandingMotion>
  );
}
