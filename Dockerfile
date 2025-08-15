# Simple single-stage Dockerfile
FROM node:18-alpine

# Install OpenSSL and curl for Prisma and health checks
RUN apk add --no-cache openssl openssl-dev curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies first (needed for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies and unnecessary files to reduce image size
RUN npm prune --production && \
    rm -rf src/ && \
    rm -rf test/ && \
    rm -rf *.md && \
    rm -rf tsconfig*.json && \
    rm -rf nest-cli.json && \
    rm -rf webpack.config.js

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check using curl to test the /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/main"]