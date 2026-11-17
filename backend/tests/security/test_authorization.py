def test_unauthenticated_file_access(client):
    res = client.get("/api/v1/files")
    assert res.status_code == 401


def test_cross_user_isolation(client):
    # Register Alice
    client.post("/api/v1/auth/register", json={
        "name": "Alice", "email": "alice@iso.com", "password": "Password123!"
    })
    alice_login = client.post("/api/v1/auth/login", json={
        "email": "alice@iso.com", "password": "Password123!"
    }).json()
    alice_token = alice_login["token"]

    # Register Bob
    client.post("/api/v1/auth/register", json={
        "name": "Bob", "email": "bob@iso.com", "password": "Password123!"
    })
    bob_login = client.post("/api/v1/auth/login", json={
        "email": "bob@iso.com", "password": "Password123!"
    }).json()
    bob_token = bob_login["token"]

    # Alice initializes an upload
    init_res = client.post(
        "/api/v1/uploads",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={
            "chunk_count": 2,
            "iv_prefix": "0102030405060708",
            "crypto_version": "v1.0-aes256gcm",
            "total_ciphertext_size": 1024
        }
    )
    assert init_res.status_code == 201
    file_id = init_res.json()["file_id"]

    # Bob attempts to access Alice's file
    bob_access = client.get(
        f"/api/v1/files/{file_id}",
        headers={"Authorization": f"Bearer {bob_token}"}
    )
    assert bob_access.status_code == 404  # Unauthorized/isolated

    # Bob attempts to delete Alice's file
    bob_delete = client.delete(
        f"/api/v1/files/{file_id}",
        headers={"Authorization": f"Bearer {bob_token}"}
    )
    assert bob_delete.status_code == 404
