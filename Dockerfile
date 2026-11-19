FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma
RUN npm ci
COPY . .
ENV API_INTERNAL_URL=http://worker:4000
RUN npm run build
ENV NODE_ENV=production
USER node
CMD ["node", "apps/api/dist/main.js"]
