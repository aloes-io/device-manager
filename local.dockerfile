FROM node:lts-alpine

ENV NODE_NAME device-manager

RUN mkdir -p /home/node/$NODE_NAME

COPY src /home/node/$NODE_NAME/src/
COPY package*.json /home/node/$NODE_NAME/
COPY pm2.js /home/node/$NODE_NAME/
COPY favicon.ico /home/node/$NODE_NAME/
RUN mkdir -p /home/node/$NODE_NAME/storage

WORKDIR /home/node/$NODE_NAME

ENV NPM_CONFIG_LOGLEVEL warn
RUN npm ci 
RUN npm run build

CMD ["node","pm2.js", "--start"]

# USER node