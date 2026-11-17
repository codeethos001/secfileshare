# SecureShare Database Schema

The database stores metadata, session states, permissions, and audit logs. It does **not** store file keys or plaintext file content.

---

## Entity Relationship Summary

```
 users (1) ───────────< (N) sessions
   │
   ├─────────< (1) user_keys
   │
   ├─────────< (N) files (1) ───────< (N) file_chunks
   │                 │
   │                 ├──────────────< (N) shares (1) ───< (N) download_sessions
   │                 │
   │                 └──────────────< (N) key_envelopes (N) >───── users (recipients)
   │
   └─────────< (N) audit_events
```

---

## Table Specifications

### 1. `users`
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `name` (VARCHAR(100)): User display name.
- `email` (VARCHAR(255), UNIQUE, INDEX): Account email address.
- `password_hash` (VARCHAR(255)): Argon2id password hash.
- `created_at` (DATETIME): Registration timestamp.
- `is_active` (BOOLEAN): Account status flag.

### 2. `sessions`
- `id` (VARCHAR(36), PK): UUID v4 session ID.
- `user_id` (VARCHAR(36), FK -> users.id, INDEX): Session owner.
- `token_hash` (VARCHAR(64), UNIQUE, INDEX): SHA-256 hash of bearer session token.
- `expires_at` (DATETIME): Session expiration timestamp.
- `created_at` (DATETIME): Session creation timestamp.

### 3. `user_keys`
- `id` (VARCHAR(36), PK): Record UUID.
- `user_id` (VARCHAR(36), FK -> users.id, UNIQUE): User identifier.
- `public_key` (TEXT): Base64-encoded HPKE X25519 public key.
- `encrypted_private_key` (TEXT): AES-256-GCM encrypted private key blob.
- `salt` (VARCHAR(64)): Salt used for Argon2id recovery passphrase derivation.
- `nonce` (VARCHAR(32)): Nonce / IV for private key encryption.
- `key_version` (INT): Key iteration version.
- `created_at` (DATETIME): Creation timestamp.

### 4. `files`
- `id` (VARCHAR(36), PK): Unique file identifier (client-generated or server-assigned).
- `owner_id` (VARCHAR(36), FK -> users.id, INDEX): File uploader.
- `chunk_count` (INT): Total encrypted chunks including manifest chunk 0.
- `iv_prefix` (VARCHAR(32)): 8-byte random IV prefix encoded in hex/base64.
- `crypto_version` (VARCHAR(16)): Cryptographic suite identifier (e.g., `v1.0-aes256gcm`).
- `status` (VARCHAR(20)): `INITIALIZING`, `UPLOADING`, `COMPLETED`, `DELETED`.
- `ciphertext_size` (BIGINT): Total size of all encrypted chunks in bytes.
- `created_at` (DATETIME): Creation timestamp.

### 5. `file_chunks`
- `id` (VARCHAR(36), PK): Record UUID.
- `file_id` (VARCHAR(36), FK -> files.id, INDEX): Associated file.
- `chunk_index` (INT, INDEX): Sequential chunk index (0 to N).
- `storage_key` (VARCHAR(255), UNIQUE): Filesystem storage identifier.
- `ciphertext_size` (INT): Size of chunk in bytes.
- `created_at` (DATETIME): Upload timestamp.

### 6. `shares`
- `id` (VARCHAR(36), PK): Public share token (high-entropy string).
- `file_id` (VARCHAR(36), FK -> files.id, INDEX): Shared file.
- `owner_id` (VARCHAR(36), FK -> users.id): Sharer user ID.
- `share_type` (VARCHAR(20)): `LINK` (URL fragment) or `RECIPIENT` (HPKE).
- `expiry` (DATETIME, NULLABLE): Optional expiration timestamp.
- `max_downloads` (INT, NULLABLE): Maximum allowable download sessions (or NULL for unlimited).
- `download_count` (INT): Current tally of authorized download sessions.
- `status` (VARCHAR(20)): `ACTIVE`, `REVOKED`, `EXPIRED`.
- `created_at` (DATETIME): Creation timestamp.

### 7. `key_envelopes`
- `id` (VARCHAR(36), PK): Record UUID.
- `file_id` (VARCHAR(36), FK -> files.id, INDEX): Associated file.
- `recipient_id` (VARCHAR(36), FK -> users.id, INDEX): Authorized recipient.
- `encapsulated_key` (TEXT): HPKE encapsulated ephemeral key (`enc`).
- `encrypted_key` (TEXT): HPKE-encrypted AES file key (`ct`).
- `created_at` (DATETIME): Creation timestamp.

### 8. `download_sessions`
- `id` (VARCHAR(36), PK): Session identifier.
- `share_id` (VARCHAR(36), FK -> shares.id, INDEX): Associated share.
- `token_hash` (VARCHAR(64), UNIQUE, INDEX): SHA-256 hash of temporary download authorization token.
- `expires_at` (DATETIME): Download authorization expiration.
- `created_at` (DATETIME): Session creation timestamp.

### 9. `audit_events`
- `id` (VARCHAR(36), PK): Audit record UUID.
- `user_id` (VARCHAR(36), NULLABLE, INDEX): Related user ID or NULL for anonymous.
- `event_type` (VARCHAR(50), INDEX): e.g., `USER_LOGIN`, `FILE_UPLOAD_INIT`, `CHUNK_UPLOADED`, `FILE_COMPLETED`, `SHARE_CREATED`, `DOWNLOAD_STARTED`, `SHARE_REVOKED`.
- `ip_address` (VARCHAR(45), NULLABLE): Client IP address.
- `timestamp` (DATETIME): Timestamp of occurrence.
- `metadata_json` (TEXT): Non-sensitive contextual metadata.
- `prev_hash` (VARCHAR(64), NULLABLE): SHA-256 of preceding audit record for tamper-evident chaining.
