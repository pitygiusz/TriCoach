# Gateway service Dockerfile - designed for a Node.js + TypeScript Express.js microservice.
# This file is a build skeleton only; service implementation belongs in source files.

FROM node:20-alpine AS build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

# Install dependencies for build and compilation
COPY package*.json tsconfig*.json ./
RUN npm ci

# Copy source and build
COPY . ./
RUN npm run build

# Production image
FROM node:20-alpine AS release
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["node", "dist/index.js"]
