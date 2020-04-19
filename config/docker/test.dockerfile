# Copyright 2020 Edouard Maleix, read LICENSE

FROM node:lts-alpine AS builder

RUN apk update && apk add git

ENV NODE_NAME=device-manager
ENV NODE_ENV=development
# ENV NPM_CONFIG_LOGLEVEL warn

RUN mkdir -p /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME
RUN mkdir -p ./storage

COPY src ./src/
COPY package* ./
COPY favicon.ico ./
COPY docs ./docs/

# COPY node_modules ./node_modules/

RUN npm ci 

CMD ["npm", "run", "test:cover"]
