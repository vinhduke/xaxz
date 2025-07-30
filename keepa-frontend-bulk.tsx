import React, { useState } from 'react';
import { Search, Package, AlertCircle, Loader2, TrendingUp, BarChart3, Server, Upload, Download, FileText, X } from 'lucide-react';
import Papa from 'papaparse';

const AmazonASINRankChecker = () => {
  const [activeTab, setActiveTab] = useState('single');
  const [asin, setAsin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [asinsToCheck, setAsinsToCheck] = useState([]);
  const [progress, setProgress] = useState(0);
  
  // Backend configuration
  const BACKEND_URL = 'http://localhost:3001';

  // Single ASIN search
  const handleSingleSearch = async () => {
    if (!asin.trim()) {
      setError('Vui lòng nhập mã ASIN');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/product/${asin}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      if (data.success) {
        setResult({
          ...data.data,
          tokensLeft: data.tokensLeft,
          refillIn: data.refillIn
        });
      } else {
        setError(data.error || 'Không tìm thấy sản phẩm');
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Không thể kết nối với server. Vui lòng kiểm tra backend server đang chạy trên port 3001');
      } else {
        setError(`Lỗi: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError('');
    setBulkResults([]);
    
    const fileType = uploadedFile.name.split('.').pop().toLowerCase();
    
    if (fileType === 'csv') {
      Papa.parse(uploadedFile, {
        complete: (results) => {
          const asins = [];
          results.data.forEach(row => {
            // Check if row is array or object
            const asinValue = Array.isArray(row) ? row[0] : (row.asin || row.ASIN || Object.values(row)[0]);
            if (asinValue && asinValue.trim() && asinValue.length === 10) {
              asins.push(asinValue.trim().toUpperCase());
            }
          });
          setAsinsToCheck([...new Set(asins)]); // Remove duplicates
        },
        header: true,
        skipEmptyLines: true
      });
    } else if (fileType === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const asins = text.split(/[\n,\s]+/)
          .map(asin => asin.trim().toUpperCase())
          .filter(asin => asin && asin.length === 10);
        setAsinsToCheck([...new Set(asins)]); // Remove duplicates
      };
      reader.readAsText(uploadedFile);
    } else {
      setError('Vui lòng upload file CSV hoặc TXT');
      setFile(null);
    }
  };

  // Bulk check ASINs
  const handleBulkCheck = async () => {
    if (asinsToCheck.length === 0) {
      setError('Không tìm thấy ASIN hợp lệ trong file');
      return;
    }

    setLoading(true);
    setError('');
    setBulkResults([]);
    setProgress(0);

    try {
      // Process in batches of 20 ASINs
      const batchSize = 20;
      const batches = [];
      for (let i = 0; i < asinsToCheck.length; i += batchSize) {
        batches.push(asinsToCheck.slice(i, i + batchSize));
      }

      let allResults = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setProgress(Math.round(((i + 1) / batches.length) * 100));
        
        const response = await fetch(`${BACKEND_URL}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ asins: batch })
        });

        const data = await response.json();
        
        if (data.success && data.data) {
          allResults = [...allResults, ...data.data];
        }
        
        // Add a small delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setBulkResults(allResults);
      setProgress(100);
    } catch (err) {
      console.error('Error:', err);
      setError(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Export results to CSV
  const exportToCSV = () => {
    if (bulkResults.length === 0) return;

    const csvData = bulkResults.map(item => {
      const mainRanking = item.rankings?.find(r => r.isMain);
      return {
        ASIN: item.asin,
        'Product Title': item.title,
        'Main BSR': mainRanking ? mainRanking.rank : 'N/A',
        'Main Category': mainRanking ? mainRanking.category : 'N/A',
        'Price': item.price ? `$${item.price}` : 'N/A',
        'Availability': item.availability || 'N/A'
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `amazon_bsr_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFile = () => {
    setFile(null);
    setAsinsToCheck([]);
    setBulkResults([]);
    setError('');
    // Reset file input
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Amazon BSR Checker với Keepa API
            </h1>
            <p className="text-gray-600">
              Kiểm tra Best Seller Rank - Single hoặc Bulk Check
            </p>
          </div>

          {/* Server Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-700">Backend Server:</span>
              <code className="text-sm bg-gray-200 px-2 py-1 rounded">{BACKEND_URL}</code>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'single'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Single Check
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'bulk'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bulk Check
            </button>
          </div>

          {/* Single Check Tab */}
          {activeTab === 'single' && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={asin}
                  onChange={(e) => setAsin(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleSingleSearch()}
                  placeholder="Nhập mã ASIN (VD: B08N5WRWNW)"
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 transition-colors"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>

              <button
                onClick={handleSingleSearch}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang tìm kiếm...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-5 h-5" />
                    Kiểm tra BSR
                  </>
                )}
              </button>

              {/* Single Result Display */}
              {result && (
                <div className="mt-6 space-y-4">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex gap-6">
                      {result.imageUrl && (
                        <img 
                          src={result.imageUrl} 
                          alt={result.title}
                          className="w-32 h-32 object-contain rounded-lg bg-white p-2"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800 mb-2">{result.title}</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">ASIN:</span> 
                            <span className="font-medium ml-1">{result.asin}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Thương hiệu:</span> 
                            <span className="font-medium ml-1">{result.brand}</span>
                          </div>
                          {result.price && (
                            <div>
                              <span className="text-gray-500">Giá:</span> 
                              <span className="font-medium ml-1">${result.price}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Tình trạng:</span> 
                            <span className={`font-medium ml-1 ${result.availability === 'In Stock' ? 'text-green-600' : 'text-red-600'}`}>
                              {result.availability === 'In Stock' ? 'Còn hàng' : 'Hết hàng'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                    <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Best Seller Rankings
                    </h3>
                    {result.rankings && result.rankings.length > 0 ? (
                      <div className="space-y-3">
                        {result.rankings.map((ranking, index) => (
                          <div 
                            key={index} 
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              ranking.isMain ? 'bg-white border-2 border-green-200' : 'bg-white/70'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              ranking.isMain ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                              #{index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-xl font-bold text-gray-800">
                                #{ranking.rank}
                              </p>
                              <p className="text-sm text-gray-600">
                                trong {ranking.category}
                                {ranking.isMain && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Main</span>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">Không có thông tin BSR</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bulk Check Tab */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                {!file ? (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Upload file CSV hoặc TXT chứa danh sách ASIN</p>
                    <p className="text-sm text-gray-500 mb-4">
                      CSV: Cột đầu tiên hoặc cột tên "ASIN" | TXT: Mỗi ASIN một dòng
                    </p>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg inline-flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Chọn file
                      </span>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div className="text-left">
                        <p className="font-medium text-gray-800">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          Tìm thấy {asinsToCheck.length} ASIN hợp lệ
                        </p>
                      </div>
                      <button
                        onClick={clearFile}
                        className="ml-4 p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    {asinsToCheck.length > 0 && (
                      <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded text-left">
                        <p className="text-xs text-gray-600 mb-2">ASINs sẽ được kiểm tra:</p>
                        <div className="text-xs font-mono">
                          {asinsToCheck.slice(0, 10).join(', ')}
                          {asinsToCheck.length > 10 && ` ... và ${asinsToCheck.length - 10} ASIN khác`}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleBulkCheck}
                      disabled={loading || asinsToCheck.length === 0}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Đang kiểm tra... {progress}%
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-5 h-5" />
                          Kiểm tra {asinsToCheck.length} ASINs
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk Results */}
              {bulkResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Kết quả: {bulkResults.length} sản phẩm
                    </h3>
                    <button
                      onClick={exportToCSV}
                      className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 font-medium text-gray-700">ASIN</th>
                          <th className="text-left p-3 font-medium text-gray-700">Tên sản phẩm</th>
                          <th className="text-center p-3 font-medium text-gray-700">BSR</th>
                          <th className="text-left p-3 font-medium text-gray-700">Danh mục</th>
                          <th className="text-center p-3 font-medium text-gray-700">Giá</th>
                          <th className="text-center p-3 font-medium text-gray-700">Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.map((item, index) => {
                          const mainRanking = item.rankings?.find(r => r.isMain) || item.rankings?.[0];
                          return (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-mono text-sm">{item.asin}</td>
                              <td className="p-3 text-sm">{item.title}</td>
                              <td className="p-3 text-center font-semibold">
                                {mainRanking ? `#${mainRanking.rank}` : 'N/A'}
                              </td>
                              <td className="p-3 text-sm text-gray-600">
                                {mainRanking?.category || 'N/A'}
                              </td>
                              <td className="p-3 text-center">
                                {item.price ? `$${item.price}` : 'N/A'}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  item.availability === 'In Stock' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {item.availability === 'In Stock' ? 'Còn hàng' : 'Hết hàng'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700">{error}</p>
                {error.includes('backend server') && (
                  <div className="mt-2 text-sm text-red-600">
                    <p className="font-semibold">Hướng dẫn chạy backend:</p>
                    <ol className="list-decimal list-inside mt-1">
                      <li>Tạo folder mới và copy code backend</li>
                      <li>Chạy: <code className="bg-red-100 px-1">npm install</code></li>
                      <li>Chạy: <code className="bg-red-100 px-1">npm start</code></li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Hướng dẫn sử dụng Bulk Check:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>File CSV:</strong> Cột đầu tiên hoặc cột có tên "ASIN"</li>
                  <li><strong>File TXT:</strong> Mỗi ASIN một dòng hoặc cách nhau bởi dấu phẩy</li>
                  <li>ASIN phải có đúng 10 ký tự (chữ và số)</li>
                  <li>Tối đa 100 ASINs mỗi lần check</li>
                  <li>Kết quả có thể export ra file CSV</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmazonASINRankChecker;