#!/bin/bash

echo "🚀 Amazon BSR Checker - Keepa API Setup"
echo "======================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa được cài đặt!"
    echo "Vui lòng cài đặt Node.js từ: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📦 Đang cài đặt dependencies..."
npm install

echo ""
echo "✅ Cài đặt hoàn tất!"
echo ""
echo "📝 Hướng dẫn sử dụng:"
echo "1. Chạy backend server: npm start"
echo "2. Mở frontend React trong browser"
echo "3. Server chạy tại: http://localhost:3001"
echo ""
echo "🔧 Commands hữu ích:"
echo "- npm start     : Chạy server production"
echo "- npm run dev   : Chạy server development (auto-reload)"
echo ""
echo "📁 File mẫu để test:"
echo "- sample-asins.csv"
echo "- sample-asins.txt"
echo ""
echo "Happy checking! 🎉"