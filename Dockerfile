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

# Pin standalone yt-dlp binary release with SHA-256 verification (Issue #25, #58, #67)
ARG YTDLP_VERSION=2026.08.19
ARG YTDLP_SHA256=1fa6733c37ea6fb51c99ad8fe785e7b7e5f3246c9b980230329d4fb72ed8d4d6
RUN curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp" -o /usr/local/bin/yt-dlp && \
    echo "${YTDLP_SHA256}  /usr/local/bin/yt-dlp" | sha256sum -c - && \
    chmod a+rwx /usr/local/bin/yt-dlp && \
    chown node:node /usr/local/bin/yt-dlp

WORKDIR /app

# Set environment
ENV NODE_ENV=production \
    PORT=3000 \
    DOWNLOADS_DIR=/app/downloads \
    TEMP_DIR=/app/downloads/temp

# Copy package manifests & install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code, assets, and maintenance scripts
COPY manifest.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Create downloads directory with proper permissions
RUN mkdir -p /app/downloads/temp && chown -R node:node /app

# Run as non-root user for Homelab security
USER node

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
