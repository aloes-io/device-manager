# Copyright 2019 Edouard Maleix, read LICENSE

###############################################################################
# Step 1 : Builder image
#
FROM node:lts-alpine AS builder

# useful when installing git dependency in package.json
RUN apk update && apk add git

ENV NODE_NAME=device-manager
ENV NPM_CONFIG_LOGLEVEL warn

RUN mkdir -p /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME

COPY src ./src/
COPY package*.json ./

RUN npm ci 
# RUN npm install --production
RUN npm run build

###############################################################################
# Step 2 : Run image
#
FROM node:lts-alpine AS mqtt-api

ENV NODE_NAME=device-manager

RUN mkdir -p /home/node/$NODE_NAME
RUN mkdir -p /home/node/$NODE_NAME/bin
WORKDIR /home/node/$NODE_NAME

COPY bin ./bin/
COPY package* ./

COPY --from=builder /home/node/$NODE_NAME/dist ./dist/
COPY --from=builder /home/node/$NODE_NAME/node_modules ./node_modules/

STOPSIGNAL SIGINT
# STOPSIGNAL 0

CMD ["node","bin/pm2-broker.js", "--start"]

# USER node
