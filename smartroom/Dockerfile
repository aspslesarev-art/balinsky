FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./
COPY public ./public
# Данные — том, иначе переписка и каталог умрут вместе с контейнером.
VOLUME /app/data
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
