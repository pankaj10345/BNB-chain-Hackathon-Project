FROM node:20-alpine AS deps

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/. .

ARG NEXT_PUBLIC_API_BASE=http://localhost:8080
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "PORT=${PORT:-3000} npm run start -- -H 0.0.0.0"]
