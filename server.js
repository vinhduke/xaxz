// server.js - Complete Backend Server for Keepa API with Bulk Check
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const csv = require('csv-parse');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX) || 60, // limit each IP to 60 requests per minute
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/', limiter);

// Keepa API configuration
const KEEPA_API_KEY = process.env.KEEPA_API_KEY || '9j4bnejfqn3tvh1dqfo3igfauckho4nqohamf8ts8dd9p4mb0qsmd6ukm0jk2kg4';
const KEEPA_API_BASE_URL = process.env.KEEPA_API_BASE_URL || 'https://api.keepa.com';

// Check if API key is configured
if (!KEEPA_API_KEY) {
  console.error('ERROR: KEEPA_API_KEY is not set');
  process.exit(1);
}

// Category mapping
const categoryMap = {
  1: 'Books',
  2: 'Movies & TV',
  3: 'Music',
  4: 'Video Games',
  5: 'Electronics',
  6: 'Camera & Photo',
  7: 'Computers',
  8: 'Home & Garden',
  9: 'Toys & Games',
  10: 'Sports & Outdoors',
  11: 'Tools & Home Improvement',
  12: 'Beauty',
  13: 'Health & Personal Care',
  14: 'Office Products',
  15: 'Pet Supplies',
  16: 'Automotive',
  17: 'Industrial & Scientific',
  18: 'Jewelry',
  19: 'Baby',
  20: 'Clothing',
  21: 'Shoes',
  22: 'Luggage',
  23: 'Software',
  24: 'Cell Phones & Accessories',
  25: 'Musical Instruments',
  26: 'Grocery',
  27: 'Watches',
  28: 'Patio, Lawn & Garden',
  29: 'Kindle Store',
  30: 'Apps & Games'
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Keepa API Server is running',
    environment: process.env.NODE_ENV || 'development',
    features: ['single-check', 'bulk-check', 'file-upload']
  });
});

// Validate ASIN format
function isValidASIN(asin) {
  return /^[A-Z0-9]{10}$/.test(asin);
}

// Parse ASINs from uploaded file
async function parseASINsFromFile(filePath, mimeType) {
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const asins = new Set();

  if (mimeType === 'text/csv' || filePath.endsWith('.csv')) {
    // Parse CSV
    return new Promise((resolve, reject) => {
      csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) {
          reject(err);
          return;
        }

        records.forEach(record => {
          // Try to find ASIN in various column names
          const asinValue = record.ASIN || record.asin || record.Asin || Object.values(record)[0];
          if (asinValue && isValidASIN(asinValue.trim().toUpperCase())) {
            asins.add(asinValue.trim().toUpperCase());
          }
        });

        resolve(Array.from(asins));
      });
    });
  } else {
    // Parse TXT file
    const lines = fileContent.split(/[\n,\s]+/);
    lines.forEach(line => {
      const asin = line.trim().toUpperCase();
      if (isValidASIN(asin)) {
        asins.add(asin);
      }
    });
    return Array.from(asins);
  }
}

// Process batch of ASINs
async function processBatchASINs(asins) {
  try {
    const response = await axios.get(`${KEEPA_API_BASE_URL}/product`, {
      params: {
        key: KEEPA_API_KEY,
        domain: 1, // Amazon.com
        asin: asins.join(','),
        stats: 1,
        history: 0,
        rating: 1
      },
      timeout: 30000 // 30 second timeout
    });

    const products = response.data.products || [];
    
    return {
      results: products.map(product => {
        const rankings = [];
        
        // Main category rank
        if (product.stats?.current?.[3] > 0) {
          rankings.push({
            rank: product.stats.current[3].toLocaleString(),
            category: product.categoryTree ? 
              categoryMap[product.categoryTree[0]] || `Category ${product.categoryTree[0]}` : 
              'Main Category',
            isMain: true
          });
        }
        
        // Sub-category ranks
        if (product.salesRanks) {
          Object.entries(product.salesRanks).forEach(([catId, rankData]) => {
            if (Array.isArray(rankData) && rankData.length > 0) {
              const latestRank = rankData[rankData.length - 1];
              rankings.push({
                rank: latestRank.toLocaleString(),
                category: categoryMap[parseInt(catId)] || `Category ${catId}`,
                isMain: false
              });
            }
          });
        }

        return {
          asin: product.asin,
          title: product.title || 'No title available',
          brand: product.brand || 'Unknown',
          model: product.model || 'Unknown',
          rankings: rankings,
          price: product.stats?.current?.[0] ? 
            (product.stats.current[0] / 100).toFixed(2) : null,
          rating: product.stats?.avg?.[16] ? 
            (product.stats.avg[16] / 10).toFixed(1) : null,
          reviewCount: product.stats?.current?.[17] || 0,
          availability: product.availabilityAmazon === 0 ? 'In Stock' : 'Out of Stock',
          lastUpdate: product.lastUpdate ? 
            new Date(product.lastUpdate * 60000).toISOString() : null
        };
      }),
      tokensLeft: response.data.tokensLeft || 0,
      refillIn: response.data.refillIn || 0
    };
  } catch (error) {
    console.error('Keepa API Error:', error.message);
    throw error;
  }
}

