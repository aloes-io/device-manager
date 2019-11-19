# Copyright 2019 Edouard Maleix, read LICENSE

###############################################################################
# Step 1 : Builder image
#
FROM node:lts-alpine AS builder

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

RUN npm ci 

###############################################################################
# Step 2 : Run image
#
FROM node:lts-alpine

ENV NODE_NAME=device-manager
ENV NODE_ENV=development

RUN mkdir -p /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME

# RUN npm ci

# RUN npm install && \
#     npm cache clean --force

COPY --from=builder /home/node/$NODE_NAME/. ./

CMD ["npm", "run", "test:cover"]

