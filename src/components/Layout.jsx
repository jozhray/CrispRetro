import React from 'react';
import Header from './Header';

const Layout = ({ children }) => {
    const isLoginPage = window.location.pathname === '/login';
    const showHeader = !isLoginPage;

    return (
        <div className="min-h-screen text-gray-900 font-sans">
            <Header />
            <main className={`container mx-auto px-4 ${showHeader ? 'pt-12' : 'pt-4'} pb-8 relative z-10`}>
                {children}
            </main>
        </div>
    );
};

export default Layout;
