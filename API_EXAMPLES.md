# 📚 API Examples - Cách sử dụng Keepa API

## 🔍 Single ASIN Check

### cURL
```bash
curl http://localhost:3001/api/product/B08N5WRWNW
```

### JavaScript (Axios)
```javascript
const axios = require('axios');

async function checkSingleASIN(asin) {
  try {
    const response = await axios.get(`http://localhost:3001/api/product/${asin}`);
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
}

checkSingleASIN('B08N5WRWNW');
```

### JavaScript (Fetch)
```javascript
fetch('http://localhost:3001/api/product/B08N5WRWNW')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

## 📦 Bulk ASINs Check

### cURL
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{"asins": ["B08N5WRWNW", "B0B1VQ1ZQY", "B09B8V1LZ3"]}'
```

### JavaScript
```javascript
const asins = ['B08N5WRWNW', 'B0B1VQ1ZQY', 'B09B8V1LZ3'];

fetch('http://localhost:3001/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ asins })
})
.then(res => res.json())
.then(data => {
  console.log(`Checked ${data.data.length} products`);
  data.data.forEach(product => {
    console.log(`${product.asin}: ${product.title}`);
  });
});
```

## 📤 File Upload

### cURL
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@sample-asins.csv"
```

### JavaScript (Node.js)
```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('sample-asins.csv'));

fetch('http://localhost:3001/api/upload', {
  method: 'POST',
  body: form
})
.then(res => res.json())
.then(data => console.log(data));
```

### HTML Form
```html
<form action="http://localhost:3001/api/upload" method="POST" enctype="multipart/form-data">
  <input type="file" name="file" accept=".csv,.txt">
  <button type="submit">Upload</button>
</form>
```

## 🔄 Batch Processing với Delay

```javascript
async function checkManyASINs(asinList) {
  const batchSize = 20;
  const results = [];
  
  for (let i = 0; i < asinList.length; i += batchSize) {
    const batch = asinList.slice(i, i + batchSize);
    
    console.log(`Processing batch ${i/batchSize + 1}...`);
    
    const response = await fetch('http://localhost:3001/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asins: batch })
    });
    
    const data = await response.json();
    results.push(...data.data);
    
    // Wait 1 second between batches
    if (i + batchSize < asinList.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
```

## 📊 Parse và Export Results

```javascript
function exportToCSV(results) {
  const headers = ['ASIN', 'Title', 'BSR', 'Category', 'Price', 'Status'];
  const rows = results.map(item => {
    const mainRank = item.rankings?.[0];
    return [
      item.asin,
      item.title,
      mainRank?.rank || 'N/A',
      mainRank?.category || 'N/A',
      item.price ? `$${item.price}` : 'N/A',
      item.availability
    ];
  });
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
    
  // Save to file (Node.js)
  require('fs').writeFileSync('results.csv', csv);
  
  // Or download (Browser)
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'results.csv';
  a.click();
}
```

## 🛡️ Error Handling

```javascript
async function safeAPICall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }
    
    return data;
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      console.error('Server is not running');
    } else if (error.message.includes('rate limit')) {
      console.error('Rate limit exceeded, wait before retry');
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

// Usage
const result = await safeAPICall('http://localhost:3001/api/product/B08N5WRWNW');
if (result && result.success) {
  console.log(result.data);
}
```

## 🔑 Environment Variables

```javascript
// Use in production
const API_BASE = process.env.KEEPA_API_URL || 'http://localhost:3001';
const API_KEY = process.env.KEEPA_API_KEY; // Store securely
```

## 📈 Monitor Token Usage

```javascript
let tokenUsage = {
  remaining: 60,
  refillIn: 0
};

async function checkWithTokenMonitor(asin) {
  if (tokenUsage.remaining <= 0) {
    console.log(`Waiting ${tokenUsage.refillIn}s for token refill...`);
    await new Promise(resolve => setTimeout(resolve, tokenUsage.refillIn * 1000));
  }
  
  const result = await fetch(`http://localhost:3001/api/product/${asin}`)
    .then(res => res.json());
  
  if (result.success) {
    tokenUsage.remaining = result.tokensLeft;
    tokenUsage.refillIn = result.refillIn;
    console.log(`Tokens remaining: ${tokenUsage.remaining}`);
  }
  
  return result;
}
```

---

Happy coding! 🚀