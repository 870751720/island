FROM node:22-alpine
WORKDIR /app
COPY relay/package*.json ./
RUN npm ci --omit=dev
COPY relay/*.ts ./
USER node
EXPOSE 3002
CMD ["node", "main.ts"]
