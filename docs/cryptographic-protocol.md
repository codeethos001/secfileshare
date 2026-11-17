# SecureShare Cryptographic Protocol Specification

## 1. Cryptographic Primitives

- **Symmetric Cipher**: AES-256-GCM (Authenticated Encryption with Associated Data).
- **Key Derivation (Passphrase Vault)**: Argon2id (RFC 9106) with minimum 64 MB memory, 3 iterations, 4 parallelism.
- **Asymmetric Key Exchange**: HPKE (Hybrid Public Key Encryption, RFC 9180):
  - KEM: DHKEM(X25519, HKDF-SHA256)
  - KDF: HKDF-SHA256
  - AEAD: AES-128-GCM or AES-256-GCM
- **Random Number Generation**: Web Crypto API `crypto.getRandomValues()` for CSPRNG guarantees.

---

## 2. Symmetric Chunk Encryption

### Parameters:
- **Chunk Size**: 4,194,304 bytes (4 MB)
- **Key**: 256-bit AES key generated freshly per file (`crypto.subtle.generateKey`)
- **IV Size**: 96 bits (12 bytes) constructed as:
  - 8 bytes: cryptographically random IV prefix generated per file/upload session
  - 4 bytes: 32-bit big-endian chunk index (`0x00000000`, `0x00000001`, ...)
- **Authentication Tag**: 128 bits (16 bytes) appended to ciphertext output
- **Associated Authenticated Data (AAD)**:
  ```json
  {
    "v": 1,
    "file_id": "<UUID>",
    "chunk_index": 0,
    "total_chunks": 5
  }
  ```
  Serialized as canonical UTF-8 JSON bytes or deterministic binary structure.

### Manifest Chunk (Chunk 0):
To conceal the filename, original MIME type, and exact file size from the server:
- Chunk 0 is an encrypted metadata manifest containing:
  ```json
  {
    "filename": "quarterly_financials.pdf",
    "mime_type": "application/pdf",
    "file_size": 18452104,
    "chunk_size": 4194304,
    "total_data_chunks": 5,
    "crypto_version": "v1.0"
  }
  ```
- Subsequent chunks (`chunk 1` to `chunk N`) contain the file's raw encrypted slices.

---

## 3. Public-Key Envelopes (RFC 9180 HPKE)

For registered users:
1. Each user generates an X25519 encryption keypair upon account setup.
2. The user's public key is published to `PUT /api/v1/keys/me`.
3. The user's private key is encrypted in the browser using an Argon2id key derived from a separate user recovery passphrase and uploaded as an encrypted vault.
4. When Alice shares a file with Bob:
   - Alice fetches Bob's public key from `GET /api/v1/users/{bob_id}/public-key`.
   - Alice runs HPKE SetupBaseSender to encapsulate the 256-bit AES file key.
   - The resulting `{ encapsulated_key, ciphertext_envelope }` is posted to `key_envelopes`.
5. Bob retrieves his envelope, decrypts it using his private key, and recovers the symmetric AES file key.
