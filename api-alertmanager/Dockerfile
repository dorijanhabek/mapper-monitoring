FROM node:alpine

WORKDIR /app

COPY server.js .

RUN npm init -y && \
    npm install express axios cors && \
    sed -i 's/"keywords": \[\]/"keywords": ["KAI"]/' package.json && \
    sed -i 's/"author": ""/"author": "Dino Pizek"/' package.json && \
    sed -i 's/"name": ".*"/"name": "KAI Monitoring"/' package.json

EXPOSE 3000

CMD ["node", "server.js"]