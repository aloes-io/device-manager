###############################################################################
# Step 1 : Builder image
#
FROM node:lts-alpine AS builder

ENV NODE_NAME=device-manager
ENV NODE_ENV=development
# ENV NPM_CONFIG_LOGLEVEL warn

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
ENV NODE_ENV=development

RUN mkdir -p /home/node/$NODE_NAME
WORKDIR /home/node/$NODE_NAME

RUN mkdir -p ./storage

COPY package* ./
COPY favicon.ico ./
COPY docs ./docs/

RUN npm ci 

# RUN npm install && \
#     npm cache clean --force

COPY --from=builder /home/node/$NODE_NAME/dist ./dist/

CMD ["./node_modules/.bin/mocha","dist/**/*.test.js", "--reporter", "spec"]

