# Use official Node.js LTS image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose port (Cloud Run uses $PORT)
ENV PORT=8080
EXPOSE 3000

# Start the app
CMD ["npm", "run", "dev"] 