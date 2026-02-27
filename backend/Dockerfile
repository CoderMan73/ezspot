# Choose the version of node we use.
FROM node:lts-alpine AS build

# Choose a working directory.
WORKDIR /app

# Copy dependencies 
COPY package.json package-lock.json ./

# Install packages
RUN npm install

# Copy rest of app??
COPY . .

# Run the server
RUN npm run build

# Use node to serve backend
FROM node:lts-alpine

WORKDIR /app

# Copy dependencies 
COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Start backend
CMD ["node", "dist/server.js"]