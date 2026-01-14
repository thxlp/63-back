import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 10 },
    { duration: '25s', target: 10 },
  ],
  
  thresholds: {
    'http_req_duration': ['p(95)<500'], //  500ms
    'http_req_failed': ['rate<0.01'],   //  1%
  },
};

export default function () {
  const BASE_URL = 'https://heath-check-436133641220.asia-southeast1.run.app';
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/2': (r) => r.proto === 'HTTP/2.0',
  });

  sleep(1);
}