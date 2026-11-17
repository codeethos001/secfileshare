import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Share2,
  Clock,
  HardDrive,
  UploadCloud,
  ShieldCheck,
  ArrowUpRight,
  Trash2,
  Lock,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api';
import { EncryptedFileItem, ShareItem } from '../types';

export const DashboardPage: React.FC = () => {
  const [files, setFiles] = useState<EncryptedFileItem[]>([]);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [userFiles, userShares] = await Promise.all([
        api.listFiles(),
        api.listShares(),
      ]);
      setFiles(userFiles);
      setShares(userShares);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalBytes = files.reduce((acc, f) => acc + (f.ciphertext_size || 0), 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const activeSharesCount = shares.filter((s) => s.status === 'ACTIVE').length;
  const expiredSharesCount = shares.filter((s) => s.status !== 'ACTIVE').length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Security Dashboard</h1>
          <p className="text-xs text-slate-400">
            Real-time telemetry and zero-knowledge file vault status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Encrypted File
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Files"
          value={files.length}
          subtitle="Encrypted objects stored"
          icon={FileText}
          badge="E2EE"
        />
        <StatCard
          title="Active Shares"
          value={activeSharesCount}
          subtitle="Currently accessible links"
          icon={Share2}
        />
        <StatCard
          title="Expired Shares"
          value={expiredSharesCount}
          subtitle="Revoked or timed-out"
          icon={Clock}
        />
        <StatCard
          title="Storage Usage"
          value={formatBytes(totalBytes)}
          subtitle="Ciphertext payload volume"
          icon={HardDrive}
        />
      </div>

      {/* Recent Files Table */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Uploads</h2>
            <p className="text-xs text-slate-400">Encrypted file objects stored on the server</p>
          </div>
          <Link to="/files" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
            View All Files <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-300 font-medium">No encrypted files uploaded yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Select any file to encrypt it client-side with AES-256-GCM and upload the ciphertext.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition"
            >
              Upload your first file
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="pb-3 font-semibold">Object ID</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Ciphertext Size</th>
                  <th className="pb-3 font-semibold">Chunks</th>
                  <th className="pb-3 font-semibold">Uploaded</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {files.slice(0, 5).map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-mono text-cyan-400">
                      {file.id.substring(0, 8)}...{file.id.substring(file.id.length - 4)}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
                        {file.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono">{formatBytes(file.ciphertext_size)}</td>
                    <td className="py-3">{file.chunk_count} chunk(s)</td>
                    <td className="py-3 text-slate-400">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to="/shares"
                        className="text-xs px-2.5 py-1 rounded-lg bg-navy-950 hover:bg-slate-800 border border-slate-700 text-slate-200 transition inline-flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3 text-cyan-400" />
                        Share
                      </Link>
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
