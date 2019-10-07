## Modules

<dl>
<dt><a href="#module_Broker">Broker</a></dt>
<dd></dd>
<dt><a href="#module_Mails">Mails</a></dt>
<dd></dd>
<dt><a href="#module_MQTTClient">MQTTClient</a></dt>
<dd></dd>
<dt><a href="#module_RoleManager">RoleManager</a></dt>
<dd></dd>
<dt><a href="#module_Server">Server</a></dt>
<dd></dd>
</dl>

<a name="module_Broker"></a>

## Broker

* [Broker](#module_Broker)
    * _static_
        * [.getClients([id])](#module_Broker.getClients) ⇒ <code>array</code> \| <code>object</code>
        * [.getClientsByTopic(topic)](#module_Broker.getClientsByTopic) ⇒ <code>promise</code>
        * [.cleanSubscriptions(client)](#module_Broker.cleanSubscriptions) ⇒ <code>promise</code>
        * [.start()](#module_Broker.start) ⇒ <code>boolean</code>
        * [.stop()](#module_Broker.stop) ⇒ <code>boolean</code>
        * [.init()](#module_Broker.init) ⇒ <code>function</code>
    * _inner_
        * [~persistence(config)](#module_Broker..persistence) ⇒ <code>function</code>
        * [~emitter(config)](#module_Broker..emitter) ⇒ <code>function</code>
        * [~getClient(client)](#module_Broker..getClient) ⇒ <code>object</code>
        * [~pickRandomClient(clientIds, attempts)](#module_Broker..pickRandomClient) ⇒ <code>object</code>
        * [~authentificationRequest(data)](#module_Broker..authentificationRequest) ⇒ <code>promise</code>
        * ["published" (packet, client)](#event_published)
        * ["client" (client)](#event_client)
        * ["clientDisconnect" (client)](#event_clientDisconnect) ⇒ <code>function</code>
        * ["keepaliveTimeout" (client)](#event_keepaliveTimeout)

<a name="module_Broker.getClients"></a>

### Broker.getClients([id]) ⇒ <code>array</code> \| <code>object</code>
Find clients connected to the broker

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| [id] | <code>string</code> | Client id |

<a name="module_Broker.getClientsByTopic"></a>

### Broker.getClientsByTopic(topic) ⇒ <code>promise</code>
Find in cache client ids subscribed to a specific topic pattern

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| topic | <code>string</code> | Topic pattern |

<a name="module_Broker.cleanSubscriptions"></a>

### Broker.cleanSubscriptions(client) ⇒ <code>promise</code>
Remove subscriptions for a specific client

**Kind**: static method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="module_Broker.start"></a>

### Broker.start() ⇒ <code>boolean</code>
Setup broker connection

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>boolean</code> - status  
<a name="module_Broker.stop"></a>

### Broker.stop() ⇒ <code>boolean</code>
Stop broker and update models status

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
<a name="module_Broker.init"></a>

### Broker.init() ⇒ <code>function</code>
Init MQTT Broker with new Aedes instance

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - broker.start  
<a name="module_Broker..persistence"></a>

### Broker~persistence(config) ⇒ <code>function</code>
Aedes persistence layer

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - aedesPersistenceRedis  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Environment variables |

<a name="module_Broker..emitter"></a>

### Broker~emitter(config) ⇒ <code>function</code>
Aedes event emitter

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - MQEmitterRedis  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Environment variables |

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
Give an array of clientIds, find a connected client

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - client  

| Param | Type | Description |
| --- | --- | --- |
| clientIds | <code>Array.&lt;string&gt;</code> | MQTT client Ids |
| attempts | <code>number</code> | Number of tryouts before returning null |

<a name="module_Broker..authentificationRequest"></a>

### Broker~authentificationRequest(data) ⇒ <code>promise</code>
HTTP request to Aloes to validate credentials

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Client instance |

<a name="event_published"></a>

### "published" (packet, client)
On message published to Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="event_client"></a>

### "client" (client)
On client connected to Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_clientDisconnect"></a>

### "clientDisconnect" (client) ⇒ <code>function</code>
On client disconnected from Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - Broker~updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_keepaliveTimeout"></a>

### "keepaliveTimeout" (client)
When client keep alive timeout

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="module_Mails"></a>

## Mails

* [Mails](#module_Mails)
    * _static_
        * [.send(options)](#module_Mails.send) ⇒ <code>object</code>
        * [.verifyEmail(user)](#module_Mails.verifyEmail) ⇒ <code>object</code>
        * [.sendResetPasswordMail(options)](#module_Mails.sendResetPasswordMail)
        * [.sendContactForm(options)](#module_Mails.sendContactForm)
    * _inner_
        * [~sendMail()](#module_Mails..sendMail) ⇒ <code>promise</code>
        * [~verifyUser()](#module_Mails..verifyUser) ⇒ <code>promise</code>

<a name="module_Mails.send"></a>

### Mails.send(options) ⇒ <code>object</code>
Generate HTML template and send email

**Kind**: static method of [<code>Mails</code>](#module_Mails)  
**Returns**: <code>object</code> - result - Mail result  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Mail options |

<a name="module_Mails.verifyEmail"></a>

### Mails.verifyEmail(user) ⇒ <code>object</code>
Sending a verification email to confirm account creation

**Kind**: static method of [<code>Mails</code>](#module_Mails)  
**Returns**: <code>object</code> - result - Mail result  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | Account created |

<a name="module_Mails.sendResetPasswordMail"></a>

### Mails.sendResetPasswordMail(options)
Sending a mail to set a new password

**Kind**: static method of [<code>Mails</code>](#module_Mails)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Mail options |

<a name="module_Mails.sendContactForm"></a>

### Mails.sendContactForm(options)
Sending a mail to admin

**Kind**: static method of [<code>Mails</code>](#module_Mails)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Mail options |

<a name="module_Mails..sendMail"></a>

### Mails~sendMail() ⇒ <code>promise</code>
Promise wrapper to send email using Email datasource

**Kind**: inner method of [<code>Mails</code>](#module_Mails)  
<a name="module_Mails..verifyUser"></a>

### Mails~verifyUser() ⇒ <code>promise</code>
Promise wrapper to send verification email after user registration

**Kind**: inner method of [<code>Mails</code>](#module_Mails)  
<a name="module_MQTTClient"></a>

## MQTTClient

* [MQTTClient](#module_MQTTClient)
    * _static_
        * [.publish(topic, payload)](#module_MQTTClient.publish) ⇒ <code>boolean</code>
        * ["start"](#module_MQTTClient.event_start) ⇒ <code>function</code>
        * ["init" (app, config)](#module_MQTTClient.event_init) ⇒ <code>function</code>
        * ["stop"](#module_MQTTClient.event_stop) ⇒ <code>function</code>
    * _inner_
        * [~updateModelsStatus(app, client, status)](#module_MQTTClient..updateModelsStatus)
        * [~findPattern(app, packet, client)](#module_MQTTClient..findPattern) ⇒ <code>object</code>
        * [~redirectMessage(packet, pattern)](#module_MQTTClient..redirectMessage) ⇒ <code>string</code>
        * [~onStatus(app, topic, payload)](#module_MQTTClient..onStatus) ⇒ <code>function</code>
        * [~onReceive(app, topic, payload)](#module_MQTTClient..onReceive)
        * [~onMessage(app, topic, payload)](#module_MQTTClient..onMessage) ⇒ <code>functions</code> \| <code>functions</code>
        * [~startClient(clientId)](#module_MQTTClient..startClient)
        * [~initClient(app, config)](#module_MQTTClient..initClient) ⇒ <code>boolean</code>
        * [~stopClient()](#module_MQTTClient..stopClient) ⇒ <code>boolean</code>

<a name="module_MQTTClient.publish"></a>

### MQTTClient.publish(topic, payload) ⇒ <code>boolean</code>
Convert payload and topic before publish

**Kind**: static method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>boolean</code> - status  

| Param | Type | Description |
| --- | --- | --- |
| topic | <code>string</code> | Packet topic |
| payload | <code>any</code> | Packet payload |

<a name="module_MQTTClient.event_start"></a>

### "start" ⇒ <code>function</code>
Event reporting that MQTTClient has to start.

**Kind**: event emitted by [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>function</code> - MQTTClient~startClient  
<a name="module_MQTTClient.event_init"></a>

### "init" (app, config) ⇒ <code>function</code>
Event reporting that MQTTClient has to init.

**Kind**: event emitted by [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>function</code> - MQTTClient~initClient  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| config | <code>object</code> | Formatted config. |

<a name="module_MQTTClient.event_stop"></a>

### "stop" ⇒ <code>function</code>
Event reporting that MQTTClient has to stop.

**Kind**: event emitted by [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>function</code> - MQTTClient~stopClient  
<a name="module_MQTTClient..updateModelsStatus"></a>

### MQTTClient~updateModelsStatus(app, client, status)
Update models status from MQTT connection status and client properties

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

### MQTTClient~onStatus(app, topic, payload) ⇒ <code>function</code>
Called when status message has been detected

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>function</code> - module:MQTTClient~updateModelsStatus  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| topic | <code>object</code> | MQTT topic |
| payload | <code>object</code> | MQTT payload |

<a name="module_MQTTClient..onReceive"></a>

### MQTTClient~onReceive(app, topic, payload)
Called when message arrived from the broker to be redirected to the right Model

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Emits**: <code>Application.event:publish</code>, <code>Device.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| topic | <code>object</code> | MQTT topic |
| payload | <code>object</code> | MQTT payload |

<a name="module_MQTTClient..onMessage"></a>

### MQTTClient~onMessage(app, topic, payload) ⇒ <code>functions</code> \| <code>functions</code>
Parse the message arriving from the broker

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>functions</code> - MQTTClient~onStatus<code>functions</code> - MQTTClient~onReceive  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| topic | <code>object</code> | MQTT topic |
| payload | <code>object</code> | MQTT payload |

<a name="module_MQTTClient..startClient"></a>

### MQTTClient~startClient(clientId)
Setup MQTT client listeners

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  

| Param | Type | Description |
| --- | --- | --- |
| clientId | <code>string</code> | MQTT clientId |

<a name="module_MQTTClient..initClient"></a>

### MQTTClient~initClient(app, config) ⇒ <code>boolean</code>
Setup MQTT client connection

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>boolean</code> - status  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| config | <code>object</code> | Environment variables |

<a name="module_MQTTClient..stopClient"></a>

### MQTTClient~stopClient() ⇒ <code>boolean</code>
Stop MQTT client and unsubscribe

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>boolean</code> - status  
<a name="module_RoleManager"></a>

## RoleManager
<a name="module_Server"></a>

## Server

* [Server](#module_Server)
    * _static_
        * [.start(config)](#module_Server.start) ⇒ <code>boolean</code>
        * [.stop(signal)](#module_Server.stop) ⇒ <code>boolean</code>
        * [.publish()](#module_Server.publish) ⇒ <code>function</code>
        * [.init(config)](#module_Server.init)
    * _inner_
        * ["started" (config)](#event_started) ⇒ <code>function</code>
        * ["started" (state)](#event_started) ⇒ <code>function</code>
        * ["stop" (signal)](#event_stop) ⇒ <code>function</code>

<a name="module_Server.start"></a>

### Server.start(config) ⇒ <code>boolean</code>
Init HTTP server with new Loopback instance

Init external services ( MQTT broker )

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Emits**: <code>Server.event:started</code>, <code>MQTTClient.event:start</code>, <code>Scheduler.event:started</code>  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="module_Server.stop"></a>

### Server.stop(signal) ⇒ <code>boolean</code>
Close the app and services

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Emits**: <code>MQTTClient.event:stop</code>, <code>Scheduler.event:stopped</code>, <code>Application.event:stopped</code>, <code>Device.event:stopped</code>, <code>Client.event:stopped</code>  

| Param | Type | Description |
| --- | --- | --- |
| signal | <code>string</code> | process signal |

<a name="module_Server.publish"></a>

### Server.publish() ⇒ <code>function</code>
Emit publish event

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Returns**: <code>function</code> - MQTTClient.publish  
<a name="module_Server.init"></a>

### Server.init(config)
Bootstrap the application, configure models, datasources and middleware.

**Kind**: static method of [<code>Server</code>](#module_Server)  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="event_started"></a>

### "started" (config) ⇒ <code>function</code>
Event reporting that the application and all subservices should start.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>function</code> - Server.init  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="event_started"></a>

### "started" (state) ⇒ <code>function</code>
Event reporting that the application and all subservices have started.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>function</code> - Server.start  

| Param | Type | Description |
| --- | --- | --- |
| state | <code>boolean</code> | application state |

<a name="event_stop"></a>

### "stop" (signal) ⇒ <code>function</code>
Event reporting that the application and all subservice should stop.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>function</code> - Server.stop  

| Param | Type | Description |
| --- | --- | --- |
| signal | <code>string</code> | process signal |

