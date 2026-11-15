import { ImageResponse } from 'next/og';

export const alt = 'ALMORAD AMC — Growth & Brand Studio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #0B0A08 0%, #14120E 65%, #1D1810 100%)',
          color: '#F5F1E7',
          border: '2px solid #7A5F28',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#BE9D5B',
              fontWeight: 600,
            }}
          >
            ALMORAD AMC
          </span>
          <span
            style={{
              fontSize: 18,
              color: '#D8BE86',
              border: '1px solid #7A5F28',
              padding: '8px 18px',
              borderRadius: 999,
            }}
          >
            Growth &amp; Brand Studio
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: '#F5F1E7',
            }}
          >
            Your next move. Made together.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: '#CFCBC0',
              maxWidth: '920px',
            }}
          >
            Connecting strategy, creativity, and technology across Marketing, Advertising, Consulting, and Web Development.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #7A5F28',
            paddingTop: '24px',
            fontSize: 20,
            color: '#A6A39B',
          }}
        >
          <span>Marketing · Advertising · Consulting · Web Development</span>
          <span style={{ color: '#BE9D5B' }}>almorad-amc.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
