# ==============================================================================
# TuneFlow - Lightweight Container Dockerfile (<120MB)
# Lightweight runtime image with Node.js 22 LTS
# ==============================================================================

FROM node:22-alpine AS runtime

# Install ffmpeg, python3, and curl
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    curl \
    ca-certificates

# Pin standalone yt-dlp binary release
ARG YTDLP_VERSION=2025.02.19
RUN curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp" -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Set environment
ENV NODE_ENV=production \
    PORT=3000 \
    DOWNLOADS_DIR=/app/downloads \
    TEMP_DIR=/app/downloads/temp

# Copy package manifests & install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code and assets
COPY manifest.json ./
COPY src/ ./src/
COPY public/ ./public/

# Create downloads directory with proper permissions
RUN mkdir -p /app/downloads/temp && chown -R node:node /app

# Run as non-root user for Homelab security
USER node

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
