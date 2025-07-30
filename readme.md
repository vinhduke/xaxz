# Amazon BSR Checker with Keepa API

Ứng dụng kiểm tra Best Seller Rank (BSR) của sản phẩm Amazon sử dụng Keepa API, hỗ trợ kiểm tra đơn lẻ và bulk check từ file CSV/TXT.

## 🚀 Tính năng

- ✅ **Single Check**: Kiểm tra BSR cho một ASIN
- ✅ **Bulk Check**: Upload file CSV/TXT để kiểm tra nhiều ASIN cùng lúc
- ✅ **Export kết quả**: Xuất kết quả bulk check ra file CSV
- ✅ **Rate limiting**: Bảo vệ API khỏi spam
- ✅ **CORS configuration**: Bảo mật cross-origin requests
- ✅ **Environment variables**: Quản lý cấu hình dễ dàng

## 📋 Yêu cầu

- Node.js >= 14.0.0
- NPM hoặc Yarn
- Keepa API key (đã có sẵn trong .env)

## 🛠️ Cài đặt

### 1. Clone hoặc tải code

Tạo folder mới và copy tất cả các file:
- `server.js`
- `package.json`
- `.env`
- `.gitignore`
- `README.md`

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Chạy server

**Development mode (với auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3001`

## 📁 Cấu trúc file

```
keepa-backend/
├── server.js          # Main server file
├── package.json       # Dependencies
├── .env              # Environment variables (API key)
├── .gitignore        # Git ignore rules
├── README.md         # Documentation
└── uploads/          # Temporary upload folder (auto-created)
```

## 🔧 API Endpoints

### Health Check
```
GET /health
```

### Single ASIN Check
```
GET /api/product/:asin
```

### Bulk ASINs Check
```
POST /api/products
Body: { "asins": ["ASIN1", "ASIN2", ...] }
```

### File Upload & Process
```
POST /api/upload
Form-data: file (CSV or TXT)
```

## 📝 Format file upload

### File CSV
```csv
ASIN,Product Name
B08N5WRWNW,Product 1
B0BFKNR56Q,Product 2
```
Hoặc chỉ cần cột ASIN:
```csv
ASIN
B08N5WRWNW
B0BFKNR56Q
```

### File TXT
```txt
B08N5WRWNW
B0BFKNR56Q
B09ABC1234
```
Hoặc cách nhau bởi dấu phẩy:
```txt
B08N5WRWNW, B0BFKNR56Q, B09ABC1234
```

## ⚙️ Configuration

File `.env` chứa các cấu hình:

```env
# Server port
PORT=3001

# Keepa API
KEEPA_API_KEY=your_api_key_here

# CORS (phân cách bởi dấu phẩy)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate limiting
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
```

## 🚨 Lưu ý quan trọng

1. **API Key Security**: 
   - Không commit file `.env` lên Git
   - Sử dụng environment variables cho production

2. **Rate Limiting**:
   - Mỗi IP được giới hạn 60 requests/phút
   - Keepa API có token limit riêng

3. **File Upload**:
   - Giới hạn 5MB mỗi file
   - Tối đa 100 ASINs mỗi lần check

4. **CORS**:
   - Chỉ cho phép origins được config trong `.env`
   - Update `ALLOWED_ORIGINS` cho production

## 🚀 Deploy Production

### Heroku
```bash
heroku create your-app-name
heroku config:set KEEPA_API_KEY=your_api_key
git push heroku main
```

### PM2
```bash
npm install -g pm2
pm2 start server.js --name keepa-api
pm2 save
pm2 startup
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "asin": "B08N5WRWNW",
    "title": "Product Title",
    "rankings": [
      {
        "rank": "1,234",
        "category": "Electronics",
        "isMain": true
      }
    ],
    "price": "29.99",
    "availability": "In Stock"
  },
  "tokensLeft": 59,
  "refillIn": 60
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## 🐛 Troubleshooting

### CORS Error
- Kiểm tra `ALLOWED_ORIGINS` trong `.env`
- Đảm bảo frontend URL được thêm vào danh sách

### Rate Limit Error
- Giảm số lượng request
- Tăng `RATE_LIMIT_MAX` trong `.env`

### File Upload Error
- Kiểm tra format file (CSV/TXT)
- Đảm bảo ASIN có đúng 10 ký tự
- File size < 5MB

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra console log của server
2. Verify API key còn hoạt động
3. Kiểm tra format ASIN
4. Đảm bảo có kết nối internet

---

**Version**: 2.0.0  
**Last Updated**: 2024