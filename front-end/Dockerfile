# Sử dụng Node.js phiên bản 18 làm base image
FROM node:18-alpine

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Build ứng dụng Next.js
RUN npm run build

# Mở cổng 3001 để truy cập ứng dụng
EXPOSE 3001

# Khởi chạy ứng dụng
CMD ["npm", "run", "dev"]