FROM node:lts-alpine

ENV NODE_NAME=device-manager
ENV NPM_CONFIG_LOGLEVEL warn

RUN mkdir -p /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME

RUN mkdir -p ./storage
COPY src ./src/
COPY bin ./bin/
COPY package*.json ./
# COPY pm2-local.js ./
COPY favicon.ico ./

RUN npm ci 
RUN npm run build

CMD ["node","bin/pm2-local.js", "--start"]

# USER node