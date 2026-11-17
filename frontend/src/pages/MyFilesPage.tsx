import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Share2,
  Trash2,
  Lock,
  FileCheck,
  AlertCircle,
  Clock,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { EncryptedFileItem } from '../types';

export const MyFilesPage: React.FC = () => {
  const [files, setFiles] = useState<EncryptedFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const data = await api.listFiles();
      setFiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this file and all its ciphertext storage?')) {
      return;
    }
    try {
      await api.deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Encrypted Files Vault</h1>
          <p className="text-xs text-slate-400">
            Stored ciphertext chunks indexed without plaintext metadata.
          </p>
        </div>
        <Link
          to="/upload"
          className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          Upload New File
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <FolderLock className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-300 font-medium">No files uploaded yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Files uploaded to SecureShare are converted into AES-256-GCM ciphertext chunks before transfer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                <tr>
                  <th className="pb-3 font-semibold">Storage Object ID</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Ciphertext Size</th>
                  <th className="pb-3 font-semibold">Chunks</th>
                  <th className="pb-3 font-semibold">IV Prefix</th>
                  <th className="pb-3 font-semibold">Uploaded</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-mono text-cyan-400 font-medium">{file.id}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
                        {file.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono">{formatBytes(file.ciphertext_size)}</td>
                    <td className="py-3">{file.chunk_count} chunk(s)</td>
                    <td className="py-3 font-mono text-slate-400">{file.iv_prefix}</td>
                    <td className="py-3 text-slate-400">
                      {new Date(file.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to="/shares"
                          className="p-1.5 rounded-lg bg-navy-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 transition"
                          title="Share Link"
                        >
                          <Share2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1.5 rounded-lg bg-navy-950 hover:bg-red-950/40 border border-slate-700 text-slate-300 hover:text-red-400 transition"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
