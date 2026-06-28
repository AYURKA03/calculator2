FROM dockerhub.timeweb.cloud/library/node:18-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm install

COPY server/ ./server
COPY public/ ./public

EXPOSE 3000

CMD ["node", "server/app.js"]