// Get single product BSR endpoint
app.get('/api/product/:asin', async (req, res) => {
  try {
    const { asin } = req.params;
    
    // Validate ASIN
    if (!asin || !isValidASIN(asin)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ASIN format. ASIN must be 10 alphanumeric characters.'
      });
    }

    console.log(`Fetching data for ASIN: ${asin}`);

    // Call Keepa API
    const response = await axios.get(`${KEEPA_API_BASE_URL}/product`, {
      params: {
        key: KEEPA_API_KEY,
        domain: 1, // Amazon.com
        asin: asin,
        stats: 1,
        history: 0,
        rating: 1,
        offers: 20
      },
      timeout: 10000 // 10 second timeout
    });

    const data = response.data;

    // Check if product exists
    if (!data.products || data.products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const product = data.products[0];
    
    // Extract rankings
    const rankings = [];
    
    // Main category rank
    if (product.stats?.current?.[3] > 0) {
      rankings.push({
        rank: product.stats.current[3].toLocaleString(),
        category: product.categoryTree ? 
          categoryMap[product.categoryTree[0]] || `Category ${product.categoryTree[0]}` : 
          'Main Category',
        isMain: true
      });
    }
    
    // Sub-category ranks
    if (product.salesRanks) {
      Object.entries(product.salesRanks).forEach(([catId, rankData]) => {
        if (Array.isArray(rankData) && rankData.length > 0) {
          const latestRank = rankData[rankData.length - 1];
          rankings.push({
            rank: latestRank.toLocaleString(),
            category: categoryMap[parseInt(catId)] || `Category ${catId}`,
            isMain: false
          });
        }
      });
    }

    // Prepare response
    const result = {
      success: true,
      data: {
        asin: product.asin,
        title: product.title || 'No title available',
        brand: product.brand || 'Unknown',
        model: product.model || 'Unknown',
        rankings: rankings,
        price: product.stats?.current?.[0] ? 
          (product.stats.current[0] / 100).toFixed(2) : null,
        rating: product.stats?.avg?.[16] ? 
          (product.stats.avg[16] / 10).toFixed(1) : null,
        reviewCount: product.stats?.current?.[17] || 0,
        imageUrl: product.imagesCSV ? 
          `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}` : null,
        availability: product.availabilityAmazon === 0 ? 'In Stock' : 'Out of Stock',
        lastUpdate: product.lastUpdate ? 
          new Date(product.lastUpdate * 60000).toISOString() : null
      },
      tokensLeft: data.tokensLeft || 0,
      refillIn: data.refillIn || 0
    };

    res.json(result);

  } catch (error) {
    console.error('Keepa API Error:', error.message);
    
    // Handle different error types
    if (error.response?.status === 400) {
      res.status(400).json({
        success: false,
        error: 'Bad request. Please check the ASIN.'
      });
    } else if (error.response?.status === 429) {
      res.status(429).json({
        success: false,
        error: 'Keepa API rate limit exceeded. Please try again later.',
        tokensLeft: error.response.data?.tokensLeft || 0,
        refillIn: error.response.data?.refillIn || 0
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        success: false,
        error: 'Request timeout. Please try again.'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

// Get multiple products endpoint
app.post('/api/products', async (req, res) => {
  try {
    const { asins } = req.body;
    
    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of ASINs'
      });
    }

    // Validate all ASINs
    const invalidASINs = asins.filter(asin => !isValidASIN(asin));
    if (invalidASINs.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ASIN format',
        invalidASINs: invalidASINs
      });
    }

    // Limit to 100 ASINs per request (Keepa limit)
    if (asins.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 ASINs per request'
      });
    }

    console.log(`Fetching data for ${asins.length} ASINs`);

    const batchResult = await processBatchASINs(asins);

    res.json({
      success: true,
      data: batchResult.results,
      tokensLeft: batchResult.tokensLeft,
      refillIn: batchResult.refillIn
    });

  } catch (error) {
    console.error('Keepa API Error:', error.message);
    
    if (error.response?.status === 429) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        tokensLeft: error.response.data?.tokensLeft || 0,
        refillIn: error.response.data?.refillIn || 0
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products'
      });
    }
  }
});

// Upload and process file endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`Processing uploaded file: ${req.file.originalname}`);

    // Parse ASINs from file
    const asins = await parseASINsFromFile(req.file.path, req.file.mimetype);
    
    // Clean up uploaded file
    await fs.unlink(req.file.path);

    if (asins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid ASINs found in the file'
      });
    }

    if (asins.length > 100) {
      return res.status(400).json({
        success: false,
        error: `Found ${asins.length} ASINs. Maximum 100 ASINs allowed per request.`,
        foundCount: asins.length
      });
    }

    console.log(`Found ${asins.length} valid ASINs`);

    // Process ASINs in batches
    const batchSize = 20;
    const results = [];
    let tokensLeft = 0;
    let refillIn = 0;

    for (let i = 0; i < asins.length; i += batchSize) {
      const batch = asins.slice(i, i + batchSize);
      const batchResult = await processBatchASINs(batch);
      results.push(...batchResult.results);
      tokensLeft = batchResult.tokensLeft;
      refillIn = batchResult.refillIn;
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < asins.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({
      success: true,
      data: results,
      processedCount: results.length,
      tokensLeft: tokensLeft,
      refillIn: refillIn
    });

  } catch (error) {
    console.error('File processing error:', error.message);
    
    // Clean up file if it exists
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process file'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Create uploads directory if it doesn't exist
const createUploadsDir = async () => {
  try {
    await fs.mkdir('uploads', { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
};

// Start server
app.listen(PORT, async () => {
  await createUploadsDir();
  console.log(`\n🚀 Keepa API server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 API Key: ${KEEPA_API_KEY.substring(0, 10)}...`);
  console.log(`\n✅ Server is ready to accept requests`);
  console.log(`📁 Features: Single check, Bulk check, File upload\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});

// Export for testing
module.exports = app;