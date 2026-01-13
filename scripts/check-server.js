#!/usr/bin/env node

/**
 * Script สำหรับตรวจสอบว่า server รันอยู่หรือไม่
 */

const http = require('http');

const servers = [
  { name: 'Main Server', port: 3001, url: 'http://localhost:3001/api/health' },
  { name: 'Barcode Server', port: 3002, url: 'http://localhost:3002/api/health' }
];

async function checkServer(server) {
  return new Promise((resolve) => {
    const url = new URL(server.url);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ 
          running: true, 
          status: res.statusCode,
          data: data 
        });
      });
    });

    req.on('error', (err) => {
      resolve({ 
        running: false, 
        error: err.message 
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ 
        running: false, 
        error: 'Connection timeout' 
      });
    });

    req.end();
  });
}

async function main() {
  console.log('🔍 Checking server status...\n');

  for (const server of servers) {
    const result = await checkServer(server);
    
    if (result.running) {
      console.log(`✅ ${server.name} (Port ${server.port}): RUNNING`);
      try {
        const data = JSON.parse(result.data);
        console.log(`   Status: ${data.status || 'OK'}`);
      } catch (e) {
        // ignore
      }
    } else {
      console.log(`❌ ${server.name} (Port ${server.port}): NOT RUNNING`);
      console.log(`   Error: ${result.error || 'Cannot connect'}`);
      console.log(`   💡 Run: npm ${server.port === 3001 ? 'start' : 'run start:barcode'}`);
    }
    console.log('');
  }

  console.log('📋 To start servers:');
  console.log('   Main Server:    npm start');
  console.log('   Barcode Server: npm run start:barcode');
  console.log('   Both Servers:   npm run start:all');
}

main().catch(console.error);

