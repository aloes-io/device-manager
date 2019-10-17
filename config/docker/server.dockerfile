###############################################################################
# Step 1 : Builder image
#
FROM node:lts-alpine AS builder

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
FROM node:lts-alpine as http-api

ENV NODE_NAME=device-manager

RUN mkdir -p /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME
RUN mkdir -p ./storage

COPY bin ./bin/
COPY favicon.ico ./
COPY package* ./

COPY --from=builder /home/node/$NODE_NAME/dist ./dist/
COPY --from=builder /home/node/$NODE_NAME/node_modules ./node_modules/

CMD ["node","bin/pm2-server.js", "--start"]

# USER node
