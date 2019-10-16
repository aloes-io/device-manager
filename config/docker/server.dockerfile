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
RUN npm run build

###############################################################################
# Step 2 : Run image
#
FROM node:lts-alpine

ENV NODE_NAME=device-manager

RUN mkdir -p /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME
RUN mkdir -p ./storage

COPY bin ./bin/
# COPY pm2-server.js ./
COPY favicon.ico ./
COPY package* ./

RUN npm ci 
# RUN npm install --production

COPY --from=builder /home/node/$NODE_NAME/dist ./dist/

CMD ["node","bin/pm2-server.js", "--start"]

# USER node
