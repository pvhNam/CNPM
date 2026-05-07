FROM node:16-slim

WORKDIR /app 

COPY package*.json ./ 
RUN npm install 

# Đã sửa: Gom lại thành một dòng với khoảng trắng ở giữa
COPY . . 

EXPOSE 3000 

CMD ["npm", "start"]