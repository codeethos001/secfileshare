import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Clock,
  Terminal,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { AuditEventItem } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getEventBadge = (type: string) => {
    if (type.includes('LOGIN') || type.includes('REGISTER')) {
      return 'bg-blue-950 text-blue-400 border-blue-800';
    }
    if (type.includes('UPLOAD') || type.includes('COMPLETE')) {
      return 'bg-emerald-950 text-emerald-400 border-emerald-800';
    }
    if (type.includes('REVOKE') || type.includes('FAILED')) {
      return 'bg-red-950 text-red-400 border-red-800';
    }
    if (type.includes('DOWNLOAD')) {
      return 'bg-cyan-950 text-cyan-400 border-cyan-800';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Security Audit Log</h1>
          <p className="text-xs text-slate-400">
            Tamper-evident hash-chained sequence of authentication and cryptographic operations.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-lg bg-navy-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* Hash Chaining Guarantee Box */}
      <div className="p-4 rounded-xl bg-navy-900 border border-cyan-900/40 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-slate-200">Cryptographic Chain Verification</p>
          <p className="text-slate-400 leading-relaxed">
            Each audit event computes a SHA-256 hash linking the prior event's digest, timestamp, and sanitized metadata. Any modification to logged records invalidates subsequent hashes in the chain.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No audit events recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-3.5 rounded-xl bg-navy-950 border border-slate-800/80 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${getEventBadge(
                        event.event_type
                      )}`}
                    >
                      {event.event_type}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-mono text-slate-300 text-[11px]">
                    Payload: {event.metadata_json}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:text-right shrink-0">
                  <div className="text-[10px] font-mono text-slate-500">
                    <div>Chain Hash:</div>
                    <div className="text-cyan-500/80">
                      {event.prev_hash ? `${event.prev_hash.substring(0, 16)}...` : 'GENESIS'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
