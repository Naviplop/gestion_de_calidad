import http from 'http';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

function checkEndpoint(path: string, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    http.get(`${BACKEND_URL}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[OK] ${label}: ${data}`);
          resolve();
        } else {
          reject(new Error(`${label} failed with status ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`${label} failed: ${err.message}`));
    });
  });
}

async function runSmokeTests() {
  console.log('Starting smoke tests...\n');

  try {
    await checkEndpoint('/health', 'Health check');
    await checkEndpoint('/liveness', 'Liveness check');
    await checkEndpoint('/readiness', 'Readiness check');
    console.log('\nAll smoke tests passed.');
    process.exit(0);
  } catch (err) {
    console.error('\nSmoke test failed:', err.message);
    process.exit(1);
  }
}

runSmokeTests();
