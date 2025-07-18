# ---- runtime image ----
FROM node:20-slim

WORKDIR /app

# Install production deps
COPY package*.json ./
RUN npm ci --omit=dev   # (or `npm install --production`)

# Copy the rest of the source
COPY . .

# Cloud Run listens on $PORT (defaults to 8080)
ENV PORT 8080
EXPOSE 8080

# Start your server (adjust if different)
CMD ["npm", "start"]
