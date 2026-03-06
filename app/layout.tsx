import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Cafe Lua Manager',
    description: 'Local management tool for cafelua.com',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body>
                <nav className="nav">
                    <span className="nav-brand">Cafe Lua</span>
                    <a href="/">Posts</a>
                    <a href="/editor">Editor</a>
                    <a href="/manage">Manage</a>
                </nav>
                {children}
            </body>
        </html>
    );
}
