import './globals.css';

export const metadata = {
  title: 'Along — good plans are better together',
  description: 'Find people to do the things you have been putting off doing alone.'
};

export const viewport = { themeColor: '#f6f3ec' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
