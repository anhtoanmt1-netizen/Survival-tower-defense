# Máy chủ multiplayer + web. Build: docker build -t std-server .   Chạy: docker run -p 8080:8080 std-server
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json ./
COPY src ./src
COPY server ./server
COPY --from=build /app/dist ./dist
EXPOSE 8080
USER node
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "server/index.js"]
