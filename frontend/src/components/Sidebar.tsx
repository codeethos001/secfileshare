import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FolderLock,
  Share2,
  Activity,
  Settings,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Files', to: '/upload', icon: UploadCloud },
    { name: 'My Files', to: '/files', icon: FolderLock },
    { name: 'Sharing Links', to: '/shares', icon: Share2 },
    { name: 'Security Activity', to: '/activity', icon: Activity },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-navy-900/50 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Platform Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Security Status Box */}
      <div className="p-3.5 rounded-xl bg-navy-950 border border-cyan-900/40 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>E2EE Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          AES-256-GCM chunked encryption with client-side keys. The server cannot access file content.
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-500/80">
          <Lock className="w-3 h-3" />
          <span>RFC 9180 + RFC 9106</span>
        </div>
      </div>
    </aside>
  );
};
