import React, { useState, useEffect } from 'react';
import {
  Share2,
  Lock,
  Copy,
  CheckCircle2,
  Slash,
  AlertCircle,
  Clock,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api';
import { ShareItem } from '../types';

export const SharesPage: React.FC = () => {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchShares = async () => {
    try {
      const data = await api.listShares();
      setShares(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shares');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const handleRevoke = async (shareId: string) => {
    if (!window.confirm('Are you sure you want to revoke this share link? Future downloads will be denied.')) {
      return;
    }
    try {
      await api.revokeShare(shareId);
      setShares((prev) =>
        prev.map((s) => (s.id === shareId ? { ...s, status: 'REVOKED' } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to revoke share');
    }
  };

  const copyShareId = (shareId: string) => {
    navigator.clipboard.writeText(shareId);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Active Sharing Links</h1>
        <p className="text-xs text-slate-400">
          Control access policies, monitor download session quotas, or immediately revoke authorization.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Zero-knowledge disclaimer notice */}
      <div className="p-4 rounded-xl bg-navy-900 border border-cyan-900/40 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-slate-200">Zero-Knowledge Key Storage Notice</p>
          <p className="text-slate-400 leading-relaxed">
            The server does not store file decryption keys. The complete link with fragment (<code className="text-cyan-400">#k=...</code>) is generated once in your browser. If a link is lost, access cannot be recovered without the original secret key.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shares.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <Share2 className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-300 font-medium">No active shares found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You can create secret share links from the Upload page or My Files page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="pb-3 font-semibold">Share Token</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Downloads</th>
                  <th className="pb-3 font-semibold">Expires</th>
                  <th className="pb-3 font-semibold">Created</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {shares.map((share) => (
                  <tr key={share.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-mono text-cyan-400 flex items-center gap-2">
                      <span>{share.id.substring(0, 12)}...</span>
                      <button
                        onClick={() => copyShareId(share.id)}
                        className="text-slate-500 hover:text-slate-300 transition"
                        title="Copy Share ID"
                      >
                        {copiedId === share.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {share.share_type}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                          share.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : share.status === 'REVOKED'
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : 'bg-amber-950 text-amber-400 border-amber-800'
                        }`}
                      >
                        {share.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono">
                      {share.download_count} / {share.max_downloads || '∞'}
                    </td>
                    <td className="py-3 text-slate-400">
                      {share.expiry ? new Date(share.expiry).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(share.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      {share.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevoke(share.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-[11px] font-medium transition inline-flex items-center gap-1"
                        >
                          <Slash className="w-3 h-3" />
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
