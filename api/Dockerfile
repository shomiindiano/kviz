FROM node:18

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

# kopira sve, uključujući questions
COPY . .

EXPOSE 3000

# direktno node
CMD ["node", "server.js"]



