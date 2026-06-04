# Social service Dockerfile - Node.js + TypeScript Express microservice.
FROM node:20-alpine AS build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

COPY package*.json tsconfig*.json ./
RUN npm ci

COPY . ./
RUN npm run build

FROM node:20-alpine AS release
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3004

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3004
CMD ["node", "dist/index.js"]
