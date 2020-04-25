# Copyright 2020 Edouard Maleix, read LICENSE

###############################################################################
# Step 1 : Builder image
#
FROM node:lts-alpine AS builder

# useful when installing dependencies from git in package.json
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
FROM node:lts-alpine AS http-api
LABEL maintainer="getlarge <ed@getlarge.eu>"

ENV NODE_NAME=device-manager
ENV HTTP_SERVER_PORT=8000

USER node

RUN mkdir -p /home/node/$NODE_NAME
RUN mkdir -p /home/node/$NODE_NAME/bin
WORKDIR /home/node/$NODE_NAME
RUN mkdir -p ./storage

COPY --chown=node bin ./bin/
COPY --chown=node favicon.ico ./
COPY --chown=node package*.json ./
COPY --chown=node --from=builder /home/node/$NODE_NAME/dist ./dist/
COPY --chown=node --from=builder /home/node/$NODE_NAME/node_modules ./node_modules/

STOPSIGNAL SIGINT

EXPOSE ${HTTP_SERVER_PORT}

CMD ["node","./bin/pm2-server.js", "--start"]

