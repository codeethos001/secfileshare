# SecureShare Threat Model

This document outlines the threat modeling, trust assumptions, security boundaries, and limitations of the SecureShare platform based on STRIDE and OWASP guidelines.

---

## 1. System Assets & Security Objectives

| Asset | Primary Objective | Mechanism |
|---|---|---|
| File Contents | Confidentiality & Integrity | Client-side AES-256-GCM (Zero-knowledge backend) |
| File Metadata (Filename, MIME, Size) | Confidentiality | Encrypted chunk-0 metadata manifest |
| Encryption Keys | Confidentiality | Never transmitted in plaintext; HPKE or secret URL fragments |
| User Credentials | Confidentiality & Integrity | Argon2id password hashing, secure session tokens |
| Storage & Audit Logs | Tamper-resistance | Hash-linked audit events, strict access controls |

---

## 2. Threat Analysis & Mitigations

| Threat | Threat Agent | Mitigation in SecureShare |
|---|---|---|
| **Database Compromise** | Malicious DB admin or SQLi attacker | DB contains only hashes, encrypted keys (HPKE envelopes), and ciphertext references. No plaintext files or keys exist. |
| **Storage Compromise** | Attacker gaining access to `/storage` | Storage directory contains only raw AES-256-GCM ciphertext chunks indexed by random UUIDs. Unreadable without keys. |
| **Ciphertext Tampering** | Malicious actor altering bits in storage or transit | AES-256-GCM provides authenticated encryption with 128-bit authentication tag. Client decryption throws verification error if 1 bit changes. |
| **Chunk Reordering / Truncation** | Network attacker rearranging chunk sequence | Associated Authenticated Data (AAD) binds Protocol Version, File ID, Chunk Index, and Total Chunk Count to every chunk's AEAD tag. |
| **Unauthorized File Download** | Unauthenticated or malicious user | One-time / rate-limited download sessions, expiration checks, maximum download caps, and access token validation. |
| **Brute-Force Login** | Botnet or unauthorized actor | Argon2id parameter tuning, progressive rate limiting, and session lockout. |
| **Session Hijacking / Theft** | Network eavesdropper or XSS | Secure, HttpOnly, SameSite cookies or cryptographically random tokens stored in secure storage. |
| **Path Traversal / Filename Injection** | Malicious file uploader | Server assigns UUID storage keys; actual filenames are stored exclusively inside the client-encrypted manifest chunk. |
| **Key Leakage via URL Fragment** | Browser history or referrer leak | Javascript extracts `#k=...` and immediately strips it with `window.history.replaceState`. |

---

## 3. Explicit Limitations & Non-Goals

1. **Malware & Antivirus Scanning**: Because the server cannot decrypt file contents, it cannot scan files for viruses or malicious payloads. This is a fundamental trade-off of zero-knowledge architectures.
2. **Post-Download Revocation**: Revoking a share link prevents future download sessions from starting; it cannot retract files already downloaded to a recipient's local disk.
3. **Compromised Endpoints**: If either the sender's or recipient's operating system has malware, keyloggers, or memory scrapers, cryptographic keys or decrypted buffers may be captured.
4. **Malicious Web Host (Frontend Tampering)**: An attacker who fully compromises the web server serving the frontend JavaScript bundle could theoretically inject malicious JavaScript to exfiltrate keys. Mitigations include strict Content Security Policy (CSP), Subresource Integrity (SRI), and binary signing.
5. **Metadata Leakage**: The backend can observe upload timestamps, transfer volume, IP addresses, and user account IDs.
