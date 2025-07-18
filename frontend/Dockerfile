###############################################################################
# Stage 1 – Build the static assets
###############################################################################
FROM node:20-bullseye AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build        # → dist/

###############################################################################
# Stage 2 – Serve with Nginx
###############################################################################
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf   # ← add if you need SPA fallback

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
