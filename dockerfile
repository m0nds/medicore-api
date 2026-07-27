FROM node:20-slim

RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Use npm install instead of npm ci for cross-platform compatibility
RUN npm install --production=false

RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["node", "dist/server.js"]