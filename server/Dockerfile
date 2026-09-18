FROM node:22-alpine
WORKDIR /app
COPY server/*.ts ./server/
COPY shared/cloudSave.ts ./shared/cloudSave.ts
USER node
EXPOSE 3001
CMD ["node", "--experimental-strip-types", "server/main.ts"]
