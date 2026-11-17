import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Download,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  HardDrive,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api';
import { PublicShareInfo } from '../types';

export const DownloadPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();

  const [shareInfo, setShareInfo] = useState<PublicShareInfo | null>(null);
  const [secretKeyBase64, setSecretKeyBase64] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tamperedChunk, setTamperedChunk] = useState<number | null>(null);

  // Decrypted Manifest Metadata
  const [decryptedManifest, setDecryptedManifest] = useState<{
    filename: string;
    mime_type: string;
    file_size: number;
  } | null>(null);

  useEffect(() => {
    // 1. Extract secret key from URL fragment #k=...
    const hash = window.location.hash;
    let keyFromHash: string | null = null;
    if (hash && hash.includes('k=')) {
      const match = hash.match(/k=([^&]+)/);
      if (match && match[1]) {
        keyFromHash = match[1];
        setSecretKeyBase64(match[1]);
      }
      // Scrub key from browser address bar immediately for security
      window.history.replaceState(null, '', window.location.pathname);
    }

    // 2. Fetch public share metadata from backend
    const loadShare = async () => {
      if (!shareId) return;
      try {
        const info = await api.getPublicShare(shareId);
        setShareInfo(info);
      } catch (err: any) {
        setError(err.message || 'Share not found or expired');
      } finally {
        setLoading(false);
      }
    };

    loadShare();
  }, [shareId]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleDecryptAndDownload = async () => {
    const keyStr = secretKeyBase64 || keyInput.trim();
    if (!keyStr) {
      setError('Decryption key is missing. Please provide the secret key.');
      return;
    }
    if (!shareId || !shareInfo) return;

    setDecrypting(true);
    setError(null);
    setProgress(0);

    try {
      // 1. Decode base64 key
      setStatusMessage('Parsing 256-bit AES-GCM decryption key...');
      const paddedKey = keyStr.replace(/-/g, '+').replace(/_/g, '/');
      const binaryString = atob(paddedKey);
      const keyBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        keyBytes[i] = binaryString.charCodeAt(i);
      }

      // 2. Import into Web Crypto
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // 3. Initiate authorized download session on server
      setStatusMessage('Requesting authorized download session from server...');
      const sessionRes = await api.startDownloadSession(shareId);
      const sessionToken = sessionRes.download_session_token;
      const totalChunks = sessionRes.chunk_count;

      // Helper to build 96-bit (12-byte) IV for chunk index
      const ivPrefixBytes = new Uint8Array(
        sessionRes.iv_prefix.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );

      const buildIV = (index: number) => {
        const iv = new Uint8Array(12);
        iv.set(ivPrefixBytes, 0);
        const view = new DataView(iv.buffer);
        view.setUint32(8, index, false);
        return iv;
      };

      // Helper to build Associated Authenticated Data (AAD)
      const buildAAD = (index: number) => {
        const aadObj = {
          v: 1,
          file_id: shareInfo.share_id ? shareInfo.share_id : sessionToken,
          chunk_index: index,
          total_chunks: totalChunks,
        };
        // For file_id in AAD, we match upload parameter
        return new TextEncoder().encode(JSON.stringify(aadObj));
      };

      // 4. Download and Decrypt Chunk 0 (Manifest)
      setStatusMessage('Downloading & authenticating metadata manifest (Chunk 0)...');
      setProgress(15);
      const manifestCiphertext = await api.fetchCiphertextChunk(sessionToken, 0);

      let manifestPlaintext: ArrayBuffer;
      try {
        manifestPlaintext = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: buildIV(0) },
          cryptoKey,
          manifestCiphertext
        );
      } catch (authErr) {
        throw new Error(
          'Integrity verification failed for Chunk 0! Either the encryption key is incorrect or the ciphertext has been modified.'
        );
      }

      const manifestStr = new TextDecoder().decode(manifestPlaintext);
      const manifest = JSON.parse(manifestStr);
      setDecryptedManifest(manifest);

      const dataChunksCount = totalChunks - 1;
      const decryptedParts: BlobPart[] = [];

      // 5. Download & Decrypt Data Chunks (1 to N)
      for (let i = 1; i <= dataChunksCount; i++) {
        setStatusMessage(`Downloading & decrypting chunk ${i} of ${dataChunksCount}...`);
        const chunkCiphertext = await api.fetchCiphertextChunk(sessionToken, i);

        let chunkPlaintext: ArrayBuffer;
        try {
          chunkPlaintext = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: buildIV(i) },
            cryptoKey,
            chunkCiphertext
          );
        } catch (chunkErr) {
          setTamperedChunk(i);
          throw new Error(
            `Cryptographic authentication failed on Chunk ${i}! Tampering or corruption detected.`
          );
        }

        decryptedParts.push(chunkPlaintext);
        const currentProgress = 20 + Math.floor((i / dataChunksCount) * 75);
        setProgress(currentProgress);
      }

      // 6. Assemble Blob and trigger browser download as attachment
      setStatusMessage('File authenticated and verified. Initiating download...');
      setProgress(100);

      const finalBlob = new Blob(decryptedParts, {
        type: manifest.mime_type || 'application/octet-stream',
      });
      const downloadUrl = window.URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = manifest.filename || 'secure_download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setStatusMessage('Decryption and download complete!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Decryption failed.');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full p-8 rounded-2xl bg-navy-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Zero-Knowledge Download</h1>
          <p className="text-xs text-slate-400">
            Files are authenticated and decrypted directly in your browser.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Security Alert</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-slate-400">Verifying share token with backend...</p>
          </div>
        ) : shareInfo ? (
          <div className="space-y-6">
            {/* Share Metadata Card */}
            <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Security Suite</span>
                <span className="font-mono text-cyan-400">{shareInfo.crypto_version}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Ciphertext Payload</span>
                <span className="font-mono text-slate-200">
                  {formatBytes(shareInfo.ciphertext_size)} ({shareInfo.chunk_count} chunks)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Transfer Security</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  AES-256-GCM Authenticated
                </span>
              </div>
            </div>

            {/* Key Input if fragment wasn't present */}
            {!secretKeyBase64 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Enter Secret Decryption Key:
                </label>
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste URL fragment secret key here..."
                  className="w-full px-3 py-2.5 rounded-xl bg-navy-950 border border-slate-800 focus:border-cyan-500 font-mono text-xs text-cyan-300 outline-none"
                />
              </div>
            )}

            {/* Decrypted manifest preview if available */}
            {decryptedManifest && (
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/60 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                  <FileCheck className="w-4 h-4" />
                  <span>Decrypted Metadata</span>
                </div>
                <p className="text-sm font-bold text-white">{decryptedManifest.filename}</p>
                <p className="text-xs text-slate-400 font-mono">
                  {formatBytes(decryptedManifest.file_size)} • {decryptedManifest.mime_type}
                </p>
              </div>
            )}

            {/* Decryption progress bar */}
            {decrypting && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    {statusMessage}
                  </span>
                  <span className="text-cyan-400">{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Decrypt & Download Action Button */}
            <button
              onClick={handleDecryptAndDownload}
              disabled={decrypting}
              className="w-full py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-bold text-sm transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {decrypting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating & Decrypting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Decrypt & Download Original File
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
