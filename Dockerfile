FROM nginx:alpine

# Copy the static files
COPY kai/ /usr/share/nginx/html/

# Configure nginx
COPY config/proxy/nginx.conf /etc/nginx/conf.d/default.conf

