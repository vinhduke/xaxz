// test-api.js - Script để test các API endpoints
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:3001';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

console.log(`${colors.blue}🧪 Testing Keepa API Endpoints${colors.reset}\n`);

// Test 1: Health Check
async function testHealthCheck() {
  console.log(`${colors.yellow}Test 1: Health Check${colors.reset}`);
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log(`${colors.green}✅ Health check passed${colors.reset}`);
    console.log(`Status: ${response.data.status}`);
    console.log(`Features: ${response.data.features.join(', ')}\n`);
  } catch (error) {
    console.log(`${colors.red}❌ Health check failed: ${error.message}${colors.reset}\n`);
  }
}

// Test 2: Single ASIN Check
async function testSingleASIN() {
  console.log(`${colors.yellow}Test 2: Single ASIN Check${colors.reset}`);
  const testASIN = 'B08N5WRWNW'; // Echo Dot
  
  try {
    const response = await axios.get(`${API_BASE}/api/product/${testASIN}`);
    console.log(`${colors.green}✅ Single ASIN check passed${colors.reset}`);
    console.log(`ASIN: ${response.data.data.asin}`);
    console.log(`Title: ${response.data.data.title}`);
    console.log(`Rankings: ${response.data.data.rankings.length} categories`);
    console.log(`Tokens left: ${response.data.tokensLeft}\n`);
  } catch (error) {
    console.log(`${colors.red}❌ Single ASIN check failed: ${error.response?.data?.error || error.message}${colors.reset}\n`);
  }
}

// Test 3: Bulk ASINs Check
async function testBulkASINs() {
  console.log(`${colors.yellow}Test 3: Bulk ASINs Check${colors.reset}`);
  const testASINs = ['B08N5WRWNW', 'B0B1VQ1ZQY', 'B09B8V1LZ3'];
  
  try {
    const response = await axios.post(`${API_BASE}/api/products`, {
      asins: testASINs
    });
    console.log(`${colors.green}✅ Bulk ASINs check passed${colors.reset}`);
    console.log(`Checked ${response.data.data.length} products`);
    response.data.data.forEach(product => {
      console.log(`- ${product.asin}: ${product.title.substring(0, 50)}...`);
    });
    console.log(`Tokens left: ${response.data.tokensLeft}\n`);
  } catch (error) {
    console.log(`${colors.red}❌ Bulk ASINs check failed: ${error.response?.data?.error || error.message}${colors.reset}\n`);
  }
}

// Test 4: File Upload (if sample file exists)
async function testFileUpload() {
  console.log(`${colors.yellow}Test 4: File Upload${colors.reset}`);
  
  const sampleFile = 'sample-asins.csv';
  if (!fs.existsSync(sampleFile)) {
    console.log(`${colors.yellow}⚠️  Skipping file upload test (${sampleFile} not found)${colors.reset}\n`);
    return;
  }
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(sampleFile));
    
    const response = await axios.post(`${API_BASE}/api/upload`, form, {
      headers: form.getHeaders()
    });
    
    console.log(`${colors.green}✅ File upload passed${colors.reset}`);
    console.log(`Processed ${response.data.processedCount} products from file`);
    console.log(`Tokens left: ${response.data.tokensLeft}\n`);
  } catch (error) {
    console.log(`${colors.red}❌ File upload failed: ${error.response?.data?.error || error.message}${colors.reset}\n`);
  }
}

// Test 5: Invalid ASIN
async function testInvalidASIN() {
  console.log(`${colors.yellow}Test 5: Invalid ASIN (Error handling)${colors.reset}`);
  const invalidASIN = 'INVALID123';
  
  try {
    await axios.get(`${API_BASE}/api/product/${invalidASIN}`);
    console.log(`${colors.red}❌ Should have failed but didn't${colors.reset}\n`);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log(`${colors.green}✅ Error handling works correctly${colors.reset}`);
      console.log(`Error: ${error.response.data.error}\n`);
    } else {
      console.log(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}\n`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log(`Server: ${API_BASE}\n`);
  
  await testHealthCheck();
  await testSingleASIN();
  await testBulkASINs();
  await testFileUpload();
  await testInvalidASIN();
  
  console.log(`${colors.blue}🏁 Testing completed!${colors.reset}`);
  console.log(`\n${colors.yellow}Note: Make sure the server is running on port 3001${colors.reset}`);
}

// Check if server is running
axios.get(`${API_BASE}/health`)
  .then(() => {
    runAllTests();
  })
  .catch(() => {
    console.log(`${colors.red}❌ Cannot connect to server at ${API_BASE}${colors.reset}`);
    console.log(`${colors.yellow}Please start the server first: npm start${colors.reset}`);
  });