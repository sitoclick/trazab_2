FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build-time variables for Vite frontend bundle
ARG VITE_ADMIN_PASSWORD
ARG VITE_ALICIA_PASSWORD
ARG VITE_ROSA_PASSWORD
ARG VITE_SANDRA_PASSWORD

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
