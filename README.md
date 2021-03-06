# Aloes - Device Manager

[![pipeline status](https://framagit.org/aloes/device-manager/badges/master/pipeline.svg)](https://framagit.org/aloes/device-manager/-/commits/master) [![coverage report](https://framagit.org/aloes/device-manager/badges/master/coverage.svg)](https://aloes.frama.io/device-manager/lcov-report)

- Replicate devices with rich semantic properties
- Authentification by access tokens and API keys
- Handle devices and sensors CRUD methods triggered via HTTP and MQTT
- MQTT events generated by HTTP operations hooks
- Dispatch MQTT payload from several protocol sources
- Adding context to sensors with OMA schemas
- Store devices and sensors state ( MongoDB )
- Fast access to sensor resources, clients and timers ( Redis )
- Mesurement (sensor values and tags ) stored in timeseries ( InfluxDB )
- Users and Devices files stored in filesystem or cloud providers, see [loopback-component-storage](https://www.npmjs.com/package/loopback-component-storage)
- Trigger persisted schedulers (via sensors) to create timed scenarios ( Skyring )
- Interact with external application and share selection of devices

[Swagger Explorer](https://aloes.io/app/explorer/)

[Full Docs](https://aloes.frama.io/device-manager/)

Application build upon :

- [NodeJS](https://nodejs.org/en/)
- [Loopback](https://loopback.io/doc/en/lb3/)
- [Aedes](https://github.com/mcollina/aedes)
- [Open Mobile Alliance](http://www.openmobilealliance.org/wp/OMNA/LwM2M/LwM2MRegistry.html)
- [Aloes-handlers](https://www.npmjs.com/package/aloes-handlers)
- [IoT-agent](https://www.npmjs.com/package/iot-agent)

---

## Prerequisites

These need to be installed, configured and started manually, when working locally and not using docker setup.

- Install [MongoDB](https://www.mongodb.com/) to persist Users, AccessTokens, Devices, Sensors, Addresses, File models.

```bash
mongod --config /usr/local/etc/mongod.conf
```

- Install [Redis](https://redis.io/) to persist SensorResources, Schedulers and Client models, MQTT connection and RateLimiter

```bash
redis-server /usr/local/etc/redis.conf
```

- Install [InfluxDB](https://www.influxdata.com/) to persist Measurements

```bash
influxd -config /usr/local/etc/influxdb.conf
```

- Install [Skyring](https://esatterwhite.github.io/skyring/) to use persistent timers for Scheduler

```bash
# start NATS server
nats-server

# start Skyring
DEBUG=skyring:* skyring run -p 3005 -s localhost:3455
```

## Folder structure

- /. --> Main application configuration, dependencies list, and launch scripts

- /bin --> contains some maintenance scripts - not needed yet

- /deploy --> contains environment variables ( hidden files )

- /log --> contains logs from PM2 and Nginx used via Docker

- /storage --> contains folders where Users / Devices files are stored

- /src --> contains source code
  - /. --> Loopback configuration
  - /boot --> code executed at application start
  - /initial-data --> JSON datasets to make global application running
  - /lib --> Helpers for models and services
  - /middleware --> scripts used in development/staging only
  - /mixins --> add special properties to models
  - /models --> Data models, controllers and REST API descriptions
  - /services --> external modules
  - /views --> templates used for automated mailing

## API

### HTTP

URL pattern : +apiRoot/+modelPluralName/+path

Access controlled using Access tokens ( set in HTTP headers ) and roles for Users and using apiKey property for Applications and Devices.

### MQTT

Topic pattern : +userId/+modelName/+method/[+modelId]

Access controlled using Access tokens ( set in MQTT password ) and roles for Users and using apiKey property for Applications and Devices.

## Configuration

Edit your config in .env_sample and save it as `.env`.
You can override these by populating `deploy` with files corresponding to an environment ( eg: .env_production ... ).

## Installation

```bash
  $ npm install
```

## Linting

```bash
  $ npm run lint
```

## Debug

- To set Aloes verbosity, configure SERVER_LOGGER_LEVEL from 0 to 4

- To activate Loopback debug :

```bash
  $ DEBUG=loopback npm run start:dev
```

[More info...](https://loopback.io/doc/en/lb3/Setting-debug-strings.html)

## Starting project

Create or update `.env` file to match your enviroment.

For example to run in local mode, create `./deploy/.env_local` using `.env_sample` as an example.

### With Nodemon

```bash
  $ npm run start:local
```

### With PM2

- Starting PM2 processes :

```bash
  $ npm run start:pm2
```

- Stopping PM2 processes :

```bash
  $ npm run stop:pm2
```

### With Docker

You can serve the project with a distant server by filling `deploy` folder with files corresponding to an environment ( eg: .env_docker ), and then launching this app with docker via `docker-compose up`

Remember to update `*.dockerfile` to match your environment, if you don't use docker-compose, otherwise edit `docker-compose.yml` to match your environment and needs.

Creating environment :

```bash
  $  npm run build:docker
```

Starting containers :

```bash
  $  npm run start:docker
```

Stopping containers :

```bash
  $  npm run stop:docker
```

## To deploy with your own TLS / SSL certificates

Read https://nodejs.org/api/tls.html#tls_tls_ssl

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./deploy/key.pem -out ./deploy/cert.pem

openssl dhparam -out ./deploy/dhparam.pem 2048
```

## To deploy with Localtunnel

Install your own server instance : https://github.com/localtunnel/server

And then install wildcards certificates with : https://certbot.eff.org/

Finally, configure TUNNEL_HOST and TUNNEL_SECURE in your environment files.

## TODOs

- Add e2e tests for processes interruption signal and tests for MQTT with mysensors / lorawan source

- Finish restore helper for InfluxDB

- Implement user+ip rate limit for HTTP endpoints requiring auth

- Finish account linking with github

- Add user(s) in a team to easily share devices access ( via collaborators property/role ? )

- Catch and store data related to MQTT traffic ( https://github.com/mcollina/aedes-logging#readme ; via specific sensor instance ? )

- Update to loopback 4

- Add redis replication config ( docker deployement )

  - https://stackoverflow.com/questions/45902031/docker-swarm-redis-and-sentinel-with-master-slave-replication-ip-resolution-cl

  - https://redis.io/topics/replication#configuring-replication-in-docker-and-nat

- Synchronize data from Aloes ecosystem to a distributed ledger ( IOTA Tangle ? )
