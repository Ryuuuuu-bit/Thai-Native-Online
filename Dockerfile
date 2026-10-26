FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY *.html *.css *.js server.cjs ./
COPY assets ./assets
ENV NODE_ENV=production HOST=0.0.0.0 DATA_DIR=/data
CMD ["node", "server.cjs"]
