# SecureShare — Zero-Knowledge End-to-End Encrypted File Sharing

SecureShare is a production-grade, zero-knowledge, end-to-end encrypted (E2EE) file sharing platform.

## Key Principles

- **Zero-Knowledge Architecture**: The server receives, stores, and serves **only** ciphertext chunks.
- **Client-Side Encryption**: AES-256-GCM chunked encryption occurs entirely inside the sender's browser using native Web Crypto API.
- **Client-Side Decryption**: File decryption occurs inside the recipient's browser.
- **Tamper-Evident Integrity**: Every chunk has a 128-bit authentication tag and is cryptographically bound to its index and file ID using Associated Authenticated Data (AAD).
- **Hybrid Cryptography**: Supports secret link sharing with URL fragments (`#k=...`) that are never transmitted over HTTP, as well as HPKE (RFC 9180) asymmetric key distribution for registered recipients.
- **Fine-Grained Controls**: Link expiry, download counts, and instant access revocation.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Web Crypto API.
- **Backend**: FastAPI (Python 3.10+), SQLAlchemy 2.0, Pydantic v2, Argon2id.
- **Database**: MariaDB (production) / SQLite (development).
- **Deployment**: Docker, Docker Compose, Nginx.

---

## Quick Start (Development)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running with Docker Compose

```bash
docker compose up -d --build
```

Access the frontend via [http://localhost:8080](http://localhost:8080) and API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).
