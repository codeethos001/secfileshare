# SecureShare REST API Documentation

All API endpoints are prefixed with `/api/v1`.

---

## 1. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Creates a new user account.
- **Request Body**:
  ```json
  {
    "name": "Alice Smith",
    "email": "alice@example.com",
    "password": "CorrectHorseBatteryStaple123!"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "id": "c1f7a0b5-7bc0-4e3a-969c-2ecbfd135b0d",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "created_at": "2026-11-17T11:00:00Z"
  }
  ```

### `POST /api/v1/auth/login`
Authenticates user credentials and issues a secure bearer session token.
- **Request Body**:
  ```json
  {
    "email": "alice@example.com",
    "password": "CorrectHorseBatteryStaple123!"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "token": "ss_sess_498f82cb34a98401...",
    "expires_at": "2026-11-18T11:00:00Z",
    "user": {
      "id": "c1f7a0b5-7bc0-4e3a-969c-2ecbfd135b0d",
      "name": "Alice Smith",
      "email": "alice@example.com"
    }
  }
  ```

### `POST /api/v1/auth/logout`
Revokes the current session token.
- **Headers**: `Authorization: Bearer <token>`
- **Response** `200 OK`

### `GET /api/v1/auth/me`
Retrieves the profile of the currently authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Response** `200 OK`

---

## 2. Encrypted Uploads (`/api/v1/uploads`)

### `POST /api/v1/uploads`
Initializes an encrypted file upload session.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "chunk_count": 5,
    "iv_prefix": "a1b2c3d4e5f67890",
    "crypto_version": "v1.0-aes256gcm",
    "total_ciphertext_size": 20971520
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "file_id": "8bca7369-0268-466d-a16f-981bc92eec30",
    "chunk_count": 5,
    "status": "UPLOADING"
  }
  ```

### `PUT /api/v1/uploads/{id}/chunks/{index}`
Uploads an encrypted chunk (binary octet-stream).
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/octet-stream`
- **Path Parameters**: `id` (File UUID), `index` (0 for manifest, 1..N for file chunks)
- **Response** `200 OK`:
  ```json
  {
    "chunk_index": 0,
    "ciphertext_size": 4096,
    "status": "STORED"
  }
  ```

### `POST /api/v1/uploads/{id}/complete`
Validates that all expected chunks have arrived and finalizes the file status to `COMPLETED`.
- **Headers**: `Authorization: Bearer <token>`
- **Response** `200 OK`:
  ```json
  {
    "file_id": "8bca7369-0268-466d-a16f-981bc92eec30",
    "status": "COMPLETED",
    "chunk_count": 5,
    "total_size": 20971520
  }
  ```

---

## 3. Files & Management (`/api/v1/files`)

### `GET /api/v1/files`
List user's uploaded files.
- **Headers**: `Authorization: Bearer <token>`

### `GET /api/v1/files/{id}`
Retrieve file metadata (chunk count, iv prefix, status).

### `DELETE /api/v1/files/{id}`
Deletes file records and stored ciphertext chunks.

---

## 4. Sharing & Public Access (`/api/v1/shares`, `/api/v1/public`)

### `POST /api/v1/files/{id}/share`
Generates a sharing link or registers a recipient envelope.
- **Request Body**:
  ```json
  {
    "expiry_hours": 24,
    "max_downloads": 5,
    "share_type": "LINK"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "share_id": "sh_92f98e7a09c24b...",
    "expiry": "2026-11-18T12:00:00Z",
    "max_downloads": 5,
    "status": "ACTIVE"
  }
  ```

### `GET /api/v1/shares`
List current user's active and expired shares.

### `DELETE /api/v1/shares/{id}`
Revokes access to a share link immediately.

### `GET /api/v1/public/shares/{id}`
Returns public metadata required by recipient frontend (chunk count, iv prefix, crypto version). No keys.

### `POST /api/v1/public/shares/{id}/download-sessions`
Initiates an authorized download session. Checks expiry and increments download count.
- **Response** `200 OK`:
  ```json
  {
    "download_session_token": "ds_token_1a2b3c...",
    "chunk_count": 5,
    "iv_prefix": "a1b2c3d4e5f67890"
  }
  ```

### `GET /api/v1/public/download-sessions/{token}/chunks/{index}`
Fetches raw ciphertext chunk for local decryption in recipient browser.
