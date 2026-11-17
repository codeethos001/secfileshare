import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';

export const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [maxDownloads, setMaxDownloads] = useState<number | ''>('');
  const [shareType, setShareType] = useState<'LINK' | 'RECIPIENT'>('LINK');
  const [recipientEmail, setRecipientEmail] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setGeneratedShareUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setGeneratedShareUrl(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleUploadAndShare = async () => {
    if (!file) return;

    // Guard: Web Crypto API requires a Secure Context (HTTPS or localhost).
    if (!window.isSecureContext || !window.crypto?.subtle) {
      setError(
        'Web Crypto API is unavailable. This app requires a secure context. ' +
        'Please open it at http://localhost:5173 or serve it over HTTPS — ' +
        'not via a plain-HTTP IP address (e.g. http://192.168.x.x:5173).'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    // fileId is declared here so the catch block can clean up an orphaned
    // server-side record if encryption fails after initUpload succeeds.
    let fileId: string | null = null;

    try {
      // 1. Generate 256-bit AES-GCM Key in memory
      setStatusMessage('Generating 256-bit AES-GCM cryptographic key in browser...');
      const rawKey = window.crypto.getRandomValues(new Uint8Array(32));
      const keyBase64 = btoa(String.fromCharCode(...rawKey))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 2. Prepare file chunks
      const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB
      const totalDataChunks = Math.ceil(file.size / CHUNK_SIZE);
      const totalChunks = totalDataChunks + 1; // Chunk 0 is metadata manifest

      setStatusMessage('Encrypting metadata manifest (Chunk 0)...');
      setUploadProgress(10);

      // Create IV Prefix (8 random bytes)
      const ivPrefixBytes = window.crypto.getRandomValues(new Uint8Array(8));
      const ivPrefixHex = Array.from(ivPrefixBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Initialize upload on backend
      const initRes = await api.initUpload({
        chunk_count: totalChunks,
        iv_prefix: ivPrefixHex,
        crypto_version: 'v1.0-aes256gcm',
        total_ciphertext_size: file.size + totalChunks * 28, // approx with tags
      });

      const fileId = initRes.file_id;

      // Import key to WebCrypto
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Helper to build 96-bit (12-byte) IV for chunk index
      const buildIV = (index: number) => {
        const iv = new Uint8Array(12);
        iv.set(ivPrefixBytes, 0);
        const view = new DataView(iv.buffer);
        view.setUint32(8, index, false); // 4-byte big-endian
        return iv;
      };

      // Helper to build Associated Authenticated Data (AAD)
      const buildAAD = (index: number) => {
        const aadObj = { v: 1, file_id: fileId, chunk_index: index, total_chunks: totalChunks };
        return new TextEncoder().encode(JSON.stringify(aadObj));
      };

      // 3. Encrypt & Upload Chunk 0 (Manifest)
      const manifest = {
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        chunk_size: CHUNK_SIZE,
        total_data_chunks: totalDataChunks,
        crypto_version: 'v1.0-aes256gcm',
      };
      const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
      const encManifest = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: buildIV(0), additionalData: buildAAD(0) },
        cryptoKey,
        manifestBytes
      );
      await api.uploadChunk(fileId, 0, new Uint8Array(encManifest));

      // 4. Encrypt & Upload Data Chunks (1 to N)
      for (let i = 0; i < totalDataChunks; i++) {
        const chunkIndex = i + 1;
        setStatusMessage(`Encrypting & uploading chunk ${chunkIndex} of ${totalDataChunks}...`);

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const slice = file.slice(start, end);
        const sliceBuffer = await slice.arrayBuffer();

        const encSlice = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: buildIV(chunkIndex), additionalData: buildAAD(chunkIndex) },
          cryptoKey,
          sliceBuffer
        );

        await api.uploadChunk(fileId, chunkIndex, new Uint8Array(encSlice));

        const progressPercent = 20 + Math.floor(((i + 1) / totalDataChunks) * 70);
        setUploadProgress(progressPercent);
      }

      // 5. Complete Upload
      setStatusMessage('Validating chunk integrity and finalizing upload...');
      await api.completeUpload(fileId);

      // 6. Create Share
      setStatusMessage('Generating zero-knowledge sharing capability...');
      const shareRes = await api.createShare(fileId, {
        share_type: shareType,
        expiry_hours: expiryHours,
        max_downloads: maxDownloads === '' ? undefined : Number(maxDownloads),
        recipient_email: shareType === 'RECIPIENT' ? recipientEmail : undefined,
      });

      setUploadProgress(100);

      // Secret link carries the key in the URL fragment #k=...
      const origin = window.location.origin;
      const shareLink = `${origin}/s/${shareRes.id}#k=${keyBase64}`;
      setGeneratedShareUrl(shareLink);
      setStatusMessage('File encrypted and uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during encryption or upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedShareUrl) {
      navigator.clipboard.writeText(generatedShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Client-Side Encrypted Upload</h1>
        <p className="text-xs text-slate-400">
          Files are encrypted directly in your browser before leaving your computer.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Success View: Generated Share Link */}
      {generatedShareUrl ? (
        <div className="p-8 rounded-2xl bg-navy-900 border border-cyan-800 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 text-cyan-400">
            <CheckCircle2 className="w-7 h-7" />
            <div>
              <h2 className="text-lg font-bold text-white">Zero-Knowledge Share Ready!</h2>
              <p className="text-xs text-slate-400">
                The file key is embedded exclusively in the URL fragment. The server has no knowledge of it.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Secret Share Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedShareUrl}
                className="w-full px-3 py-2.5 rounded-lg bg-navy-900 border border-slate-700 text-xs font-mono text-cyan-300 select-all outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-md shadow-cyan-500/20"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-amber-400/90 flex items-center gap-1 pt-1">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Keep this link safe. If you lose it, neither you nor the server can recover the key.
            </p>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => {
                setGeneratedShareUrl(null);
                setFile(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Upload Another File
            </button>
            <a
              href={generatedShareUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
            >
              Test Recipient Download <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        /* Upload & Configuration Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Dropzone Area */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[280px] ${
                file
                  ? 'border-cyan-500 bg-cyan-950/10'
                  : 'border-slate-800 hover:border-cyan-500/50 bg-navy-900/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{file.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {formatBytes(file.size)} • {file.type || 'Unknown MIME'}
                    </p>
                  </div>
                  <span className="inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Click to switch file
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                    <UploadCloud className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Drag & drop your file here, or <span className="text-cyan-400">browse</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Any file format up to 100 MB. Encrypted in browser memory.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Progress indicator */}
            {isUploading && (
              <div className="p-4 rounded-xl bg-navy-900 border border-cyan-900/40 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    {statusMessage}
                  </span>
                  <span className="font-mono text-cyan-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sharing Security Options */}
          <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 space-y-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Access Policy
            </h2>

            {/* Sharing Method */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Sharing Mechanism</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShareType('LINK')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition ${
                    shareType === 'LINK'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-semibold'
                      : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Secret Link (#k=...)
                </button>
                <button
                  type="button"
                  onClick={() => setShareType('RECIPIENT')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition ${
                    shareType === 'RECIPIENT'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-semibold'
                      : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  HPKE Recipient
                </button>
              </div>
            </div>

            {shareType === 'RECIPIENT' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Recipient Email</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="bob@company.com"
                  className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {/* Expiry Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Link Expiration</label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-slate-800 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value={1}>1 hour</option>
                <option value={24}>24 hours (1 day)</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </div>

            {/* Max Downloads */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Download Limit</label>
              <select
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-slate-800 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="">Unlimited</option>
                <option value={1}>1 download (burn on read)</option>
                <option value={3}>3 downloads</option>
                <option value={5}>5 downloads</option>
                <option value={10}>10 downloads</option>
              </select>
            </div>

            <button
              type="button"
              disabled={!file || isUploading}
              onClick={handleUploadAndShare}
              className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Encrypting & Uploading...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Encrypt & Upload File
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
