# Frontend microservice

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
ENV PORT=8080

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/*.html ./dist/
COPY --from=build /app/src/*.css ./dist/
COPY --from=build /app/src/*.js ./dist/
COPY --from=build /app/src/*.ico ./dist/

EXPOSE 8080
CMD ["node", "dist/index.js"]
