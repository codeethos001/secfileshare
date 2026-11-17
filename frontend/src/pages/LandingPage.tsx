import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Key,
  ServerOff,
  Zap,
  CheckCircle2,
  ArrowRight,
  Database,
  FileCheck,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono font-medium shadow-inner">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Zero-Knowledge End-to-End Encrypted File Sharing</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          True Privacy. <br />
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
            The server cannot decrypt your files.
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Files are sliced and encrypted using authenticated <strong className="text-slate-200">AES-256-GCM</strong> inside your browser before upload. 
          Keys never touch our database. Recipients decrypt entirely on client-side.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold transition shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
          >
            Start Sharing Securely
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-navy-900 hover:bg-slate-800 text-slate-200 font-semibold border border-slate-700 transition flex items-center justify-center gap-2"
          >
            Access Your Vault
          </Link>
        </div>
      </section>

      {/* Trust & Architecture Diagram */}
      <section className="p-8 rounded-2xl bg-navy-900 border border-slate-800 shadow-xl space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">How Zero-Knowledge E2EE Works</h2>
          <p className="text-sm text-slate-400">
            Cryptographic guarantees separating client secrets from server storage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-xl bg-navy-950 border border-cyan-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold">
              1
            </div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              Browser Encryption
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your file is divided into 4 MB chunks. A 256-bit AES key is generated in memory. Each chunk is encrypted with AES-256-GCM.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-mono font-bold">
              2
            </div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ServerOff className="w-4 h-4 text-amber-400" />
              Blind Storage
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The backend receives only raw ciphertext bytes and random UUID identifiers. Even in a complete server compromise, files cannot be decrypted.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl bg-navy-950 border border-cyan-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold">
              3
            </div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Recipient Decryption
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The recipient retrieves the key via URL fragment (#k=...) or HPKE envelope, authenticates chunk tags, and restores the original file.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-navy-900/70 border border-slate-800 space-y-3">
          <Zap className="w-6 h-6 text-cyan-400" />
          <h4 className="text-base font-semibold text-white">4 MB Authenticated Slices</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Chunk-based streaming allows uploading large files without running out of browser memory, with each chunk independently authenticated.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-navy-900/70 border border-slate-800 space-y-3">
          <FileCheck className="w-6 h-6 text-emerald-400" />
          <h4 className="text-base font-semibold text-white">Tamper Detection</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Associated Authenticated Data (AAD) locks the protocol version, file ID, and chunk index to prevent byte modification or reordering.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-navy-900/70 border border-slate-800 space-y-3">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
          <h4 className="text-base font-semibold text-white">Self-Expiring Shares</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Set mandatory expiration times and maximum download limits. Revoke access to active links at any second with a single click.
          </p>
        </div>
      </section>
    </div>
  );
};
