import { ImageResponse } from 'next/og';

export const alt = 'Tagwimi — Make the plan. Find your people. Go.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: 'linear-gradient(145deg, #0f2218 0%, #1a3a28 45%, #3b793f 100%)',
        color: '#fbfcf8',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: '-0.04em'
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: '#ffb900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f2218',
            fontSize: 28,
            fontWeight: 900
          }}
        >
          T
        </div>
        Tagwimi
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.06em'
          }}
        >
          Make the plan. Find your people. Go.
        </div>
        <div style={{ fontSize: 28, color: '#c3d2c4', lineHeight: 1.35, maxWidth: 780 }}>
          Small activity plans in Kampala — swims, walks, coffee, and real meetups with people who
          are in.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 22,
          color: '#8acb89'
        }}
      >
        <span>Adults 18+</span>
        <span style={{ color: '#ffb900', fontWeight: 700 }}>tagwimi.com</span>
      </div>
    </div>,
    { ...size }
  );
}
