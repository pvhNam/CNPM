const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: parseInt(process.env.MYSQLPORT) || 4000,
    user: process.env.MYSQLUSER || '2e6TRD3nBAkVtKV.root', // Nhớ thay bằng biến môi trường sau nhé
    password: process.env.MYSQLPASSWORD || 'OCCT9T7eXutoukG9',
    database: process.env.MYSQLDATABASE || 'o_an_quan_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    
    // 👇 THÊM ĐOẠN NÀY VÀO 👇
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
    // 👆 👆 👆 👆 👆 👆 👆 👆
});

module.exports = pool;