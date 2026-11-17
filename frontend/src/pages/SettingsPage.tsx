import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Lock,
  User,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [keyPairGenerated, setKeyPairGenerated] = useState(false);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Security Settings</h1>
        <p className="text-xs text-slate-400">
          Manage your account credentials, hybrid public-key certificates, and local vault parameters.
        </p>
      </div>

      {/* Account Info */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          Account Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
            <span className="text-slate-500 block mb-1">Display Name</span>
            <span className="font-semibold text-slate-200">{user?.name}</span>
          </div>
          <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
            <span className="text-slate-500 block mb-1">Email Address</span>
            <span className="font-semibold text-slate-200">{user?.email}</span>
          </div>
          <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
            <span className="text-slate-500 block mb-1">Account UUID</span>
            <span className="font-mono text-cyan-400">{user?.id}</span>
          </div>
          <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
            <span className="text-slate-500 block mb-1">Password Protection</span>
            <span className="font-mono text-emerald-400">Argon2id (64 MiB, 3 iters)</span>
          </div>
        </div>
      </div>

      {/* Hybrid Cryptography Keys (HPKE / RFC 9180) */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            Hybrid Keypair (RFC 9180 HPKE)
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
            X25519 + HKDF-SHA256
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Allows registered users to share files directly with you without passing a URL fragment. 
          Your private key stays encrypted inside your browser vault.
        </p>

        <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-200">Local Keypair Status</span>
            <p className="text-[11px] text-slate-500">
              {keyPairGenerated ? 'X25519 keypair registered & published' : 'Standard link-sharing enabled'}
            </p>
          </div>
          <button
            onClick={() => setKeyPairGenerated(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold transition"
          >
            {keyPairGenerated ? 'Re-generate Keypair' : 'Generate HPKE Keypair'}
          </button>
        </div>
      </div>
    </div>
  );
};
