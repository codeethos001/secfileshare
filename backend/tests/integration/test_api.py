def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["zero_knowledge"] is True


def test_user_registration_and_login(client):
    reg_payload = {
        "name": "Alice Tester",
        "email": "alice@test.secureshare",
        "password": "CorrectPassword123!"
    }
    # Register
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    user_data = res.json()
    assert user_data["email"] == "alice@test.secureshare"

    # Login
    login_payload = {
        "email": "alice@test.secureshare",
        "password": "CorrectPassword123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    token_data = res_login.json()
    assert "token" in token_data
    token = token_data["token"]

    # Access /auth/me
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "alice@test.secureshare"
