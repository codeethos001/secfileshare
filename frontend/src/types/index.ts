export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  has_keypair: boolean;
}

export interface AuthResponse {
  token: string;
  expires_at: string;
  user: User;
}

export interface EncryptedFileItem {
  id: string;
  owner_id: string;
  chunk_count: number;
  iv_prefix: string;
  crypto_version: string;
  status: 'INITIALIZING' | 'UPLOADING' | 'COMPLETED' | 'DELETED';
  ciphertext_size: number;
  created_at: string;
  active_shares_count?: number;
}

export interface ShareItem {
  id: string;
  file_id: string;
  owner_id: string;
  share_type: 'LINK' | 'RECIPIENT';
  expiry?: string | null;
  max_downloads?: number | null;
  download_count: number;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  created_at: string;
}

export interface PublicShareInfo {
  share_id: string;
  file_id: string;
  chunk_count: number;
  iv_prefix: string;
  crypto_version: string;
  ciphertext_size: number;
  is_expired: boolean;
  is_limit_reached: boolean;
  status: string;
  created_at: string;
}

export interface DownloadSessionResponse {
  download_session_token: string;
  chunk_count: number;
  iv_prefix: string;
  crypto_version: string;
  ciphertext_size: number;
  expires_at: string;
}

export interface AuditEventItem {
  id: string;
  user_id: string | null;
  event_type: string;
  ip_address: string | null;
  timestamp: string;
  metadata_json: string;
  prev_hash: string | null;
}
