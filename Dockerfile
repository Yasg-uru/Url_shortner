# Use an official Node.js image as the base
FROM ghcr.io/node:18



# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the TypeScript application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8000

# Start the application
CMD ["node", "dist/index.js"]
