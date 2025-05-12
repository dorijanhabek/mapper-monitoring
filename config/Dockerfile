FROM node:alpine

WORKDIR /app

# Copy the static files
COPY config/frontend-server.js .

COPY tocka .

RUN npm init -y && \
    npm install express axios cors && \
    sed -i 's/"keywords": \[\]/"keywords": ["TOCKA"]/' package.json && \
    sed -i 's/"author": ""/"author": "Dino Pizek"/' package.json && \
    sed -i 's/"name": ".*"/"name": "TOCKA Monitoring"/' package.json

EXPOSE 80

CMD ["node", "frontend-server.js"]