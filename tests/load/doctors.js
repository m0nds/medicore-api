import http from "k6/http"
import { check, sleep } from "k6"

export const options = {
  vus: 100,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  }
}

const BASE_URL = "http://localhost:8080"

export function setup() {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: "elegbede.raymond+2@gmail.com",
    password: "P@$$w0rd"
  }), { headers: { "Content-Type": "application/json" } })

  return { token: res.json("data.accessToken") }
}

export default function(data) {
  const headers = {
    "Authorization": `Bearer ${data.token}`,
    "Content-Type": "application/json"
  }

  const res = http.get(`${BASE_URL}/api/doctors`, { headers })

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
    "has data": (r) => r.json("data") !== null
  })

  sleep(0.1)
}
