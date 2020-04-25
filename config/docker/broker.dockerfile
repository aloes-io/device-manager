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
RUN npm run build

###############################################################################
# Step 2 : Run image
#
FROM node:lts-alpine AS mqtt-api
LABEL maintainer="getlarge <ed@getlarge.eu>"

ENV NODE_NAME=device-manager
ENV MQTT_BROKER_PORT=1883 WS_BROKER_PORT=3000

USER node

RUN mkdir -p /home/node/$NODE_NAME
RUN mkdir -p /home/node/$NODE_NAME/bin
WORKDIR /home/node/$NODE_NAME

COPY --chown=node bin ./bin/
COPY --chown=node package*.json ./
COPY --chown=node --from=builder /home/node/$NODE_NAME/dist ./dist/
COPY --chown=node --from=builder /home/node/$NODE_NAME/node_modules ./node_modules/

STOPSIGNAL SIGINT

EXPOSE ${MQTT_BROKER_PORT}
EXPOSE ${WS_BROKER_PORT}

CMD ["node","./bin/pm2-broker.js", "--start"]
