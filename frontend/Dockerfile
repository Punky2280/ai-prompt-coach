# ─────────────────────────────── frontend/Dockerfile ─────────────────────────
###############################################################################
# Stage 1 – build static assets with Node
###############################################################################
FROM node:20-bullseye AS builder

WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# copy the rest of source and build
COPY . .
RUN npm run build      # → creates /app/dist

###############################################################################
# Stage 2 – serve build with Nginx
###############################################################################
FROM nginx:stable-alpine

# Remove the default nginx.conf and replace with one that listens on 8080
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
