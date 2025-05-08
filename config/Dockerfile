FROM nginx:alpine

# Install curl
RUN apk add --no-cache curl

# Copy the static files
COPY ../tocka /usr/share/nginx/html/

# Configure nginx
COPY config/proxy/nginx.conf /etc/nginx/conf.d/default.conf