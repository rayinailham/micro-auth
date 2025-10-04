# Use Bun official image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001

ARG INCLUDE_DEV_DEPS=false

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN if [ "$INCLUDE_DEV_DEPS" = "true" ]; then \
      bun install; \
    else \
      bun install --production; \
    fi

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R bunuser:bunuser /app

# Switch to non-root user
USER bunuser

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3008/health || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]

