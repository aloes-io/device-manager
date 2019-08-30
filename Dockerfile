FROM node:lts-alpine

# ENV NODE_ENV local
ENV NODE_NAME device-manager

RUN mkdir -p /home/node/$NODE_NAME
# COPY . /home/node/$NODE_NAME
COPY src /home/node/$NODE_NAME/src/
COPY package*.json /home/node/$NODE_NAME/
COPY nodemon.js /home/node/$NODE_NAME/
COPY favicon.ico /home/node/$NODE_NAME/

COPY .env /home/node/$NODE_NAME
RUN mkdir -p /home/node/$NODE_NAME/storage
# TODO build TLS certificates for MQTT ?

WORKDIR /home/node/$NODE_NAME

RUN npm ci 
RUN npm run build


CMD ["node","nodemon.js"]

# USER node