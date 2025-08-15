# Use Node.js 18 LTS as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies and source files to reduce image size
RUN npm prune --production && \
    rm -rf src/ && \
    rm -rf test/ && \
    rm -rf scripts/ && \
    rm -rf *.md && \
    rm -rf tsconfig*.json

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/scripts/health-check.js || exit 1

# Start the application
CMD ["node", "dist/main"]