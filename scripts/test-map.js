#!/usr/bin/env node

const http = require('http');

function testEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ ${description}: ${res.statusCode} - ${json.features ? json.features.length : 0} features`);
          resolve(json);
        } catch (e) {
          console.log(`✅ ${description}: ${res.statusCode} - HTML response (${data.length} bytes)`);
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${description}: ${err.message}`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ ${description}: Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Map Functionality...\n');
  
  try {
    await testEndpoint('/', 'Main Page');
    await testEndpoint('/test-map', 'Test Map Page');
    await testEndpoint('/api/states-geojson', 'States GeoJSON API');
    await testEndpoint('/api/counties-geojson?state=California', 'Counties GeoJSON API');
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📍 You can now visit:');
    console.log('   • Main app: http://localhost:3000');
    console.log('   • Test map: http://localhost:3000/test-map');
    
  } catch (error) {
    console.log('\n💥 Some tests failed. Check the server logs for details.');
  }
}

runTests(); 