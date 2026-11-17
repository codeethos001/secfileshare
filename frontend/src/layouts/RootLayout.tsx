import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#070B14]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
