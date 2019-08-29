FROM node:lts-alpine

# ENV NODE_ENV local
ENV NODE_NAME device-manager

RUN mkdir -p /home/node/$NODE_NAME
COPY . /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME

RUN npm install --silent
RUN npm run build
RUN npm install pm2 -g

# TODO build TLS certificates for MQTT ?

# CMD ["node","nodemon.js"]
# CMD ["pm2-runtime", "ecosystem.config.js", "--only", "device-manager"]
CMD ["pm2-runtime", "ecosystem.config.js"]

# USER node