## Modules

<dl>
<dt><a href="#module_Broker">Broker</a></dt>
<dd></dd>
<dt><a href="#module_Broker">Broker</a></dt>
<dd></dd>
<dt><a href="#module_Client">Client</a></dt>
<dd></dd>
<dt><a href="#module_Server">Server</a></dt>
<dd></dd>
</dl>

<a name="module_Broker"></a>

## Broker

* [Broker](#module_Broker)
    * _static_
        * [.start(app)](#module_Broker.start) ⇒ <code>object</code>
        * [.stop(app)](#module_Broker.stop) ⇒ <code>boolean</code>
        * [.init()](#module_Broker.init) ⇒ <code>function</code>
        * [.start(app)](#module_Broker.start) ⇒ <code>object</code>
        * [.stop(app)](#module_Broker.stop) ⇒ <code>boolean</code>
        * [.init(app, httpServer, conf)](#module_Broker.init) ⇒ <code>function</code>
    * _inner_
        * [~authenticate(client, [username], [password], cb)](#module_Broker..authenticate) ⇒ <code>function</code>
        * [~authorizePublish(client, packet, cb)](#module_Broker..authorizePublish) ⇒ <code>function</code>
        * [~authorizeSubscribe(client, sub, cb)](#module_Broker..authorizeSubscribe) ⇒ <code>function</code>
        * [~authenticate(client, [username], [password], cb)](#module_Broker..authenticate) ⇒ <code>function</code>
        * [~authorizePublish(client, packet, cb)](#module_Broker..authorizePublish) ⇒ <code>function</code>
        * [~authorizeSubscribe(client, sub, cb)](#module_Broker..authorizeSubscribe) ⇒ <code>function</code>
        * [~updateModelsStatus(client, status)](#module_Broker..updateModelsStatus)
        * [~findPattern(packet, client)](#module_Broker..findPattern) ⇒ <code>object</code>
        * [~redirectMessage(packet, pattern)](#module_Broker..redirectMessage) ⇒ <code>string</code>
        * ["client" (client)](#event_client) ⇒ <code>functions</code>
        * ["clientDisconnect" (client)](#event_clientDisconnect) ⇒ <code>functions</code>
        * ["keepaliveTimeout" (client)](#event_keepaliveTimeout) ⇒ <code>functions</code>
        * ["published" (packet, client)](#event_published)
        * ["client" (client)](#event_client) ⇒ <code>functions</code>
        * ["clientDisconnect" (client)](#event_clientDisconnect) ⇒ <code>functions</code>
        * ["keepaliveTimeout" (client)](#event_keepaliveTimeout) ⇒ <code>functions</code>
        * ["published" (packet, client)](#event_published)

<a name="module_Broker.start"></a>

### Broker.start(app) ⇒ <code>object</code>
Setup broker functions

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - app.broker  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.stop"></a>

### Broker.stop(app) ⇒ <code>boolean</code>
Stop broker and update models status

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.init"></a>

### Broker.init() ⇒ <code>function</code>
Init MQTT Broker with new Aedes instance

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - broker.start  
<a name="module_Broker.start"></a>

### Broker.start(app) ⇒ <code>object</code>
Setup broker functions

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - app.broker  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.stop"></a>

### Broker.stop(app) ⇒ <code>boolean</code>
Stop broker and update models status

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.init"></a>

### Broker.init(app, httpServer, conf) ⇒ <code>function</code>
Init MQTT Broker with new Aedes instance

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - broker.start  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| httpServer | <code>object</code> | HTTP server to attach for websockets support |
| conf | <code>object</code> | Env varirables |

<a name="module_Broker..authenticate"></a>

### Broker~authenticate(client, [username], [password], cb) ⇒ <code>function</code>
Aedes authentification callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| [username] | <code>string</code> | MQTT username |
| [password] | <code>object</code> | MQTT password |
| cb | <code>function</code> | callback |

<a name="module_Broker..authorizePublish"></a>

### Broker~authorizePublish(client, packet, cb) ⇒ <code>function</code>
Aedes publish authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="module_Broker..authorizeSubscribe"></a>

### Broker~authorizeSubscribe(client, sub, cb) ⇒ <code>function</code>
Aedes subscribe authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| sub | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="module_Broker..authenticate"></a>

### Broker~authenticate(client, [username], [password], cb) ⇒ <code>function</code>
Aedes authentification callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| [username] | <code>string</code> | MQTT username |
| [password] | <code>object</code> | MQTT password |
| cb | <code>function</code> | callback |

<a name="module_Broker..authorizePublish"></a>

### Broker~authorizePublish(client, packet, cb) ⇒ <code>function</code>
Aedes publish authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="module_Broker..authorizeSubscribe"></a>

### Broker~authorizeSubscribe(client, sub, cb) ⇒ <code>function</code>
Aedes subscribe authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| sub | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="module_Broker..updateModelsStatus"></a>

### Broker~updateModelsStatus(client, status)
Update models status from MQTT conection status and client properties

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT conection status |

<a name="module_Broker..findPattern"></a>

### Broker~findPattern(packet, client) ⇒ <code>object</code>
Retrieve pattern from packet.topic

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Broker..redirectMessage"></a>

### Broker~redirectMessage(packet, pattern) ⇒ <code>string</code>
Redirect parsed message to corresponding Loopback model || device

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>string</code> - serviceName  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| pattern | <code>object</code> | IoTAgent retireved pattern |

<a name="event_client"></a>

### "client" (client) ⇒ <code>functions</code>
On client connected to Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_clientDisconnect"></a>

### "clientDisconnect" (client) ⇒ <code>functions</code>
On client disconnected from Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_keepaliveTimeout"></a>

### "keepaliveTimeout" (client) ⇒ <code>functions</code>
When client keep alive timeout

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_published"></a>

### "published" (packet, client)
On message published to Mosca broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="event_client"></a>

### "client" (client) ⇒ <code>functions</code>
On client connected to Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_clientDisconnect"></a>

### "clientDisconnect" (client) ⇒ <code>functions</code>
On client disconnecting from Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_keepaliveTimeout"></a>

### "keepaliveTimeout" (client) ⇒ <code>functions</code>
When client keep alive timeout

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_published"></a>

### "published" (packet, client)
On message published to Mosca broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Broker"></a>

## Broker

* [Broker](#module_Broker)
    * _static_
        * [.start(app)](#module_Broker.start) ⇒ <code>object</code>
        * [.stop(app)](#module_Broker.stop) ⇒ <code>boolean</code>
        * [.init()](#module_Broker.init) ⇒ <code>function</code>
        * [.start(app)](#module_Broker.start) ⇒ <code>object</code>
        * [.stop(app)](#module_Broker.stop) ⇒ <code>boolean</code>
        * [.init(app, httpServer, conf)](#module_Broker.init) ⇒ <code>function</code>
    * _inner_
        * [~authenticate(client, [username], [password], cb)](#module_Broker..authenticate) ⇒ <code>function</code>
        * [~authorizePublish(client, packet, cb)](#module_Broker..authorizePublish) ⇒ <code>function</code>
        * [~authorizeSubscribe(client, sub, cb)](#module_Broker..authorizeSubscribe) ⇒ <code>function</code>
        * [~authenticate(client, [username], [password], cb)](#module_Broker..authenticate) ⇒ <code>function</code>
        * [~authorizePublish(client, packet, cb)](#module_Broker..authorizePublish) ⇒ <code>function</code>
        * [~authorizeSubscribe(client, sub, cb)](#module_Broker..authorizeSubscribe) ⇒ <code>function</code>
        * [~updateModelsStatus(client, status)](#module_Broker..updateModelsStatus)
        * [~findPattern(packet, client)](#module_Broker..findPattern) ⇒ <code>object</code>
        * [~redirectMessage(packet, pattern)](#module_Broker..redirectMessage) ⇒ <code>string</code>
        * ["client" (client)](#event_client) ⇒ <code>functions</code>
        * ["clientDisconnect" (client)](#event_clientDisconnect) ⇒ <code>functions</code>
        * ["keepaliveTimeout" (client)](#event_keepaliveTimeout) ⇒ <code>functions</code>
        * ["published" (packet, client)](#event_published)
        * ["client" (client)](#event_client) ⇒ <code>functions</code>
        * ["clientDisconnect" (client)](#event_clientDisconnect) ⇒ <code>functions</code>
        * ["keepaliveTimeout" (client)](#event_keepaliveTimeout) ⇒ <code>functions</code>
        * ["published" (packet, client)](#event_published)

<a name="module_Broker.start"></a>

### Broker.start(app) ⇒ <code>object</code>
Setup broker functions

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - app.broker  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.stop"></a>

### Broker.stop(app) ⇒ <code>boolean</code>
Stop broker and update models status

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.init"></a>

### Broker.init() ⇒ <code>function</code>
Init MQTT Broker with new Aedes instance

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - broker.start  
<a name="module_Broker.start"></a>

### Broker.start(app) ⇒ <code>object</code>
Setup broker functions

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - app.broker  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.stop"></a>

### Broker.stop(app) ⇒ <code>boolean</code>
Stop broker and update models status

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.init"></a>

### Broker.init(app, httpServer, conf) ⇒ <code>function</code>
Init MQTT Broker with new Aedes instance

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - broker.start  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| httpServer | <code>object</code> | HTTP server to attach for websockets support |
| conf | <code>object</code> | Env varirables |

<a name="module_Broker..authenticate"></a>

### Broker~authenticate(client, [username], [password], cb) ⇒ <code>function</code>
Aedes authentification callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| [username] | <code>string</code> | MQTT username |
| [password] | <code>object</code> | MQTT password |
| cb | <code>function</code> | callback |

<a name="module_Broker..authorizePublish"></a>

### Broker~authorizePublish(client, packet, cb) ⇒ <code>function</code>
Aedes publish authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="module_Broker..authorizeSubscribe"></a>

### Broker~authorizeSubscribe(client, sub, cb) ⇒ <code>function</code>
Aedes subscribe authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| sub | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="module_Broker..authenticate"></a>

### Broker~authenticate(client, [username], [password], cb) ⇒ <code>function</code>
Aedes authentification callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| [username] | <code>string</code> | MQTT username |
| [password] | <code>object</code> | MQTT password |
| cb | <code>function</code> | callback |

<a name="module_Broker..authorizePublish"></a>

### Broker~authorizePublish(client, packet, cb) ⇒ <code>function</code>
Aedes publish authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="module_Broker..authorizeSubscribe"></a>

### Broker~authorizeSubscribe(client, sub, cb) ⇒ <code>function</code>
Aedes subscribe authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| sub | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="module_Broker..updateModelsStatus"></a>

### Broker~updateModelsStatus(client, status)
Update models status from MQTT conection status and client properties

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT conection status |

<a name="module_Broker..findPattern"></a>

### Broker~findPattern(packet, client) ⇒ <code>object</code>
Retrieve pattern from packet.topic

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Broker..redirectMessage"></a>

### Broker~redirectMessage(packet, pattern) ⇒ <code>string</code>
Redirect parsed message to corresponding Loopback model || device

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>string</code> - serviceName  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| pattern | <code>object</code> | IoTAgent retireved pattern |

<a name="event_client"></a>

### "client" (client) ⇒ <code>functions</code>
On client connected to Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_clientDisconnect"></a>

### "clientDisconnect" (client) ⇒ <code>functions</code>
On client disconnected from Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_keepaliveTimeout"></a>

### "keepaliveTimeout" (client) ⇒ <code>functions</code>
When client keep alive timeout

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_published"></a>

### "published" (packet, client)
On message published to Mosca broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="event_client"></a>

### "client" (client) ⇒ <code>functions</code>
On client connected to Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_clientDisconnect"></a>

### "clientDisconnect" (client) ⇒ <code>functions</code>
On client disconnecting from Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_keepaliveTimeout"></a>

### "keepaliveTimeout" (client) ⇒ <code>functions</code>
When client keep alive timeout

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>functions</code> - updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_published"></a>

### "published" (packet, client)
On message published to Mosca broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Client"></a>

## Client

* [Client](#module_Client)
    * [~updateModelsStatus(client, status)](#module_Client..updateModelsStatus)
    * [~findPattern(packet, client)](#module_Client..findPattern) ⇒ <code>object</code>
    * [~redirectMessage(packet, pattern)](#module_Client..redirectMessage) ⇒ <code>string</code>

<a name="module_Client..updateModelsStatus"></a>

### Client~updateModelsStatus(client, status)
Update models status from MQTT conection status and client properties

**Kind**: inner method of [<code>Client</code>](#module_Client)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT conection status |

<a name="module_Client..findPattern"></a>

### Client~findPattern(packet, client) ⇒ <code>object</code>
Retrieve pattern from packet.topic

**Kind**: inner method of [<code>Client</code>](#module_Client)  
**Returns**: <code>object</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Client..redirectMessage"></a>

### Client~redirectMessage(packet, pattern) ⇒ <code>string</code>
Redirect parsed message to corresponding Loopback model || device

**Kind**: inner method of [<code>Client</code>](#module_Client)  
**Returns**: <code>string</code> - serviceName  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| pattern | <code>object</code> | IoTAgent retireved pattern |

<a name="module_Server"></a>

## Server

* [Server](#module_Server)
    * [.start(config)](#module_Server.start) ⇒ <code>object</code>
    * [.stop()](#module_Server.stop)
    * [.publish()](#module_Server.publish)
    * [.init(config)](#module_Server.init)

<a name="module_Server.start"></a>

### Server.start(config) ⇒ <code>object</code>
Init HTTP server with new Loopback instance

Init external services ( MQTT broker )

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Returns**: <code>object</code> - httpServer  
**Emits**: <code>module:app.event:started</code>  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="module_Server.stop"></a>

### Server.stop()
Close the app and services

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Emits**: <code>module:app.event:stopped</code>  
<a name="module_Server.publish"></a>

### Server.publish()
Emit publish event

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Emits**: <code>module:app.event:publish</code>  
<a name="module_Server.init"></a>

### Server.init(config)
Bootstrap the application, configure models, datasources and middleware.

**Kind**: static method of [<code>Server</code>](#module_Server)  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

