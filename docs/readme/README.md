# Aloes - Device Manager

- Authentification by access token for accounts / devices / external apps
- Handle devices and sensors CRUD
- MQTT flow triggered by HTTP operations hooks
- Dispatch MQTT payload from several protocol sources
- Modelling sensors with OMA schemas

[Swagger Explorer](https://api.aloes.io/explorer)

[Full Docs](https://aloes.frama.io/device-manager/)

REST API Server build upon :
- [NodeJS](https://nodejs.org/en/)
- [Loopback](https://loopback.io/doc/en/lb3/)
- [Mosca](https://mosca.io/)
- [Open Mobile Alliance](http://www.openmobilealliance.org/wp/OMNA/LwM2M/LwM2MRegistry.html)
- [Aloes-handlers](https://www.npmjs.com/package/aloes-handlers)

-----


## Folder structure

- /. --> Main application configuration, dependencies list, and launch scripts

- /bin --> contains some maintenance scripts - not needed yet

- /deploy --> contains environment variables ( hidden files )

- /log --> contains logs from PM2

- /storage --> contains folders where users files are stored

- /src --> contains source code
  - /. --> Loopback configuration
  - /boot --> code executed at application start
  - /initial-data --> JSON datasets to make global application running
  - /middleware --> scripts used in development/staging only
  - /mixins --> add special properties to models
  - /models --> REST API descriptions and controllers
  - /services --> external modules
  - /views --> templates used for automatic mailing


## Configuration

Edit your config in .env_sample and save it as `.env`.
You can override these by populating `deploy` with files corresponding to an environment ( eg: .env_production ... ), and via pm2 `ecosystem.config.json` .


## Installation

``` bash
  $ npm install -g pm2
  $ npm install
```


## Linting

```bash
  $ npm run lint
```


## Running the development server (REST API)

```bash
  $ npm run dev
```


## Debug

```bash
  $ DEBUG=loopback npm run dev
```

[More info...](https://loopback.io/doc/en/lb3/Setting-debug-strings.html)



## Deploying project

Please remember to update `.env` and / or `ecosystem.config.json` files to match your enviroment.

```bash
  $ npm run start
```


### You can also launch this app with pm2 :

- Access to server with SSH :

```bash
  $ ssh-keygen -f ~/.ssh/server_name -t rsa -C <email_address> -b 4096
  $ ssh-copy-id -i ~/.ssh/server_name user@server_uri
```

- Creating environment :

```bash
  $ pm2 deploy ecosystem.config.js production setup
```

- Updating environment :

```bash
  $ pm2 deploy ecosystem.config.js production update
```

Be sure to commit your changes on the right branch before each setup and update: ( master for production env, and staging for dev/staging env )

```bash
  $  git checkout master
  $  git add .
  $  git commit .
  $  git push
```
