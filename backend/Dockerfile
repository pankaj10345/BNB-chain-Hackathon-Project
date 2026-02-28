FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./src

EXPOSE 8080

CMD ["npm", "start"]
