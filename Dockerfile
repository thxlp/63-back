# ใช้ Node.js version 18 แบบ slim (ขนาดเล็กและประหยัดพื้นที่)
FROM node:18-slim

# กำหนดโฟลเดอร์ที่จะทำงานภายในเครื่อง Server
WORKDIR /usr/src/app

# คัดลอกไฟล์รายการ library เข้าไปก่อนเพื่อติดตั้ง
COPY package*.json ./

# ติดตั้งเฉพาะ Library ที่จำเป็นสำหรับรันจริง (ไม่รวมพวกตัวช่วยเขียนโค้ด)
RUN npm install --only=production

# คัดลอกโค้ดทั้งหมดในโฟลเดอร์ปัจจุบันเข้าไปใน Server
COPY . .

# Cloud Run จะส่ง Request มาทาง Port 8080 เป็นค่าเริ่มต้น
ENV PORT=8080
EXPOSE 8080

# คำสั่งสำหรับเริ่มรันแอปพลิเคชัน
CMD [ "npm", "start" ]