import '../src/index.css';

export const metadata = {
  title: 'CHITVAULT',
  description: 'A Database-Driven Chit Fund Management and Auction System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}