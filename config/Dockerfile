FROM nginx:alpine

# Copy the static files
COPY ../tocka /usr/share/nginx/html/

# Configure nginx
COPY ./proxy/nginx.conf /etc/nginx/conf.d/default.conf