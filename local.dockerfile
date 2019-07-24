# FROM node:latest
FROM node:lts-alpine

ENV NODE_ENV local
ENV NODE_NAME device-manager

RUN mkdir -p /home/node/$NODE_NAME
COPY . /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME

RUN npm install --silent
RUN npm run build

# TODO build TLS certificates for MQTT

CMD ["node","nodemon.js"]

# USER node