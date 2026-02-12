# Koristimo Node.js 18 kao osnovu
FROM node:18

# Dodajemo meta-informacije
LABEL maintainer="student@fon.rs"
LABEL version="1.0"
LABEL description="FMIR Kviz aplikacija u Docker okruženju"

# ARG promenljivevrednosti pri build-u
ARG APP_VERSION=1.0
ENV APP_VERSION=${APP_VERSION}
ENV NODE_ENV=production

# Postavljamo radni direktorijum
WORKDIR /app

# Kopiramo package.json i instaliramo zavisnosti
COPY package*.json ./
RUN npm install --production

# Kopiramo ostatak aplikacije
COPY . .

# Izlažemo port (dokumentacija)
EXPOSE 3000

# Healthcheck proverava da li API radi
HEALTHCHECK CMD curl --fail http://localhost:3000/files || exit 1

# Pokrećemo server
CMD ["node", "server.js"]

