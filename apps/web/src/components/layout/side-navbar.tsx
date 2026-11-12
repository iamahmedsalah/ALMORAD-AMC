'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { Controls } from './controls';
import { BrandSignature } from './brand-signature';
import { createPortal } from 'react-dom';
import {MenuToggle} from '@/components/ui/animated-icon';
import { SolarIcon, type SolarName } from '@/components/ui/solar-icon';

const subscribeMount = () => () => {};
const navigationIcons: SolarName[] = ['widget-2-linear', 'users-group-rounded-linear', 'case-round-linear', 'users-group-rounded-linear', 'chat-round-line-linear', 'chat-round-line-linear', 'calendar-linear'];

interface NavItem {
  href: string;
  label: string;
}

interface SideNavbarProps {
  menuLabel: string;
  brandName: string;
  locale: string;
  ctaLabel: string;
  links: NavItem[];
}

export function SideNavbar(props: SideNavbarProps) {
  const pathname = usePathname();
  return <SideNavbarContent key={pathname} {...props} />;
}

function SideNavbarContent({
  menuLabel,
  brandName,
  locale,
  ctaLabel,
  links,
}: SideNavbarProps) {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(subscribeMount, () => true, () => false);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const closeLabel=locale==='ar'?'إغلاق القائمة':'Close menu';
  const openLabel=locale==='ar'?'فتح القائمة':'Open menu';

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const focusables = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button, select') ?? []);
    focusables()[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const main = document.getElementById('main');
    const previousInert = main?.inert ?? false;
    if (main) main.inert = true;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const nodes = focusables();
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      if (main) main.inert = previousInert;
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <MenuToggle buttonRef={triggerRef} className="side-nav-trigger burger-trigger rounded-squircle-md" open={open}
        label={open?closeLabel:openLabel} controls="amc-side-drawer" onClick={()=>setOpen(value=>!value)}/>

      {mounted && createPortal(<>
      <div
        className="side-drawer-backdrop"
        data-open={open ? 'true' : 'false'}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <div className="side-drawer-viewport" data-open={open ? 'true' : 'false'}>
      <aside
        ref={drawerRef}
        inert={!open}
        role="dialog"
        aria-modal={open || undefined}
        id="amc-side-drawer"
        className="side-drawer"
        data-open={open ? 'true' : 'false'}
        aria-label={menuLabel}
        aria-hidden={!open}
      >
        <div>
          <div className="side-drawer-header">
            <Link href="/" className="brand" aria-label={brandName} onClick={() => setOpen(false)}>
              <BrandSignature locale={locale} />
            </Link>
            <MenuToggle className="side-nav-trigger rounded-squircle-md" open={open} label={closeLabel}
              controls="amc-side-drawer" onClick={()=>setOpen(false)}/>
          </div>

          <nav className="side-drawer-links" aria-label={menuLabel}>
            {links.map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className="side-drawer-link rounded-squircle-md"
                style={{ transitionDelay: open ? `${idx * 40}ms` : '0ms' }}
                onClick={() => setOpen(false)}
              >
                <span className="side-drawer-link-content">
                  <SolarIcon name={navigationIcons[idx] ?? 'widget-2-linear'} />
                  <span className="side-drawer-link-label">{item.label}</span>
                </span>
                <SolarIcon name="arrow-right-linear" className="directional-icon"/>
              </Link>
            ))}
          </nav>
        </div>

        <div className="side-drawer-footer">
          <Controls />
          <Link
            href="/booking"
            className="button button-primary rounded-squircle-md"
            style={{ width: '100%' }}
            onClick={() => setOpen(false)}
          >
            <span>{ctaLabel}</span>
            <SolarIcon name="arrow-right-linear" className="directional-icon"/>
          </Link>
        </div>
      </aside>
      </div>
      </>, document.body)}
    </>
  );
}
