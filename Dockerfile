# Use official Bun image
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

# Build the application
RUN bun run build:css
RUN bun run build:server

# Create directory for database and set permissions
RUN mkdir -p /app/data

# Expose port
EXPOSE 8080

# Start the server
CMD ["./dist/server"] 