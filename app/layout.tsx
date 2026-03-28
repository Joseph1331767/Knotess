import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Node Graph Editor',
  description: 'Infinite 2D node graph visualizer and editor',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  console.log('RootLayout Rendered');
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
