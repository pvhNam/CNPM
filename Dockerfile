# Bước 1: Dùng image node nhẹ làm gốc
FROM node:16-slim

# Bước 2: Tạo thư mục làm việc trong container
WORKDIR /app

# Bước 3: Copy file cấu hình và cài đặt thư viện
COPY package*.json ./
RUN npm install

# Bước 4: Copy toàn bộ code vào container
COPY . .

# Bước 5: Mở port 3000
EXPOSE 3000

# Bước 6: Lệnh chạy web
CMD ["npm", "start"]