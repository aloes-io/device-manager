## Modules

<dl>
<dt><a href="#module_Broker">Broker</a></dt>
<dd></dd>
<dt><a href="#module_MQTTClient">MQTTClient</a></dt>
<dd></dd>
<dt><a href="#module_Server">Server</a></dt>
<dd></dd>
</dl>

<a name="module_Broker"></a>

## Broker

* [Broker](#module_Broker)
    * _static_
        * [.getClients([id])](#module_Broker.getClients) ⇒ <code>array</code> \| <code>object</code>
        * [.getClientsByTopic(topic)](#module_Broker.getClientsByTopic) ⇒ <code>Promise</code>
        * [.cleanSubscriptions(client)](#module_Broker.cleanSubscriptions) ⇒ <code>Promise</code>
        * [.start(app)](#module_Broker.start) ⇒ <code>boolean</code>
        * [.stop()](#module_Broker.stop) ⇒ <code>boolean</code>
        * [.init()](#module_Broker.init) ⇒ <code>function</code>
    * _inner_
        * [~getClient(client)](#module_Broker..getClient) ⇒ <code>object</code>
        * [~pickRandomClient(clientIds, attempts)](#module_Broker..pickRandomClient) ⇒ <code>object</code>
        * [~authentificationRequest(data)](#module_Broker..authentificationRequest) ⇒ <code>Promise</code>
        * [~authenticate(client, [username], [password], cb)](#module_Broker..authenticate) ⇒ <code>function</code>
        * [~authorizePublish(client, packet, cb)](#module_Broker..authorizePublish) ⇒ <code>function</code>
        * [~authorizeSubscribe(client, packet, cb)](#module_Broker..authorizeSubscribe) ⇒ <code>function</code>
        * ["published" (packet, client)](#event_published)
        * ["client" (client)](#event_client) ⇒ <code>functions</code>
        * ["clientDisconnect" (client)](#event_clientDisconnect) ⇒ <code>functions</code>
        * ["keepaliveTimeout" (client)](#event_keepaliveTimeout) ⇒ <code>functions</code>

<a name="module_Broker.getClients"></a>

### Broker.getClients([id]) ⇒ <code>array</code> \| <code>object</code>
Find in cache clients subscribed to a specific topic pattern

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| [id] | <code>string</code> | Client id |

<a name="module_Broker.getClientsByTopic"></a>

### Broker.getClientsByTopic(topic) ⇒ <code>Promise</code>
Find in cache client ids subscribed to a specific topic pattern

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| topic | <code>string</code> | Topic pattern |

<a name="module_Broker.cleanSubscriptions"></a>

### Broker.cleanSubscriptions(client) ⇒ <code>Promise</code>
Remove subscriptions for a specific client

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="module_Broker.start"></a>

### Broker.start(app) ⇒ <code>boolean</code>
Setup broker connection

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>boolean</code> - status  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |

<a name="module_Broker.stop"></a>

### Broker.stop() ⇒ <code>boolean</code>
Stop broker and update models status

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
<a name="module_Broker.init"></a>

### Broker.init() ⇒ <code>function</code>
Init MQTT Broker with new Aedes instance

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - broker.start  
<a name="module_Broker..getClient"></a>

### Broker~getClient(client) ⇒ <code>object</code>
Transform circular MQTT client in JSON

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - client  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="module_Broker..pickRandomClient"></a>

### Broker~pickRandomClient(clientIds, attempts) ⇒ <code>object</code>
Give a range of clientIds, find a connected client

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - client  

| Param | Type | Description |
| --- | --- | --- |
| clientIds | <code>Array.&lt;string&gt;</code> | MQTT client Ids |
| attempts | <code>number</code> | Number of tryouts before returning null |

<a name="module_Broker..authentificationRequest"></a>

### Broker~authentificationRequest(data) ⇒ <code>Promise</code>
HTTP request to Aloes to validate credentials

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Client instance |

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

### Broker~authorizeSubscribe(client, packet, cb) ⇒ <code>function</code>
Aedes subscribe authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |
| cb | <code>function</code> | callback |

<a name="event_published"></a>

### "published" (packet, client)
On message published to Aedes broker

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

<a name="module_MQTTClient"></a>

## MQTTClient

* [MQTTClient](#module_MQTTClient)
    * _static_
        * [.init(app, config)](#module_MQTTClient.init) ⇒ <code>boolean</code>
        * [.publish(topic, payload)](#module_MQTTClient.publish) ⇒ <code>boolean</code>
        * [.stop()](#module_MQTTClient.stop) ⇒ <code>boolean</code>
    * _inner_
        * [~updateModelsStatus(app, client, status)](#module_MQTTClient..updateModelsStatus)
        * [~findPattern(app, packet, client)](#module_MQTTClient..findPattern) ⇒ <code>object</code>
        * [~redirectMessage(packet, pattern)](#module_MQTTClient..redirectMessage) ⇒ <code>string</code>
        * [~onStatus(app, topic, payload)](#module_MQTTClient..onStatus) ⇒ <code>functions</code>
        * [~onReceive(app, topic, payload)](#module_MQTTClient..onReceive)
        * [~onMessage(app, topic, payload)](#module_MQTTClient..onMessage) ⇒ <code>functions</code> \| <code>functions</code>

<a name="module_MQTTClient.init"></a>

### MQTTClient.init(app, config) ⇒ <code>boolean</code>
Setup MQTT client connection

**Kind**: static method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>boolean</code> - status  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| config | <code>object</code> | Environment variables |

<a name="module_MQTTClient.publish"></a>

### MQTTClient.publish(topic, payload) ⇒ <code>boolean</code>
Convert payload and topic before publish

**Kind**: static method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>boolean</code> - status  

| Param | Type | Description |
| --- | --- | --- |
| topic | <code>string</code> | Packet topic |
| payload | <code>any</code> | Packet payload |

<a name="module_MQTTClient.stop"></a>

### MQTTClient.stop() ⇒ <code>boolean</code>
Stop MQTT client and unsubscribe

**Kind**: static method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>boolean</code> - status  
<a name="module_MQTTClient..updateModelsStatus"></a>

### MQTTClient~updateModelsStatus(app, client, status)
Update models status from MQTT conection status and client properties

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT conection status |

<a name="module_MQTTClient..findPattern"></a>

### MQTTClient~findPattern(app, packet, client) ⇒ <code>object</code>
Retrieve pattern from packet.topic

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>object</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_MQTTClient..redirectMessage"></a>

### MQTTClient~redirectMessage(packet, pattern) ⇒ <code>string</code>
Redirect parsed message to corresponding Loopback model || device

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>string</code> - serviceName  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| pattern | <code>object</code> | IoTAgent retireved pattern |

<a name="module_MQTTClient..onStatus"></a>

### MQTTClient~onStatus(app, topic, payload) ⇒ <code>functions</code>
Called when status message has been detected

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>functions</code> - module:MQTTClient~updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| topic | <code>object</code> | MQTT topic |
| payload | <code>object</code> | MQTT payload |

<a name="module_MQTTClient..onReceive"></a>

### MQTTClient~onReceive(app, topic, payload)
Called when message arrived from the broker to be redirected to the right Model

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Emits**: <code>event:{functions} publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| topic | <code>object</code> | MQTT topic |
| payload | <code>object</code> | MQTT payload |

<a name="module_MQTTClient..onMessage"></a>

### MQTTClient~onMessage(app, topic, payload) ⇒ <code>functions</code> \| <code>functions</code>
Parse the message arriving from the broker

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>functions</code> - module:MQTTClient~onStatus<code>functions</code> - module:MQTTClient~onReceive  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| topic | <code>object</code> | MQTT topic |
| payload | <code>object</code> | MQTT payload |

<a name="module_Server"></a>

## Server

* [Server](#module_Server)
    * _static_
        * [.start(config)](#module_Server.start) ⇒ <code>object</code>
        * [.stop(signal)](#module_Server.stop)
        * [.publish()](#module_Server.publish) ⇒ <code>function</code>
        * [.init(config)](#module_Server.init)
    * _inner_
        * ["started" (config)](#event_started) ⇒ <code>functions</code>
        * ["started" (state)](#event_started) ⇒ <code>functions</code>
        * ["stop" (signal)](#event_stop) ⇒ <code>functions</code>

<a name="module_Server.start"></a>

### Server.start(config) ⇒ <code>object</code>
Init HTTP server with new Loopback instance

Init external services ( MQTT broker )

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Returns**: <code>object</code> - httpServer  
**Emits**: <code>module:Server.event:started</code>  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="module_Server.stop"></a>

### Server.stop(signal)
Close the app and services

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Emits**: <code>module:Scheduler.event:stopped</code>, <code>module:Application.event:stopped</code>, <code>module:Device.event:stopped</code>, <code>module:Client.event:stopped</code>  

| Param | Type | Description |
| --- | --- | --- |
| signal | <code>string</code> | process signal |

<a name="module_Server.publish"></a>

### Server.publish() ⇒ <code>function</code>
Emit publish event

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Returns**: <code>function</code> - module:MQTTClient.publish  
<a name="module_Server.init"></a>

### Server.init(config)
Bootstrap the application, configure models, datasources and middleware.

**Kind**: static method of [<code>Server</code>](#module_Server)  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="event_started"></a>

### "started" (config) ⇒ <code>functions</code>
Event reporting that the application and all subservices should start.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>functions</code> - Server.init(config)  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="event_started"></a>

### "started" (state) ⇒ <code>functions</code>
Event reporting that the application and all subservices have started.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>functions</code> - Server.stop()  

| Param | Type | Description |
| --- | --- | --- |
| state | <code>boolean</code> | application state |

<a name="event_stop"></a>

### "stop" (signal) ⇒ <code>functions</code>
Event reporting that the application and all subservice should stop.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>functions</code> - Server.stop()  

| Param | Type | Description |
| --- | --- | --- |
| signal | <code>string</code> | process signal |

