const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="background-color: #f0f8ff; text-align: center; font-family: sans-serif; padding-top: 50px;">
        <h1 style="color: #2c3e50;">🚀 Demo Jenkins CI/CD - Nhóm DevOps Sinh Viên</h1>
        <p>Trạng thái: <span style="color: green; font-weight: bold;">Đã Deploy Thành Công!</span></p>
        <div style="border: 2px dashed #3498db; display: inline-block; padding: 20px;">
          <p>Dự án: Tìm hiểu Jenkins & Docker</p>
          <p>Version: test demo bai CNPM</p>
        </div>
        <br><br>
        <p><i>Cập nhật lần cuối: ${new Date().toLocaleString()}</i></p>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Web app listening at http://localhost:${port}`);
});
