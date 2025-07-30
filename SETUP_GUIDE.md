# 🚀 Hướng dẫn Setup Amazon BSR Checker

## 📁 Bước 1: Tạo cấu trúc thư mục

Tạo thư mục mới `keepa-backend` và tạo các file sau:

```
keepa-backend/
├── server.js              # Backend server chính
├── package.json           # Dependencies
├── .env                   # API key và config
├── .gitignore            # Git ignore rules
├── README.md             # Documentation
├── test-api.js           # Script test API
├── sample-asins.csv      # File CSV mẫu
├── sample-asins.txt      # File TXT mẫu
├── setup.sh              # Setup script cho Mac/Linux
├── setup.bat             # Setup script cho Windows
└── SETUP_GUIDE.md        # File này
```

## 💻 Bước 2: Copy code từ artifacts

Copy nội dung từ các artifact đã tạo vào từng file tương ứng:

1. **server.js** - Backend server code
2. **package.json** - Dependencies list
3. **.env** - Environment variables (đã có API key)
4. **.gitignore** - Git ignore rules
5. **README.md** - Documentation
6. **test-api.js** - Test script
7. **sample-asins.csv** - Sample CSV file
8. **sample-asins.txt** - Sample TXT file
9. **setup.sh** - Setup script for Mac/Linux
10. **setup.bat** - Setup script for Windows

## 🔧 Bước 3: Cài đặt và chạy

### Option 1: Dùng setup script

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

### Option 2: Manual setup

```bash
# Install dependencies
npm install

# Run server
npm start
```

## 🧪 Bước 4: Test API

```bash
# Chạy test script
npm test
```

## 🌐 Bước 5: Mở Frontend

1. Mở React app (artifact "Amazon BSR Checker - Frontend với Bulk Check")
2. Đảm bảo backend đang chạy ở port 3001
3. Test các tính năng:
   - Single ASIN check
   - Bulk check với file upload
   - Export kết quả

## ✅ Checklist

- [ ] Tạo folder `keepa-backend`
- [ ] Copy tất cả files từ artifacts
- [ ] Chạy `npm install`
- [ ] Start server với `npm start`
- [ ] Test API với `npm test`
- [ ] Mở frontend và test

## 🆘 Troubleshooting

### Port 3001 đã được sử dụng
```bash
# Đổi port trong .env
PORT=3002
```

### CORS error
- Kiểm tra `ALLOWED_ORIGINS` trong .env
- Thêm URL frontend vào danh sách

### API key error
- Kiểm tra API key trong .env
- Verify token còn lại

## 📝 Commands cheat sheet

```bash
npm start        # Run production server
npm run dev      # Run dev server (auto-reload)
npm test         # Run API tests
node server.js   # Direct run
```

---

Happy coding! 🎉