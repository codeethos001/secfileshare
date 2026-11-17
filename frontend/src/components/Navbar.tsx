import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, LogOut, User as UserIcon, UploadCloud, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-slate-800 bg-navy-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Secure<span className="text-cyan-400">Share</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Zero-Knowledge
                </span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/upload"
                  className="text-sm font-medium px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload
                </Link>
                <div className="h-6 w-px bg-slate-800" />
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-200 font-medium">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 px-4 py-1.5 rounded-lg transition shadow-md shadow-cyan-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
