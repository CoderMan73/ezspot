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

# install python in the final runtime image
RUN apk add --no-cache python3 py3-pip

# copy python requirements
COPY python/requirements.txt ./requirements.txt

# create venv inside container because alpine is PEP 668
RUN python3 -m venv /opt/venv
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
ENV PATH="/opt/venv/bin:$PATH"

COPY --from=build /app/dist ./dist

# copy python scripts 
COPY  python ./python

# Expose port 3000
EXPOSE 3000

# Start backend
CMD ["node", "dist/server.js"]