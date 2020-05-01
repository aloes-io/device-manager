## Modules

<dl>
<dt><a href="#module_Broker">Broker</a></dt>
<dd></dd>
<dt><a href="#module_Mails">Mails</a></dt>
<dd></dd>
<dt><a href="#module_MQTTClient">MQTTClient</a></dt>
<dd></dd>
<dt><a href="#module_rateLimiter">rateLimiter</a></dt>
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
        * [.publish(packet)](#module_Broker.publish) ⇒ <code>function</code>
        * [.start()](#module_Broker.start) ⇒ <code>boolean</code>
        * [.stop()](#module_Broker.stop) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.init()](#module_Broker.init) ⇒ <code>function</code>
    * _inner_
        * [~preConnect(client, cb)](#module_Broker..preConnect) ⇒ <code>cb</code>
        * [~authenticate(client, [username], [password], cb)](#module_Broker..authenticate) ⇒ <code>aedesCallback</code>
        * [~authorizePublish(client, packet, cb)](#module_Broker..authorizePublish) ⇒ <code>aedesCallback</code>
        * [~authorizeSubscribe(client, packet, cb)](#module_Broker..authorizeSubscribe) ⇒ <code>aedesCallback</code>
        * [~published(packet, client, cb)](#module_Broker..published) ⇒ <code>aedesCallback</code>
        * [~persistence(config)](#module_Broker..persistence) ⇒ <code>function</code>
        * [~emitter(config)](#module_Broker..emitter) ⇒ <code>function</code>
        * [~initServers(brokerInterfaces, brokerInstance)](#module_Broker..initServers) ⇒ <code>object</code>
        * [~getClientProps(client)](#module_Broker..getClientProps) ⇒ <code>object</code>
        * [~getClients(broker, [id])](#module_Broker..getClients) ⇒ <code>array</code> \| <code>object</code>
        * [~getClientsByTopic(broker, topic)](#module_Broker..getClientsByTopic) ⇒ <code>Promise.&lt;array&gt;</code>
        * [~pickRandomClient(broker, clientIds)](#module_Broker..pickRandomClient) ⇒ <code>object</code>
        * [~authentificationRequest(credentials)](#module_Broker..authentificationRequest) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onAuthenticate(client, [username], [password])](#module_Broker..onAuthenticate) ⇒ <code>Promise.&lt;number&gt;</code>
        * [~onAuthorizePublish(client, packet)](#module_Broker..onAuthorizePublish) ⇒ <code>boolean</code>
        * [~onAuthorizeSubscribe(client, packet)](#module_Broker..onAuthorizeSubscribe) ⇒ <code>boolean</code>
        * [~updateClientStatus(broker, client, status)](#module_Broker..updateClientStatus) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onInternalPublished(broker, packet)](#module_Broker..onInternalPublished) ⇒ <code>object</code>
        * [~onExternalPublished(broker, packet, client)](#module_Broker..onExternalPublished) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onPublished(broker, packet, client)](#module_Broker..onPublished) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
        * ["client" (client)](#event_client) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["clientDisconnect" (client)](#event_clientDisconnect) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["keepaliveTimeout" (client)](#event_keepaliveTimeout)
        * ["clientError" (client, err)](#event_clientError)
        * ["clientError" (client, err)](#event_clientError)
        * ["ack" (packet, client)](#event_ack)
        * [~aedesCallback](#module_Broker..aedesCallback) : <code>function</code>

<a name="module_Broker.publish"></a>

### Broker.publish(packet) ⇒ <code>function</code>
Convert payload before publish

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - broker.instance.publish  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT Packet |

<a name="module_Broker.start"></a>

### Broker.start() ⇒ <code>boolean</code>
Setup broker connection

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>boolean</code> - status  
<a name="module_Broker.stop"></a>

### Broker.stop() ⇒ <code>Promise.&lt;boolean&gt;</code>
Stop broker and update models status

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
<a name="module_Broker.init"></a>

### Broker.init() ⇒ <code>function</code>
Init MQTT and WS Broker with new Aedes instance

**Kind**: static method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - broker.start  
<a name="module_Broker..preConnect"></a>

### Broker~preConnect(client, cb) ⇒ <code>cb</code>
Aedes preConnect hook

Check client connection details

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| cb | <code>aedesCallback</code> |  |

<a name="module_Broker..authenticate"></a>

### Broker~authenticate(client, [username], [password], cb) ⇒ <code>aedesCallback</code>
Aedes authentification hook

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| [username] | <code>string</code> | MQTT username |
| [password] | <code>object</code> | MQTT password |
| cb | <code>aedesCallback</code> |  |

<a name="module_Broker..authorizePublish"></a>

### Broker~authorizePublish(client, packet, cb) ⇒ <code>aedesCallback</code>
Aedes publish authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |
| cb | <code>aedesCallback</code> |  |

<a name="module_Broker..authorizeSubscribe"></a>

### Broker~authorizeSubscribe(client, packet, cb) ⇒ <code>aedesCallback</code>
Aedes subscribe authorization callback

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |
| cb | <code>aedesCallback</code> |  |

<a name="module_Broker..published"></a>

### Broker~published(packet, client, cb) ⇒ <code>aedesCallback</code>
Aedes publised hook

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |
| cb | <code>aedesCallback</code> |  |

<a name="module_Broker..persistence"></a>

### Broker~persistence(config) ⇒ <code>function</code>
Aedes persistence layer

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - aedesPersistence | aedesPersistenceRedis  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Environment variables |

<a name="module_Broker..emitter"></a>

### Broker~emitter(config) ⇒ <code>function</code>
Aedes event emitter

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>function</code> - MQEmitter | MQEmitterRedis  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Environment variables |

<a name="module_Broker..initServers"></a>

### Broker~initServers(brokerInterfaces, brokerInstance) ⇒ <code>object</code>
Initialize servers that will be attached to Broker instance

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - tcpServer, wsServer  

| Param | Type |
| --- | --- |
| brokerInterfaces | <code>object</code> | 
| brokerInstance | <code>object</code> | 

<a name="module_Broker..getClientProps"></a>

### Broker~getClientProps(client) ⇒ <code>object</code>
Transform circular MQTT client in JSON

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - client  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="module_Broker..getClients"></a>

### Broker~getClients(broker, [id]) ⇒ <code>array</code> \| <code>object</code>
Find clients connected to the broker

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| broker | <code>object</code> | MQTT broker |
| [id] | <code>string</code> | Client id |

<a name="module_Broker..getClientsByTopic"></a>

### Broker~getClientsByTopic(broker, topic) ⇒ <code>Promise.&lt;array&gt;</code>
Find in cache client ids subscribed to a specific topic pattern

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| broker | <code>object</code> | MQTT broker |
| topic | <code>string</code> | Topic pattern |

<a name="module_Broker..pickRandomClient"></a>

### Broker~pickRandomClient(broker, clientIds) ⇒ <code>object</code>
Give an array of clientIds, return a connected client

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - client  

| Param | Type | Description |
| --- | --- | --- |
| broker | <code>object</code> | MQTT broker |
| clientIds | <code>Array.&lt;string&gt;</code> | MQTT client Ids |

<a name="module_Broker..authentificationRequest"></a>

### Broker~authentificationRequest(credentials) ⇒ <code>Promise.&lt;object&gt;</code>
HTTP request to Aloes to validate credentials

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| credentials | <code>object</code> | Client instance and credentials |

<a name="module_Broker..onAuthenticate"></a>

### Broker~onAuthenticate(client, [username], [password]) ⇒ <code>Promise.&lt;number&gt;</code>
Check client credentials and update client properties

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>Promise.&lt;number&gt;</code> - status - CONNACK code
- 0 - Accepted
- 1 - Unacceptable protocol version
- 2 - Identifier rejected
- 3 - Server unavailable
- 4 - Bad user name or password
- 5 - Not authorized  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| [username] | <code>string</code> | MQTT username |
| [password] | <code>object</code> | MQTT password |

<a name="module_Broker..onAuthorizePublish"></a>

### Broker~onAuthorizePublish(client, packet) ⇒ <code>boolean</code>
Check client properties for publish access

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |

<a name="module_Broker..onAuthorizeSubscribe"></a>

### Broker~onAuthorizeSubscribe(client, packet) ⇒ <code>boolean</code>
Check client properties for subscribe access

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| packet | <code>object</code> | MQTT packet |

<a name="module_Broker..updateClientStatus"></a>

### Broker~updateClientStatus(broker, client, status) ⇒ <code>Promise.&lt;object&gt;</code>
Update client's status

Triggered after clientConnect and clientDisconnect events

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>Promise.&lt;object&gt;</code> - client  

| Param | Type | Description |
| --- | --- | --- |
| broker | <code>object</code> | MQTT broker |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | Client status |

<a name="module_Broker..onInternalPublished"></a>

### Broker~onInternalPublished(broker, packet) ⇒ <code>object</code>
Parse message coming from aloes MQTT clients

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>object</code> - packet  

| Param | Type | Description |
| --- | --- | --- |
| broker | <code>object</code> | MQTT broker |
| packet | <code>object</code> | MQTT packet |

<a name="module_Broker..onExternalPublished"></a>

### Broker~onExternalPublished(broker, packet, client) ⇒ <code>Promise.&lt;object&gt;</code>
Parse message coming from external MQTT clients

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>Promise.&lt;object&gt;</code> - packet  

| Param | Type | Description |
| --- | --- | --- |
| broker | <code>object</code> | MQTT broker |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Broker..onPublished"></a>

### Broker~onPublished(broker, packet, client) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
Parse message sent to Aedes broker

**Kind**: inner method of [<code>Broker</code>](#module_Broker)  
**Returns**: <code>Promise.&lt;(function()\|null)&gt;</code> - Broker~onInternalPublished | Broker~onExternalPublished  

| Param | Type | Description |
| --- | --- | --- |
| broker | <code>object</code> | MQTT broker |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="event_client"></a>

### "client" (client) ⇒ <code>Promise.&lt;function()&gt;</code>
On client connected to Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Broker~updateClientStatus  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |

<a name="event_clientDisconnect"></a>

### "clientDisconnect" (client) ⇒ <code>Promise.&lt;function()&gt;</code>
On client disconnected from Aedes broker

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Broker~updateClientStatus  

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

<a name="event_clientError"></a>

### "clientError" (client, err)
When client action creates an error

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| err | <code>object</code> | MQTT Error |

<a name="event_clientError"></a>

### "clientError" (client, err)
When client contains no Id

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| err | <code>object</code> | MQTT Error |

<a name="event_ack"></a>

### "ack" (packet, client)
When a packet with qos=1|2 is delivered successfully

**Kind**: event emitted by [<code>Broker</code>](#module_Broker)  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT original packet |
| client | <code>object</code> | MQTT client |

<a name="module_Broker..aedesCallback"></a>

### Broker~aedesCallback : <code>function</code>
Error callback

**Kind**: inner typedef of [<code>Broker</code>](#module_Broker)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 
|  | <code>result</code> | 

<a name="module_Mails"></a>

## Mails

* [Mails](#module_Mails)
    * _static_
        * [.send(options)](#module_Mails.send) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.verifyEmail(user)](#module_Mails.verifyEmail) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.sendResetPasswordMail(options)](#module_Mails.sendResetPasswordMail) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.sendContactForm(options)](#module_Mails.sendContactForm) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.sendMailInvite(options)](#module_Mails.sendMailInvite) ⇒ <code>Promise.&lt;object&gt;</code>
    * _inner_
        * [~sendMail()](#module_Mails..sendMail) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~verifyUser()](#module_Mails..verifyUser) ⇒ <code>Promise.&lt;object&gt;</code>

<a name="module_Mails.send"></a>

### Mails.send(options) ⇒ <code>Promise.&lt;object&gt;</code>
Generate HTML template and send email

**Kind**: static method of [<code>Mails</code>](#module_Mails)  
**Returns**: <code>Promise.&lt;object&gt;</code> - result - Mail result  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Mail options |

<a name="module_Mails.verifyEmail"></a>

### Mails.verifyEmail(user) ⇒ <code>Promise.&lt;object&gt;</code>
Sending a verification email to confirm account creation

**Kind**: static method of [<code>Mails</code>](#module_Mails)  
**Returns**: <code>Promise.&lt;object&gt;</code> - response  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | Account created |

<a name="module_Mails.sendResetPasswordMail"></a>

### Mails.sendResetPasswordMail(options) ⇒ <code>Promise.&lt;object&gt;</code>
Sending a mail to set a new password

**Kind**: static method of [<code>Mails</code>](#module_Mails)  
**Returns**: <code>Promise.&lt;object&gt;</code> - response  

| Param | Type |
| --- | --- |
| options | <code>object</code> | 

<a name="module_Mails.sendContactForm"></a>

### Mails.sendContactForm(options) ⇒ <code>Promise.&lt;object&gt;</code>
Sending a mail to admin

**Kind**: static method of [<code>Mails</code>](#module_Mails)  
**Returns**: <code>Promise.&lt;object&gt;</code> - response  

| Param | Type |
| --- | --- |
| options | <code>object</code> | 

<a name="module_Mails.sendMailInvite"></a>

### Mails.sendMailInvite(options) ⇒ <code>Promise.&lt;object&gt;</code>
Sending a mail invitation to new user

**Kind**: static method of [<code>Mails</code>](#module_Mails)  
**Returns**: <code>Promise.&lt;object&gt;</code> - response  

| Param | Type |
| --- | --- |
| options | <code>object</code> | 

<a name="module_Mails..sendMail"></a>

### Mails~sendMail() ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to send email using Email datasource

**Kind**: inner method of [<code>Mails</code>](#module_Mails)  
<a name="module_Mails..verifyUser"></a>

### Mails~verifyUser() ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to send verification email after user registration

**Kind**: inner method of [<code>Mails</code>](#module_Mails)  
<a name="module_MQTTClient"></a>

## MQTTClient

* [MQTTClient](#module_MQTTClient)
    * _static_
        * [.publish(topic, payload)](#module_MQTTClient.publish) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * ["start"](#module_MQTTClient.event_start) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["init" (app, config)](#module_MQTTClient.event_init) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["stop"](#module_MQTTClient.event_stop) ⇒ <code>Promise.&lt;function()&gt;</code>
    * _inner_
        * [~updateModelsStatus(app, client, status)](#module_MQTTClient..updateModelsStatus)
        * [~findPattern(app, packet, client)](#module_MQTTClient..findPattern) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [~redirectMessage(packet, client, pattern)](#module_MQTTClient..redirectMessage) ⇒ <code>string</code>
        * [~onStatus(app, topic, payload)](#module_MQTTClient..onStatus) ⇒ <code>function</code>
        * [~onReceive(app, topic, payload)](#module_MQTTClient..onReceive) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onMessage(app, topic, payload)](#module_MQTTClient..onMessage) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
        * [~startClient()](#module_MQTTClient..startClient)
        * [~initClient(app, config)](#module_MQTTClient..initClient) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [~stopClient()](#module_MQTTClient..stopClient) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="module_MQTTClient.publish"></a>

### MQTTClient.publish(topic, payload) ⇒ <code>Promise.&lt;boolean&gt;</code>
Convert payload and topic before publish

**Kind**: static method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - status  

| Param | Type | Description |
| --- | --- | --- |
| topic | <code>string</code> | Packet topic |
| payload | <code>any</code> | Packet payload |

<a name="module_MQTTClient.event_start"></a>

### "start" ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that MQTTClient has to start.

**Kind**: event emitted by [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - MQTTClient~startClient  
<a name="module_MQTTClient.event_init"></a>

### "init" (app, config) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that MQTTClient has to init.

**Kind**: event emitted by [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - MQTTClient~initClient  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| config | <code>object</code> | Formatted config. |

<a name="module_MQTTClient.event_stop"></a>

### "stop" ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that MQTTClient has to stop.

**Kind**: event emitted by [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - MQTTClient~stopClient  
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

### MQTTClient~findPattern(app, packet, client) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Retrieve pattern from packet.topic

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_MQTTClient..redirectMessage"></a>

### MQTTClient~redirectMessage(packet, client, pattern) ⇒ <code>string</code>
Redirect parsed message to corresponding Loopback model || device

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>string</code> - serviceName  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |
| pattern | <code>object</code> | IoTAgent extracted pattern |

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

### MQTTClient~onReceive(app, topic, payload) ⇒ <code>Promise.&lt;object&gt;</code>
Called when message arrived from the broker to be redirected to the right
Model

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;object&gt;</code> - packet  
**Emits**: <code>Application.event:publish</code>, <code>Device.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| topic | <code>object</code> | MQTT topic |
| payload | <code>object</code> | MQTT payload |

<a name="module_MQTTClient..onMessage"></a>

### MQTTClient~onMessage(app, topic, payload) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
Parse the message arriving from the broker

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;(function()\|null)&gt;</code> - MQTTClient~onStatus | MQTTClient~onReceive  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| topic | <code>object</code> | MQTT topic |
| payload | <code>object</code> | MQTT payload |

<a name="module_MQTTClient..startClient"></a>

### MQTTClient~startClient()
Setup MQTT client listeners

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
<a name="module_MQTTClient..initClient"></a>

### MQTTClient~initClient(app, config) ⇒ <code>Promise.&lt;boolean&gt;</code>
Setup MQTT client connection

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - status  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| config | <code>object</code> | Environment variables |

<a name="module_MQTTClient..stopClient"></a>

### MQTTClient~stopClient() ⇒ <code>Promise.&lt;boolean&gt;</code>
Stop MQTT client and unsubscribe

**Kind**: inner method of [<code>MQTTClient</code>](#module_MQTTClient)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - status  
<a name="module_rateLimiter"></a>

## rateLimiter

* [rateLimiter](#module_rateLimiter)
    * [.getAuthLimiter(ip, username, [clientId])](#module_rateLimiter.getAuthLimiter) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.setAuthLimiter(ip, username)](#module_rateLimiter.setAuthLimiter) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.cleanAuthLimiter(ip, username)](#module_rateLimiter.cleanAuthLimiter) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="module_rateLimiter.getAuthLimiter"></a>

### rateLimiter.getAuthLimiter(ip, username, [clientId]) ⇒ <code>Promise.&lt;object&gt;</code>
Check if Rate limits exist by Ip and/or username

optionnally use a clientId to limit reconnections

**Kind**: static method of [<code>rateLimiter</code>](#module_rateLimiter)  
**Returns**: <code>Promise.&lt;object&gt;</code> - retrySecs, userIpLimit, ipLimit, usernameIPkey  

| Param | Type |
| --- | --- |
| ip | <code>string</code> | 
| username | <code>string</code> | 
| [clientId] | <code>string</code> | 

<a name="module_rateLimiter.setAuthLimiter"></a>

### rateLimiter.setAuthLimiter(ip, username) ⇒ <code>Promise.&lt;object&gt;</code>
Consume 1 point from limiters on wrong attempt and block if limits are reached

Count failed attempts by Username + IP only for registered users

**Kind**: static method of [<code>rateLimiter</code>](#module_rateLimiter)  

| Param | Type |
| --- | --- |
| ip | <code>string</code> | 
| username | <code>string</code> | 

<a name="module_rateLimiter.cleanAuthLimiter"></a>

### rateLimiter.cleanAuthLimiter(ip, username) ⇒ <code>Promise.&lt;boolean&gt;</code>
Reset exisiting limiters for user/ip on successful authorisation

**Kind**: static method of [<code>rateLimiter</code>](#module_rateLimiter)  

| Param | Type |
| --- | --- |
| ip | <code>string</code> | 
| username | <code>string</code> | 

<a name="module_RoleManager"></a>

## RoleManager
<a name="module_Server"></a>

## Server

* [Server](#module_Server)
    * _static_
        * [.publish()](#module_Server.publish) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.start(config)](#module_Server.start) ⇒ <code>boolean</code>
        * [.init(config)](#module_Server.init)
        * [.stop(signal)](#module_Server.stop) ⇒ <code>boolean</code>
    * _inner_
        * [~userAuth(username, password)](#module_Server..userAuth) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~deviceAuth(username, password)](#module_Server..deviceAuth) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~applicationAuth(username, password)](#module_Server..applicationAuth) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~authenticateModels(username, password, [model])](#module_Server..authenticateModels) ⇒ <code>Promise.&lt;string&gt;</code>
        * [~authenticateInstance(client, username, password)](#module_Server..authenticateInstance) ⇒ <code>Promise.&lt;object&gt;</code>
        * ["publish" (topic, payload, [retain], [qos])](#event_publish) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["start" (config)](#event_start) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["started" (config)](#event_started)
        * ["stop" (signal)](#event_stop) ⇒ <code>Promise.&lt;function()&gt;</code>

<a name="module_Server.publish"></a>

### Server.publish() ⇒ <code>Promise.&lt;function()&gt;</code>
Emit publish event

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - MQTTClient.publish  
<a name="module_Server.start"></a>

### Server.start(config) ⇒ <code>boolean</code>
Init HTTP server with new Loopback instance

Init external services ( MQTT broker )

**Kind**: static method of [<code>Server</code>](#module_Server)  
**Emits**: <code>Server.event:started</code>  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="module_Server.init"></a>

### Server.init(config)
Bootstrap the application, configure models, datasources and middleware.

**Kind**: static method of [<code>Server</code>](#module_Server)  

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

<a name="module_Server..userAuth"></a>

### Server~userAuth(username, password) ⇒ <code>Promise.&lt;object&gt;</code>
Authenticate with User method

**Kind**: inner method of [<code>Server</code>](#module_Server)  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | MQTT client username |
| password | <code>string</code> | MQTT client password |

<a name="module_Server..deviceAuth"></a>

### Server~deviceAuth(username, password) ⇒ <code>Promise.&lt;object&gt;</code>
Authenticate with Device method

**Kind**: inner method of [<code>Server</code>](#module_Server)  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | MQTT client username |
| password | <code>string</code> | MQTT client password |

<a name="module_Server..applicationAuth"></a>

### Server~applicationAuth(username, password) ⇒ <code>Promise.&lt;object&gt;</code>
Authenticate with Application method

**Kind**: inner method of [<code>Server</code>](#module_Server)  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | MQTT client username |
| password | <code>string</code> | MQTT client password |

<a name="module_Server..authenticateModels"></a>

### Server~authenticateModels(username, password, [model]) ⇒ <code>Promise.&lt;string&gt;</code>
Iterate over each model to try authentication

**Kind**: inner method of [<code>Server</code>](#module_Server)  
**Returns**: <code>Promise.&lt;string&gt;</code> - Client details and status  

| Param | Type |
| --- | --- |
| username | <code>string</code> | 
| password | <code>string</code> | 
| [model] | <code>string</code> | 

<a name="module_Server..authenticateInstance"></a>

### Server~authenticateInstance(client, username, password) ⇒ <code>Promise.&lt;object&gt;</code>
Init HTTP server with new Loopback instance

Init external services ( MQTT broker )

**Kind**: inner method of [<code>Server</code>](#module_Server)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | Parsed MQTT client |
| username | <code>string</code> | MQTT client username |
| password | <code>string</code> | MQTT client password |

<a name="event_publish"></a>

### "publish" (topic, payload, [retain], [qos]) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a/several sensor instance(s) will be deleted.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Server.publish  

| Param | Type | Description |
| --- | --- | --- |
| topic | <code>string</code> | MQTT topic |
| payload | <code>any</code> | MQTT payload |
| [retain] | <code>boolean</code> |  |
| [qos] | <code>number</code> |  |

<a name="event_start"></a>

### "start" (config) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that the application and all subservices should start.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Server.init  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | Parsed env variables |

<a name="event_started"></a>

### "started" (config)
Event reporting that the application and all subservices have started.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Emits**: <code>MQTTClient.event:init</code>, <code>Device.event:started</code>, <code>Scheduler.event:started</code>, <code>Sensor.event:started</code>  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> | application config |

<a name="event_stop"></a>

### "stop" (signal) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that the application and all subservice should stop.

**Kind**: event emitted by [<code>Server</code>](#module_Server)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Server.stop  

| Param | Type | Description |
| --- | --- | --- |
| signal | <code>string</code> | process signal |

