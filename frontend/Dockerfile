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

# Replace the default nginx.conf with one that uses ${PORT}
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template

# copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# ─── CHANGES ↓ ────────────────────────────────────────────────────────────────
ENV PORT=8085          # ① default for local + Cloud Run
EXPOSE 8085            # ② advertise the port
# ──────────────────────────────────────────────────────────────────────────────

# Substitute $PORT into nginx config before starting
CMD ["sh","-c","envsubst < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
