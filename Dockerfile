FROM node:20-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --production

COPY backend/ ./
COPY frontend/ ./public/

USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
