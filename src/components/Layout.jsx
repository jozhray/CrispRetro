import React from 'react';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
};

export default Layout;
