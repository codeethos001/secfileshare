# SecureShare System Architecture

## 1. Architectural Overview

SecureShare is a Zero-Knowledge, End-to-End Encrypted (E2EE) file-sharing platform designed with the core tenet that **the server must never possess the keys or capability to decrypt uploaded files**. 

### Trust Boundary Diagram

```
[ Sender Browser ]
  │
  ├─ 1. Generate AES-256-GCM file key locally
  ├─ 2. Divide file into 4 MB chunks
  ├─ 3. Encrypt manifest (chunk 0) + chunks with AES-256-GCM
  ├─ 4. Encapsulate file key via HPKE (RFC 9180) or URL fragment (#k=...)
  │
  ▼ (HTTPS - Ciphertext & Envelope Only)
[ FastAPI Backend + Reverse Proxy (Nginx) ]
  │  • Authenticates users and enforces authorization
  │  • Stores ONLY encrypted ciphertext chunks & cryptographic metadata
  │  • Has NO access to file keys, plaintext filenames, or recovery passphrases
  │
  ├───► [ MariaDB / Database ] (Users, Key Envelopes, Shares, Audit Trail)
  └───► [ Encrypted Object Storage ] (Isolated ciphertext chunks)
  │
  ▼ (Authorized Ciphertext Download)
[ Recipient Browser ]
  │
  ├─ 1. Retrieve ciphertext chunks
  ├─ 2. Retrieve file key via URL fragment (#k=...) or unwrap HPKE envelope
  ├─ 3. Authenticate and decrypt each chunk locally using Web Crypto API
  └─ 4. Verify integrity and assemble original plaintext file
```

---

## 2. Key Architectural Components

### A. Frontend (Client-Side Encryption)
- **Framework**: React 18 + TypeScript + Vite.
- **Styling**: Tailwind CSS with a professional dark security theme (Navy/Cyan/Slate).
- **Cryptographic Engine**: Native Web Crypto API (`crypto.subtle`) for high-performance AES-256-GCM encryption/decryption and RFC 9180 HPKE.
- **State Management & Routing**: React Router v6, React Hook Form, Zod schema validation.

### B. Backend (Storage & Access Control)
- **Framework**: Python 3 + FastAPI.
- **ORM & Migrations**: SQLAlchemy 2.0 with Alembic.
- **Authentication**: Argon2id password hashing, secure session management, and brute-force protection.
- **Role**: Validates storage quotas, enforces link expiration and download session limits, stores key envelopes, and serves ciphertext. The backend contains **zero** decryption code.

### C. Database & Storage
- **Database**: MariaDB / SQLite compatible with SQLAlchemy.
- **Tables**: `users`, `sessions`, `user_keys`, `files`, `file_chunks`, `shares`, `key_envelopes`, `download_sessions`, `audit_events`.
- **Storage Subsystem**: Filesystem-isolated storage outside web root with random content-addressed UUID storage keys.

---

## 3. Data Flow Workflows

### 1. Symmetric Link Upload Workflow
1. User selects a file in the browser.
2. Browser generates a random 256-bit AES key.
3. Browser creates an encrypted manifest (chunk 0) containing original filename, MIME type, and size.
4. Browser encrypts file chunks (4 MB each) with unique IVs and associated authenticated data (AAD).
5. Frontend calls `POST /api/v1/uploads` to initialize upload.
6. Frontend uploads ciphertext chunks via `PUT /api/v1/uploads/{id}/chunks/{index}`.
7. Frontend completes upload via `POST /api/v1/uploads/{id}/complete`.
8. User configures share parameters (expiry, max downloads) generating a share link:
   `https://secureshare.local/s/<SHARE_ID>#k=<BASE64_AES_KEY>`
   *(Note: The `#k=...` fragment is strictly browser-side and is never sent to the server in HTTP requests).*

### 2. Recipient Download Workflow
1. Recipient navigates to `https://secureshare.local/s/<SHARE_ID>#k=<BASE64_AES_KEY>`.
2. Frontend extracts key `k` from URL fragment and immediately invokes `history.replaceState` to scrub the key from the browser address bar.
3. Frontend initiates download session via `POST /api/v1/public/shares/{id}/download-sessions`.
4. Backend verifies share validity, expiration, and download limits, returning an authorized download token.
5. Frontend downloads ciphertext chunks, authenticates chunk tags via AES-256-GCM, and decrypts into a local Blob stream.
6. Decrypted original file is saved locally to the user's device.
