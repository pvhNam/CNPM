/* ===================================
   Database Pool - TiDB / MySQL
   Tất cả thông tin kết nối đọc từ biến môi trường.
   Local dev: đặt trong file .env (xem .env.example)
   Render:    đặt trong Environment Variables trên Dashboard
   =================================== */

const mysql = require('mysql2/promise');

const {
    MYSQLHOST,
    MYSQLPORT,
    MYSQLUSER,
    MYSQLPASSWORD,
    MYSQLDATABASE,
    MYSQL_SSL
} = process.env;

// Bắt buộc phải có đủ env, tránh tình huống vô tình chạy với fallback lộ creds
const missing = ['MYSQLHOST', 'MYSQLUSER', 'MYSQLPASSWORD', 'MYSQLDATABASE']
    .filter((k) => !process.env[k]);

if (missing.length > 0) {
    console.error(`❌ Thiếu biến môi trường: ${missing.join(', ')}`);
    console.error('   Hãy tạo file .env (xem .env.example) hoặc set env trên Render.');
    process.exit(1);
}

// TiDB Cloud bắt buộc SSL. Cho phép tắt qua MYSQL_SSL=false nếu dùng MySQL local.
const useSsl = (MYSQL_SSL || 'true').toLowerCase() !== 'false';

const pool = mysql.createPool({
    host: MYSQLHOST,
    port: parseInt(MYSQLPORT || '4000', 10),
    user: MYSQLUSER,
    password: MYSQLPASSWORD,
    database: MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined
});

module.exports = pool;
