import httpx


class TestSystem:
    def test_system(self):
        response = httpx.get("http://127.0.0.1:13710/api/v1/system/version")
        assert response.status_code == 200
        assert response.json() == {"version": "0.0.1"}
