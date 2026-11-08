import type { SocialProfile } from '@/components/layout/social-disclosure';

// Official profiles supplied by the user. Optional settings accept only their platform host.
export function socialProfiles(): SocialProfile[] {
  const entries = [
    ['linkedin', 'LinkedIn', process.env.SOCIAL_LINKEDIN_URL || 'https://www.linkedin.com/company/almorad-amc/', 'linkedin.com', false],
    ['facebook', 'Facebook', process.env.SOCIAL_FACEBOOK_URL || 'https://www.facebook.com/almoradamc', 'facebook.com', false],
    ['instagram', 'Instagram', process.env.SOCIAL_INSTAGRAM_URL || 'https://www.instagram.com/almoradamc/', 'instagram.com', false],
    ['x', 'X', process.env.SOCIAL_X_URL || 'https://x.com/almoradamc', 'x.com', false],
    ['tiktok', 'TikTok', process.env.SOCIAL_TIKTOK_URL || 'https://www.tiktok.com/@almoradamc', 'tiktok.com', false],
    ['youtube', 'YouTube', process.env.SOCIAL_YOUTUBE_URL || 'https://www.youtube.com/@AlmoradAMC', 'youtube.com', false],
  ] as const;
  return entries.map(([icon, name, value, host, demo]) => {
    let href: string | null = null;
    if (value) {
      try {
        const url = new URL(value);
        if (url.protocol === 'https:' && !url.username && !url.password && (url.hostname === host || url.hostname === `www.${host}`) && (url.pathname !== '/' || demo)) href = url.href;
      } catch { /* An invalid setting must never become a clickable URL. */ }
    }
    return { icon, name, href, demo };
  });
}
