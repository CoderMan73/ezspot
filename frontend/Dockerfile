# Choose the version of node we use.
FROM node:lts-alpine as build

# Choose a working directory.
WORKDIR /app

# Copy dependencies 
COPY package.json ./
COPY package-lock.json ./

# Install packages
RUN npm install

# Copy rest of app??
COPY . .

# Run the server
RUN npm run build

# Use nginx to serve build
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]