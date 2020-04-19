## Modules

<dl>
<dt><a href="#module_Address">Address</a></dt>
<dd></dd>
<dt><a href="#module_Application">Application</a></dt>
<dd></dd>
<dt><a href="#module_Client">Client</a></dt>
<dd></dd>
<dt><a href="#module_Device">Device</a></dt>
<dd></dd>
<dt><a href="#module_Files">Files</a></dt>
<dd></dd>
<dt><a href="#module_Measurement">Measurement</a></dt>
<dd></dd>
<dt><a href="#module_OmaObject">OmaObject</a></dt>
<dd></dd>
<dt><a href="#module_OmaResource">OmaResource</a></dt>
<dd></dd>
<dt><a href="#module_OmaViews">OmaViews</a></dt>
<dd></dd>
<dt><a href="#module_Scheduler">Scheduler</a></dt>
<dd></dd>
<dt><a href="#module_SensorResource">SensorResource</a></dt>
<dd></dd>
<dt><a href="#module_Sensor">Sensor</a></dt>
<dd></dd>
<dt><a href="#module_User">User</a></dt>
<dd></dd>
</dl>

## External

<dl>
<dt><a href="#external_OmaObjects">OmaObjects</a></dt>
<dd><p>Oma Object References.</p>
</dd>
<dt><a href="#external_OmaResources">OmaResources</a></dt>
<dd><p>Oma Resources References.</p>
</dd>
</dl>

<a name="module_Address"></a>

## Address
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Database generated ID |
| street | <code>string</code> |  |
| streetName | <code>string</code> |  |
| streetNumber | <code>string</code> |  |
| postalCode | <code>number</code> |  |
| city | <code>string</code> |  |
| coordinates | <code>object</code> |  |
| verified | <code>boolean</code> |  |
| public | <code>boolean</code> |  |


* [Address](#module_Address)
    * _static_
        * [.verifyAddress(address)](#module_Address.verifyAddress) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.search(filter)](#module_Address.search) ⇒ <code>Promise.&lt;array&gt;</code>
        * [.geoLocate(filter)](#module_Address.geoLocate) ⇒ <code>Promise.&lt;array&gt;</code>
    * _inner_
        * [~onAfterSave(ctx)](#module_Address..onAfterSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onBeforeRemote(ctx)](#module_Address..onBeforeRemote) ⇒ <code>Promise.&lt;object&gt;</code>
        * ["create" (ctx, user)](#event_create) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before find" (ctx)](#event_before find) ⇒ <code>Promise.&lt;function()&gt;</code>

<a name="module_Address.verifyAddress"></a>

### Address.verifyAddress(address) ⇒ <code>Promise.&lt;object&gt;</code>
Validate input address; get coordinates and update address instance

**Kind**: static method of [<code>Address</code>](#module_Address)  
**Returns**: <code>Promise.&lt;object&gt;</code> - address  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>any</code> | Instance address |

<a name="module_Address.search"></a>

### Address.search(filter) ⇒ <code>Promise.&lt;array&gt;</code>
Search address by keyword

**Kind**: static method of [<code>Address</code>](#module_Address)  
**Returns**: <code>Promise.&lt;array&gt;</code> - addresses  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Requested filter |

<a name="module_Address.geoLocate"></a>

### Address.geoLocate(filter) ⇒ <code>Promise.&lt;array&gt;</code>
Search addresses by location ( GPS coordinates )

**Kind**: static method of [<code>Address</code>](#module_Address)  
**Returns**: <code>Promise.&lt;array&gt;</code> - addresses  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Requested filter |

<a name="module_Address..onAfterSave"></a>

### Address~onAfterSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Validate input address; get coordinates and update address instance

**Kind**: inner method of [<code>Address</code>](#module_Address)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Address..onBeforeRemote"></a>

### Address~onBeforeRemote(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Hook executed before every remote methods

**Kind**: inner method of [<code>Address</code>](#module_Address)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="event_create"></a>

### "create" (ctx, user) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a new user instance has been created.

**Kind**: event emitted by [<code>Address</code>](#module_Address)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - onAfterSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| user | <code>object</code> | User new instance |

<a name="event_before find"></a>

### "before find" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that an address instance / collection is requested

**Kind**: event emitted by [<code>Address</code>](#module_Address)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Application"></a>

## Application
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | Database generated ID. |
| name | <code>String</code> | Unique name defined by user required. |
| description | <code>String</code> | Define Application purpose. |
| collaborators | <code>Array</code> | A list of users ids who have permissions to use this application |
| clients | <code>Array</code> | A list of client ids authentified as this application |


* [Application](#module_Application)
    * _instance_
        * [.resetKeys()](#module_Application+resetKeys) ⇒ <code>Promise.&lt;object&gt;</code>
    * _static_
        * [.publish(application, method, [client])](#module_Application.publish) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [.refreshToken(appId, ownerId)](#module_Application.refreshToken) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.onPublish(packet, client, pattern)](#module_Application.onPublish) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.updateStatus(client, status)](#module_Application.updateStatus) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.authenticate(applicationId, key)](#module_Application.authenticate) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.getState(applicationId)](#module_Application.getState) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.find(filter)](#module_Application.find) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.count(where)](#module_Application.count) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.findById(id, filter)](#module_Application.findById) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.create(application)](#module_Application.create) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.updateById(id, filter)](#module_Application.updateById) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.deleteById(id, filter)](#module_Application.deleteById) ⇒ <code>Promise.&lt;object&gt;</code>
    * _inner_
        * [~detector(packet, client)](#module_Application..detector) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [~onBeforeSave(ctx)](#module_Application..onBeforeSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~createKeys(application)](#module_Application..createKeys) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~createProps(app, instance)](#module_Application..createProps) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [~updateProps(app, instance)](#module_Application..updateProps) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [~onAfterSave(ctx)](#module_Application..onAfterSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~deleteProps(app, instance)](#module_Application..deleteProps) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [~onBeforeDelete(ctx)](#module_Application..onBeforeDelete) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onBeforeRemote(app, ctx)](#module_Application..onBeforeRemote) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~parseMessage(app, packet, pattern, client)](#module_Application..parseMessage)
        * ["client" (message)](#event_client) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
        * ["publish" (message)](#event_publish) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
        * ["stopped"](#event_stopped)
        * ["before_save" (ctx)](#event_before_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["after_save" (ctx)](#event_after_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_delete" (ctx)](#event_before_delete) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_*" (ctx)](#event_before_*) ⇒ <code>Promise.&lt;function()&gt;</code>

<a name="module_Application+resetKeys"></a>

### application.resetKeys() ⇒ <code>Promise.&lt;object&gt;</code>
Reset keys for this application instance

**Kind**: instance method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;object&gt;</code> - this  
<a name="module_Application.publish"></a>

### Application.publish(application, method, [client]) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - application  
**Emits**: <code>Server.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| application | <code>object</code> | Application instance |
| method | <code>string</code> | Publish method |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Application.refreshToken"></a>

### Application.refreshToken(appId, ownerId) ⇒ <code>Promise.&lt;function()&gt;</code>
Create new keys, and update Application instance

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - application.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| appId | <code>string</code> | Application instance id |
| ownerId | <code>string</code> | Application owner id |

<a name="module_Application.onPublish"></a>

### Application.onPublish(packet, client, pattern) ⇒ <code>Promise.&lt;function()&gt;</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Application~parseMessage  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT bridge packet |
| client | <code>object</code> | MQTT client |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |

<a name="module_Application.updateStatus"></a>

### Application.updateStatus(client, status) ⇒ <code>Promise.&lt;function()&gt;</code>
Update application status from MQTT conection status

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - application.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT conection status |

<a name="module_Application.authenticate"></a>

### Application.authenticate(applicationId, key) ⇒ <code>Promise.&lt;object&gt;</code>
Endpoint for application authentification with APIKey

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;object&gt;</code> - matched The matching application and key; one of:
- clientKey
- apiKey
- javaScriptKey
- restApiKey
- windowsKey
- masterKey  

| Param | Type |
| --- | --- |
| applicationId | <code>any</code> | 
| key | <code>string</code> | 

<a name="module_Application.getState"></a>

### Application.getState(applicationId) ⇒ <code>Promise.&lt;object&gt;</code>
Endpoint to get resources attached to an application

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;object&gt;</code> - application  

| Param | Type |
| --- | --- |
| applicationId | <code>string</code> | 

<a name="module_Application.find"></a>

### Application.find(filter) ⇒ <code>Promise.&lt;object&gt;</code>
Find applications

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type |
| --- | --- |
| filter | <code>object</code> | 

<a name="module_Application.count"></a>

### Application.count(where) ⇒ <code>Promise.&lt;number&gt;</code>
Returns applications length

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type |
| --- | --- |
| where | <code>object</code> | 

<a name="module_Application.findById"></a>

### Application.findById(id, filter) ⇒ <code>Promise.&lt;object&gt;</code>
Find application by id

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Application.create"></a>

### Application.create(application) ⇒ <code>Promise.&lt;object&gt;</code>
Create application

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type |
| --- | --- |
| application | <code>object</code> | 

<a name="module_Application.updateById"></a>

### Application.updateById(id, filter) ⇒ <code>Promise.&lt;object&gt;</code>
Update application by id

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Application.deleteById"></a>

### Application.deleteById(id, filter) ⇒ <code>Promise.&lt;object&gt;</code>
Delete application by id

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Application..detector"></a>

### Application~detector(packet, client) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Detect application known pattern and load the application instance

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Application..onBeforeSave"></a>

### Application~onBeforeSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Validate instance before creation

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Application..createKeys"></a>

### Application~createKeys(application) ⇒ <code>Promise.&lt;object&gt;</code>
Keys creation helper - update application attributes

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;object&gt;</code> - application  

| Param | Type | Description |
| --- | --- | --- |
| application | <code>object</code> | Application instance |

<a name="module_Application..createProps"></a>

### Application~createProps(app, instance) ⇒ <code>Promise.&lt;function()&gt;</code>
Init application dependencies ( token )

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Application.publish  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| instance | <code>object</code> | Application instance |

<a name="module_Application..updateProps"></a>

### Application~updateProps(app, instance) ⇒ <code>Promise.&lt;function()&gt;</code>
Update application depencies

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Application.publish  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| instance | <code>object</code> | Application instance |

<a name="module_Application..onAfterSave"></a>

### Application~onAfterSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Create relations on instance creation

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Application..deleteProps"></a>

### Application~deleteProps(app, instance) ⇒ <code>Promise.&lt;function()&gt;</code>
Remove application dependencies

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Application.publish  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| instance | <code>object</code> |  |

<a name="module_Application..onBeforeDelete"></a>

### Application~onBeforeDelete(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Delete relations on instance(s) deletetion

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Application..onBeforeRemote"></a>

### Application~onBeforeRemote(app, ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Called when a remote method tries to access Application Model / instance

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback App |
| ctx | <code>object</code> | Express context |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Application..parseMessage"></a>

### Application~parseMessage(app, packet, pattern, client)
Find properties and dispatch to the right function

Adding device and sensor context to raw incoming data

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Emits**: <code>Device.event:publish</code>, <code>Sensor.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| packet | <code>object</code> | MQTT packet |
| pattern | <code>object</code> | Pattern detected by IotAgent |
| client | <code>object</code> | MQTT client |

<a name="event_client"></a>

### "client" (message) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
Event reporting that an application client connection status has changed.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;(function()\|null)&gt;</code> - Application.updateStatus  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.client | <code>object</code> | MQTT client |
| message.status | <code>boolean</code> | MQTT client status. |

<a name="event_publish"></a>

### "publish" (message) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
Event reporting that an application client sent a message.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;(function()\|null)&gt;</code> - Application.onPublish  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.packet | <code>object</code> | MQTT packet. |
| message.pattern | <code>object</code> | Pattern detected |
| message.client | <code>object</code> | MQTT client |

<a name="event_stopped"></a>

### "stopped"
Event reporting that application stopped

Trigger Application stopping routine

**Kind**: event emitted by [<code>Application</code>](#module_Application)  
<a name="event_before_save"></a>

### "before_save" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that an application instance will be created or updated.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Application~onBeforeSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Application instance |

<a name="event_after_save"></a>

### "after_save" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a device instance has been created or updated.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Application~onAfterSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Application instance |

<a name="event_before_delete"></a>

### "before_delete" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that an application instance will be deleted.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Application~onBeforeDelete  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | Application instance |

<a name="event_before_*"></a>

### "before_*" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that an Application instance / collection is requested

**Kind**: event emitted by [<code>Application</code>](#module_Application)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Application~onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Client"></a>

## Client
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Client ID |
| ip | <code>string</code> | Client IP |
| user | <code>string</code> | Username attribute ( once client authenthified ) |
| status | <code>boolean</code> | Client status |
| model | <code>string</code> | Aloes model ( Application, Device, ... ) |
| [type] | <code>string</code> | Client type ( MQTT, WS , ... ) |
| [devEui] | <code>string</code> | device DevEui |
| [appEui] | <code>string</code> | application AppEui |


* [Client](#module_Client)
    * _static_
        * [.getAll([filter])](#module_Client.getAll) ⇒ <code>Promise.&lt;array&gt;</code>
        * [.deleteAll([filter])](#module_Client.deleteAll) ⇒ <code>Promise.&lt;array&gt;</code>
        * [.get(key, [cb])](#module_Client.get)
        * [.set(key, value, [ttl], [cb])](#module_Client.set)
        * [.delete(key, [cb])](#module_Client.delete)
        * [.expire(key, [ttl], [cb])](#module_Client.expire)
        * [.keys([filter], [cb])](#module_Client.keys) ⇒ <code>Array.&lt;string&gt;</code>
        * [.iterateKeys([filter])](#module_Client.iterateKeys) ⇒ <code>AsyncIterator</code>
    * _inner_
        * [~onBeforeRemote(app, ctx)](#module_Client..onBeforeRemote) ⇒ <code>Promise.&lt;object&gt;</code>
        * ["before_*" (ctx)](#event_before_*) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["stopped"](#event_stopped)
        * [~errorCallback](#module_Client..errorCallback) : <code>function</code>
        * [~resultCallback](#module_Client..resultCallback) : <code>function</code>

<a name="module_Client.getAll"></a>

### Client.getAll([filter]) ⇒ <code>Promise.&lt;array&gt;</code>
Find clients in the cache

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Returns**: <code>Promise.&lt;array&gt;</code> - schedulers - Cached clients  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Client filter |

<a name="module_Client.deleteAll"></a>

### Client.deleteAll([filter]) ⇒ <code>Promise.&lt;array&gt;</code>
Delete clients stored in cache

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Returns**: <code>Promise.&lt;array&gt;</code> - clients - Cached clients keys  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Client filter |

<a name="module_Client.get"></a>

### Client.get(key, [cb])
Get client by key

Use callback or promise

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Promise**: result  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [cb] | <code>resultCallback</code> | Optional callback |

<a name="module_Client.set"></a>

### Client.set(key, value, [ttl], [cb])
Set client by key, with optional TTL

Use callback or promise

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| value | <code>string</code> |  |
| [ttl] | <code>number</code> |  |
| [cb] | <code>errorCallback</code> | Optional callback |

<a name="module_Client.delete"></a>

### Client.delete(key, [cb])
Delete Client by key

Use callback or promise

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [cb] | <code>errorCallback</code> | Optional callback |

<a name="module_Client.expire"></a>

### Client.expire(key, [ttl], [cb])
Set the TTL (time to live) in ms (milliseconds) for a given key

Use callback or promise

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [ttl] | <code>number</code> |  |
| [cb] | <code>errorCallback</code> | Optional callback |

<a name="module_Client.keys"></a>

### Client.keys([filter], [cb]) ⇒ <code>Array.&lt;string&gt;</code>
Get all client keys

Use callback or promise

**Kind**: static method of [<code>Client</code>](#module_Client)  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> |  |
| filter.match | <code>object</code> | Glob string used to filter returned keys (i.e. userid.*) |
| [cb] | <code>function</code> |  |

<a name="module_Client.iterateKeys"></a>

### Client.iterateKeys([filter]) ⇒ <code>AsyncIterator</code>
Iterate over all client keys

Use callback or promise

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Returns**: <code>AsyncIterator</code> - An Object implementing next(cb) -> Promise function that can be used to iterate all keys.  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> |  |
| filter.match | <code>object</code> | Glob string used to filter returned keys (i.e. userid.*) |

<a name="module_Client..onBeforeRemote"></a>

### Client~onBeforeRemote(app, ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Called when a remote method tries to access Client Model / instance

**Kind**: inner method of [<code>Client</code>](#module_Client)  
**Returns**: <code>Promise.&lt;object&gt;</code> - context  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback App |
| ctx | <code>object</code> | Express context |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="event_before_*"></a>

### "before_*" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a Client method is requested

**Kind**: event emitted by [<code>Client</code>](#module_Client)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Client~onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="event_stopped"></a>

### "stopped"
Event reporting that application stopped

Trigger Client stopping routine

**Kind**: event emitted by [<code>Client</code>](#module_Client)  
<a name="module_Client..errorCallback"></a>

### Client~errorCallback : <code>function</code>
Optional error callback

**Kind**: inner typedef of [<code>Client</code>](#module_Client)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 

<a name="module_Client..resultCallback"></a>

### Client~resultCallback : <code>function</code>
Optional result callback

**Kind**: inner typedef of [<code>Client</code>](#module_Client)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 
| result | <code>string</code> | 

<a name="module_Device"></a>

## Device
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | Database generated ID. |
| name | <code>String</code> | Unique name defined by user required. |
| description | <code>String</code> | Define device purpose. |
| devEui | <code>String</code> | hardware generated Device Id required. |
| devAddr | <code>String</code> | randomly generated non unique Device Id required. |
| apiKey | <code>String</code> | key to access Aloes as client. |
| clientKey | <code>String</code> | key to access Aloes as client. |
| lastSignal | <code>Date</code> |  |
| frameCounter | <code>Number</code> | Number of messages since last connection |
| type | <code>String</code> | Device type ( /initial-data/device-types.json ) |
| icons | <code>Array</code> | automatically set based on device type |
| accessPointUrl | <code>String</code> |  |
| qrCode | <code>String</code> | Filled URL containing device access point |
| transportProtocol | <code>String</code> | Framework used for message transportation |
| transportProtocolVersion | <code>String</code> | Framework version |
| messageProtocol | <code>String</code> | Framework used for message encoding |
| messageProtocolVersion | <code>String</code> | Framework version |
| collaborators | <code>Array</code> | A list of users ids who have permissions to use this device |
| clients | <code>Array</code> | A list of client ids authentified as this device |
| applications | <code>Array</code> | A list of application ids who have rights to listen device events |
| ownerId | <code>String</code> | User ID of the user who has registered the device. |


* [Device](#module_Device)
    * _instance_
        * [.resetKeys()](#module_Device+resetKeys) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.__get__sensors()](#module_Device+__get__sensors) ⇒ <code>Promise.&lt;function()&gt;</code>
    * _static_
        * [.publish(device, method, [client])](#module_Device.publish) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [.refreshToken(deviceId, ownerId)](#module_Device.refreshToken) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.findByPattern(pattern, attributes)](#module_Device.findByPattern) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.search(filter)](#module_Device.search) ⇒ <code>Promise.&lt;array&gt;</code>
        * [.geoLocate(filter)](#module_Device.geoLocate) ⇒ <code>Promise.&lt;array&gt;</code>
        * [.export(devices, [format])](#module_Device.export) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.updateStatus(client, status)](#module_Device.updateStatus) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.onPublish(packet, pattern, client)](#module_Device.onPublish) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.authenticate(deviceId, key)](#module_Device.authenticate) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.getState(deviceId)](#module_Device.getState) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.getFullState(deviceId)](#module_Device.getFullState) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.getOTAUpdate(ctx, deviceId, [version])](#module_Device.getOTAUpdate) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.setClock(interval)](#module_Device.setClock) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.find(filter)](#module_Device.find) ⇒ <code>object</code>
        * [.count(where)](#module_Device.count) ⇒ <code>number</code>
        * [.findById(id, filter)](#module_Device.findById) ⇒ <code>object</code>
        * [.create(device)](#module_Device.create) ⇒ <code>object</code>
        * [.updateById(id, filter)](#module_Device.updateById) ⇒ <code>object</code>
        * [.deleteById(id, filter)](#module_Device.deleteById) ⇒ <code>object</code>
    * _inner_
        * [~detector(packet, client)](#module_Device..detector) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~transportProtocolValidator(err)](#module_Device..transportProtocolValidator)
        * [~messageProtocolValidator(err)](#module_Device..messageProtocolValidator)
        * [~typeValidator(err)](#module_Device..typeValidator)
        * [~setDeviceIcons(device)](#module_Device..setDeviceIcons) ⇒ <code>object</code>
        * [~createKeys(device)](#module_Device..createKeys) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~setDeviceQRCode(device)](#module_Device..setDeviceQRCode) ⇒ <code>object</code>
        * [~publishToDeviceApplications(app, device, packet)](#module_Device..publishToDeviceApplications)
        * [~onBeforeSave(ctx)](#module_Device..onBeforeSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~createProps(app, instance)](#module_Device..createProps) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [~updateProps(app, instance)](#module_Device..updateProps) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [~onAfterSave(ctx)](#module_Device..onAfterSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~deleteProps(app, instance)](#module_Device..deleteProps) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [~onBeforeDelete(ctx)](#module_Device..onBeforeDelete) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onBeforeRemote(app, ctx)](#module_Device..onBeforeRemote) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~parseMessage(app, packet, pattern, client)](#module_Device..parseMessage) ⇒ <code>Promise.&lt;object&gt;</code>
        * ["client" (message)](#event_client) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
        * ["publish" (message)](#event_publish) ⇒ <code>Promise.&lt;(functions\|null)&gt;</code>
        * ["stopped"](#event_stopped)
        * ["before_save" (ctx)](#event_before_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["after_save" (ctx)](#event_after_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_delete" (ctx)](#event_before_delete) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_*" (ctx)](#event_before_*) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [~errorCallback](#module_Device..errorCallback) : <code>function</code>

<a name="module_Device+resetKeys"></a>

### device.resetKeys() ⇒ <code>Promise.&lt;object&gt;</code>
Reset keys for this device instance

**Kind**: instance method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - device  
<a name="module_Device+__get__sensors"></a>

### device.\_\_get\_\_sensors() ⇒ <code>Promise.&lt;function()&gt;</code>
Get device sensors

**Kind**: instance method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - module:Sensor.find  
<a name="module_Device.publish"></a>

### Device.publish(device, method, [client]) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - device  
**Emits**: <code>Server.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |
| method | <code>string</code> | MQTT method |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Device.refreshToken"></a>

### Device.refreshToken(deviceId, ownerId) ⇒ <code>Promise.&lt;object&gt;</code>
Create new keys, and update Device instance

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>object</code> | Device instance id |
| ownerId | <code>object</code> | Device owner id |

<a name="module_Device.findByPattern"></a>

### Device.findByPattern(pattern, attributes) ⇒ <code>Promise.&lt;object&gt;</code>
Find device and / or sensor related to incoming MQTT packet

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent parsed pattern |
| attributes | <code>object</code> | IotAgent parsed message |

<a name="module_Device.search"></a>

### Device.search(filter) ⇒ <code>Promise.&lt;array&gt;</code>
Search device by keywords ( name, address, type  )

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;array&gt;</code> - devices  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Requested filter |

<a name="module_Device.geoLocate"></a>

### Device.geoLocate(filter) ⇒ <code>Promise.&lt;array&gt;</code>
Search devices by location ( GPS coordinates )

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;array&gt;</code> - devices  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Requested filter |

<a name="module_Device.export"></a>

### Device.export(devices, [format]) ⇒ <code>Promise.&lt;object&gt;</code>
Export devices list from JSON to {format}

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| devices | <code>array</code> | 
| [format] | <code>string</code> | 

<a name="module_Device.updateStatus"></a>

### Device.updateStatus(client, status) ⇒ <code>Promise.&lt;function()&gt;</code>
Update device status from MQTT connection status

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT connection status |

<a name="module_Device.onPublish"></a>

### Device.onPublish(packet, pattern, client) ⇒ <code>Promise.&lt;function()&gt;</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Device~parseMessage  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT bridge packet |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |
| client | <code>object</code> | MQTT client |

<a name="module_Device.authenticate"></a>

### Device.authenticate(deviceId, key) ⇒ <code>Promise.&lt;object&gt;</code>
Endpoint for device authentification with APIKey

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - matched The matching device and key; one of:
- clientKey
- apiKey
- javaScriptKey
- restApiKey
- windowsKey
- masterKey  

| Param | Type |
| --- | --- |
| deviceId | <code>any</code> | 
| key | <code>string</code> | 

<a name="module_Device.getState"></a>

### Device.getState(deviceId) ⇒ <code>Promise.&lt;object&gt;</code>
Endpoint for device requesting their own state ( small memory )

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device instance id |

<a name="module_Device.getFullState"></a>

### Device.getFullState(deviceId) ⇒ <code>Promise.&lt;object&gt;</code>
Endpoint for device requesting their own state, including relations

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device instance id |

<a name="module_Device.getOTAUpdate"></a>

### Device.getOTAUpdate(ctx, deviceId, [version]) ⇒ <code>Promise.&lt;function()&gt;</code>
Update OTA if a firmware is available

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Device~updateFirmware  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| deviceId | <code>string</code> | Device instance id |
| [version] | <code>string</code> | Firmware version requested |

<a name="module_Device.setClock"></a>

### Device.setClock(interval) ⇒ <code>Promise.&lt;object&gt;</code>
Init clock to synchronize memories

a DeltaTimer instance will be created and stored in memory

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - Device.timer  

| Param | Type | Description |
| --- | --- | --- |
| interval | <code>number</code> | Timeout interval |

<a name="module_Device.find"></a>

### Device.find(filter) ⇒ <code>object</code>
Find devices

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| filter | <code>object</code> | 

<a name="module_Device.count"></a>

### Device.count(where) ⇒ <code>number</code>
Returns devices length

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| where | <code>object</code> | 

<a name="module_Device.findById"></a>

### Device.findById(id, filter) ⇒ <code>object</code>
Find device by id

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Device.create"></a>

### Device.create(device) ⇒ <code>object</code>
Create device

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| device | <code>object</code> | 

<a name="module_Device.updateById"></a>

### Device.updateById(id, filter) ⇒ <code>object</code>
Update device by id

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Device.deleteById"></a>

### Device.deleteById(id, filter) ⇒ <code>object</code>
Delete device by id

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Device..detector"></a>

### Device~detector(packet, client) ⇒ <code>Promise.&lt;object&gt;</code>
Detect device known pattern and load the application instance

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Device..transportProtocolValidator"></a>

### Device~transportProtocolValidator(err)
Validate device transportProtocol before saving instance

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| err | <code>ErrorCallback</code> | 

<a name="module_Device..messageProtocolValidator"></a>

### Device~messageProtocolValidator(err)
Validate device messageProtocol before saving instance

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| err | <code>ErrorCallback</code> | 

<a name="module_Device..typeValidator"></a>

### Device~typeValidator(err)
Validate device type before saving instance

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| err | <code>ErrorCallback</code> | 

<a name="module_Device..setDeviceIcons"></a>

### Device~setDeviceIcons(device) ⇒ <code>object</code>
Set device icons ( urls ) based on its type

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Device..createKeys"></a>

### Device~createKeys(device) ⇒ <code>Promise.&lt;object&gt;</code>
Keys creation helper - update device attributes

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Device..setDeviceQRCode"></a>

### Device~setDeviceQRCode(device) ⇒ <code>object</code>
Set device QRcode access based on declared protocol and access point url

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Device..publishToDeviceApplications"></a>

### Device~publishToDeviceApplications(app, device, packet)
Check if a Device instance is attached to any Application instance

Publish message to each of these Application instance

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Emits**: <code>Server.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| device | <code>object</code> | Device instance |
| packet | <code>object</code> | MQTT packet to send |

<a name="module_Device..onBeforeSave"></a>

### Device~onBeforeSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Validate instance before creation

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Device..createProps"></a>

### Device~createProps(app, instance) ⇒ <code>Promise.&lt;function()&gt;</code>
Init device dependencies ( token, address )

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Device.publish  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| instance | <code>object</code> | Device instance |

<a name="module_Device..updateProps"></a>

### Device~updateProps(app, instance) ⇒ <code>Promise.&lt;function()&gt;</code>
Update device depencies ( token, sensors )

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Device.publish  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| instance | <code>object</code> | Device instance |

<a name="module_Device..onAfterSave"></a>

### Device~onAfterSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Create relations on instance creation

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Device..deleteProps"></a>

### Device~deleteProps(app, instance) ⇒ <code>Promise.&lt;boolean&gt;</code>
Remove device dependencies

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| instance | <code>object</code> |  |

<a name="module_Device..onBeforeDelete"></a>

### Device~onBeforeDelete(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Delete relations on instance(s) deletetion

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Device..onBeforeRemote"></a>

### Device~onBeforeRemote(app, ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Called when a remote method tries to access Device Model / instance

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - context  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback App |
| ctx | <code>object</code> | Express context |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Device..parseMessage"></a>

### Device~parseMessage(app, packet, pattern, client) ⇒ <code>Promise.&lt;object&gt;</code>
Find properties and dispatch to the right function

Adding device and sensor context to raw incoming data

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;object&gt;</code> - device  
**Emits**: <code>Device.event:publish</code>, <code>Sensor.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| packet | <code>object</code> | MQTT packet |
| pattern | <code>object</code> | Pattern detected by IotAgent |
| client | <code>object</code> | MQTT client |

<a name="event_client"></a>

### "client" (message) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
Event reporting that an device client connection status has changed.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;(function()\|null)&gt;</code> - Device.updateStatus  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.client | <code>object</code> | MQTT client |
| message.status | <code>boolean</code> | MQTT client status. |

<a name="event_publish"></a>

### "publish" (message) ⇒ <code>Promise.&lt;(functions\|null)&gt;</code>
Event reporting that a device client sent a message.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;(functions\|null)&gt;</code> - Device.onPublish | Device.execute  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.packet | <code>object</code> | MQTT packet. |
| message.pattern | <code>object</code> | Pattern detected by Iot-Agent |
| message.device | <code>object</code> | Found Device instance |
| [message.client] | <code>object</code> | MQTT client |

<a name="event_stopped"></a>

### "stopped"
Event reporting that application stopped

Trigger Device stopping routine

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
<a name="event_before_save"></a>

### "before_save" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a device instance will be created or updated.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Device~onBeforeSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Device instance |

<a name="event_after_save"></a>

### "after_save" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a device instance has been created or updated.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Device~onAfterSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Device instance |

<a name="event_before_delete"></a>

### "before_delete" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that one or several device instance(s) will be deleted.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Device~onBeforeDelete  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | Device instance |

<a name="event_before_*"></a>

### "before_*" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a Device instance / collection is requested

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Device~onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Device..errorCallback"></a>

### Device~errorCallback : <code>function</code>
Error callback

**Kind**: inner typedef of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 

<a name="module_Files"></a>

## Files
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Database generated ID |
| name | <code>string</code> |  |
| type | <code>string</code> |  |
| size | <code>string</code> |  |
| role | <code>string</code> |  |
| url | <code>string</code> |  |


* [Files](#module_Files)
    * _static_
        * [.upload(ctx, ownerId, [name])](#module_Files.upload) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.uploadBuffer(buffer, ownerId, name)](#module_Files.uploadBuffer) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.download(ctx, ownerId, name)](#module_Files.download) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.createContainer(userId)](#module_Files.createContainer) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.getContainers(userId)](#module_Files.getContainers) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.getContainer(userId, name)](#module_Files.getContainer) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.removeContainer(userId, name)](#module_Files.removeContainer) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.getFilesFromContainer(userId)](#module_Files.getFilesFromContainer) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.getFileFromContainer(userId, name)](#module_Files.getFileFromContainer) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.removeFileFromContainer(userId, name)](#module_Files.removeFileFromContainer) ⇒ <code>Promise.&lt;function()&gt;</code>
    * _inner_
        * [~onBeforeSave(ctx)](#module_Files..onBeforeSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onBeforeDelete(ctx)](#module_Files..onBeforeDelete) ⇒ <code>Promise.&lt;object&gt;</code>
        * ["before_save" (ctx, user)](#event_before_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_delete" (ctx)](#event_before_delete) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_*" (ctx)](#event_before_*) ⇒ <code>Promise.&lt;function()&gt;</code>

<a name="module_Files.upload"></a>

### Files.upload(ctx, ownerId, [name]) ⇒ <code>Promise.&lt;object&gt;</code>
Request to upload file in userId container via multipart/form data

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;object&gt;</code> - file  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| ownerId | <code>string</code> | Container owner and path |
| [name] | <code>string</code> | File name |

<a name="module_Files.uploadBuffer"></a>

### Files.uploadBuffer(buffer, ownerId, name) ⇒ <code>Promise.&lt;object&gt;</code>
Request to upload file in userId container via raw buffer

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;object&gt;</code> - fileMeta  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>buffer</code> | Containing file data |
| ownerId | <code>string</code> | Container owner and path |
| name | <code>string</code> | File name |

<a name="module_Files.download"></a>

### Files.download(ctx, ownerId, name) ⇒ <code>Promise.&lt;object&gt;</code>
Request to download file in ownerId container

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;object&gt;</code> - fileMeta  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| ownerId | <code>string</code> | Container owner and path |
| name | <code>string</code> | File name |

<a name="module_Files.createContainer"></a>

### Files.createContainer(userId) ⇒ <code>Promise.&lt;function()&gt;</code>
Create a new file container

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - createContainer  

| Param | Type |
| --- | --- |
| userId | <code>string</code> | 

<a name="module_Files.getContainers"></a>

### Files.getContainers(userId) ⇒ <code>Promise.&lt;function()&gt;</code>
Get a list of file containers info

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - getContainers  

| Param | Type |
| --- | --- |
| userId | <code>string</code> | 

<a name="module_Files.getContainer"></a>

### Files.getContainer(userId, name) ⇒ <code>Promise.&lt;function()&gt;</code>
Get a file container info

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - getContainer  

| Param | Type |
| --- | --- |
| userId | <code>string</code> | 
| name | <code>string</code> | 

<a name="module_Files.removeContainer"></a>

### Files.removeContainer(userId, name) ⇒ <code>Promise.&lt;function()&gt;</code>
Remove a file container

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - removeContainer  

| Param | Type |
| --- | --- |
| userId | <code>string</code> | 
| name | <code>string</code> | 

<a name="module_Files.getFilesFromContainer"></a>

### Files.getFilesFromContainer(userId) ⇒ <code>Promise.&lt;function()&gt;</code>
Get files info from a container

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - getFilesFromContainer  

| Param | Type |
| --- | --- |
| userId | <code>string</code> | 

<a name="module_Files.getFileFromContainer"></a>

### Files.getFileFromContainer(userId, name) ⇒ <code>Promise.&lt;function()&gt;</code>
Get a file info from a container

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - getFileFromContainer  

| Param | Type |
| --- | --- |
| userId | <code>string</code> | 
| name | <code>string</code> | 

<a name="module_Files.removeFileFromContainer"></a>

### Files.removeFileFromContainer(userId, name) ⇒ <code>Promise.&lt;function()&gt;</code>
Remove a file info from a container

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - removeFileFromContainer  

| Param | Type |
| --- | --- |
| userId | <code>string</code> | 
| name | <code>string</code> | 

<a name="module_Files..onBeforeSave"></a>

### Files~onBeforeSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Validate instance before creation

**Kind**: inner method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Files..onBeforeDelete"></a>

### Files~onBeforeDelete(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Delete relations on instance(s) deletetion

**Kind**: inner method of [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="event_before_save"></a>

### "before_save" (ctx, user) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a new Files instance will be created.

**Kind**: event emitted by [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Files~onBeforeSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| user | <code>object</code> | Files new instance |

<a name="event_before_delete"></a>

### "before_delete" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a / several File instance(s) will be deleted.

**Kind**: event emitted by [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Files~onBeforeDelete  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | File meta instance |

<a name="event_before_*"></a>

### "before_*" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a file instance / collection is requested

**Kind**: event emitted by [<code>Files</code>](#module_Files)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Files~onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Measurement"></a>

## Measurement
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | Generated ID. |
| value | <code>Number</code> | required. |
| timestamp | <code>Date</code> |  |
| type | <code>String</code> | OMA object ID |
| resource | <code>String</code> | OMA resource ID |
| ownerId | <code>String</code> | User ID of the developer who registers the application. |
| deviceId | <code>String</code> | Device instance Id which has sent this measurement |
| sensorId | <code>String</code> | Device instance Id which has generated this measurement |


* [Measurement](#module_Measurement)
    * _static_
        * [.publish(deviceId, measurement, [method], [client])](#module_Measurement.publish)
        * [.compose(sensor)](#module_Measurement.compose) ⇒ <code>object</code>
        * [.create(sensor)](#module_Measurement.create) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.findById(id)](#module_Measurement.findById) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [.find(filter)](#module_Measurement.find) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
        * [.replaceById(id, attributes)](#module_Measurement.replaceById) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [.replace(filter, attributes)](#module_Measurement.replace) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
        * [.destroyById(id)](#module_Measurement.destroyById) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.delete(filter)](#module_Measurement.delete) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.destroyAll(filter)](#module_Measurement.destroyAll) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * _inner_
        * [~buildQuery(app, filter, [rp])](#module_Measurement..buildQuery) ⇒ <code>Promise.&lt;string&gt;</code>
        * [~updatePoint(app, attributes, instance)](#module_Measurement..updatePoint) ⇒ <code>Promise.&lt;array&gt;</code>
        * [~getRetentionPolicies(app, filter)](#module_Measurement..getRetentionPolicies) ⇒ <code>Array.&lt;string&gt;</code>
        * [~findMeasurements(app, filter)](#module_Measurement..findMeasurements) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
        * [~updateMeasurements(app, attributes, instances)](#module_Measurement..updateMeasurements) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
        * [~deleteMeasurements(app, filter)](#module_Measurement..deleteMeasurements) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [~onBeforeRemote(app, ctx)](#module_Measurement..onBeforeRemote) ⇒ <code>Promise.&lt;object&gt;</code>
        * ["before_*" (ctx)](#event_before_*) ⇒ <code>Promise.&lt;function()&gt;</code>

<a name="module_Measurement.publish"></a>

### Measurement.publish(deviceId, measurement, [method], [client])
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  
**Emits**: <code>Server.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>object</code> | Device instance id |
| measurement | <code>object</code> | Measurement instance |
| [method] | <code>string</code> | MQTT method |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Measurement.compose"></a>

### Measurement.compose(sensor) ⇒ <code>object</code>
On sensor update, if an OMA resource is of float or integer type

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  
**Returns**: <code>object</code> - measurement  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | updated Sensor instance |

<a name="module_Measurement.create"></a>

### Measurement.create(sensor) ⇒ <code>Promise.&lt;object&gt;</code>
Create measurement

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type |
| --- | --- |
| sensor | <code>object</code> | 

<a name="module_Measurement.findById"></a>

### Measurement.findById(id) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Find measurement by id

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type |
| --- | --- |
| id | <code>string</code> | 

<a name="module_Measurement.find"></a>

### Measurement.find(filter) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
Find measurements

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type |
| --- | --- |
| filter | <code>object</code> | 

<a name="module_Measurement.replaceById"></a>

### Measurement.replaceById(id, attributes) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Update measurement by id

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| attributes | <code>object</code> | 

<a name="module_Measurement.replace"></a>

### Measurement.replace(filter, attributes) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
Update many Measurement instances

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Where filter |
| attributes | <code>object</code> |  |

<a name="module_Measurement.destroyById"></a>

### Measurement.destroyById(id) ⇒ <code>Promise.&lt;boolean&gt;</code>
Delete measurement by id

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 

<a name="module_Measurement.delete"></a>

### Measurement.delete(filter) ⇒ <code>Promise.&lt;boolean&gt;</code>
Delete measurements

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type |
| --- | --- |
| filter | <code>object</code> | 

<a name="module_Measurement.destroyAll"></a>

### Measurement.destroyAll(filter) ⇒ <code>Promise.&lt;boolean&gt;</code>
Delete many Measurement instances

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Where filter |

<a name="module_Measurement..buildQuery"></a>

### Measurement~buildQuery(app, filter, [rp]) ⇒ <code>Promise.&lt;string&gt;</code>
Build influxDB query

**Kind**: inner method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| filter | <code>object</code> | Where filter |
| [rp] | <code>object</code> | retention policy |

<a name="module_Measurement..updatePoint"></a>

### Measurement~updatePoint(app, attributes, instance) ⇒ <code>Promise.&lt;array&gt;</code>
Build influxDB query

**Kind**: inner method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| attributes | <code>object</code> |  |
| instance | <code>object</code> |  |

<a name="module_Measurement..getRetentionPolicies"></a>

### Measurement~getRetentionPolicies(app, filter) ⇒ <code>Array.&lt;string&gt;</code>
Retrieve retention policies in a where filter for Influx

**Kind**: inner method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback application |
| filter | <code>object</code> |  |

<a name="module_Measurement..findMeasurements"></a>

### Measurement~findMeasurements(app, filter) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
Find Measurement instances with filter

**Kind**: inner method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| filter | <code>object</code> | Where filter |

<a name="module_Measurement..updateMeasurements"></a>

### Measurement~updateMeasurements(app, attributes, instances) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
Update Measurement instances with filter

**Kind**: inner method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| attributes | <code>object</code> | Measurement attributes |
| instances | <code>object</code> \| <code>Array.&lt;object&gt;</code> |  |

<a name="module_Measurement..deleteMeasurements"></a>

### Measurement~deleteMeasurements(app, filter) ⇒ <code>Promise.&lt;boolean&gt;</code>
Delete Measurement instances with filter

**Kind**: inner method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| filter | <code>object</code> | Where filter |

<a name="module_Measurement..onBeforeRemote"></a>

### Measurement~onBeforeRemote(app, ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Called when a remote method tries to access Measurement Model / instance

**Kind**: inner method of [<code>Measurement</code>](#module_Measurement)  
**Returns**: <code>Promise.&lt;object&gt;</code> - context  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback App |
| ctx | <code>object</code> | Express context |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="event_before_*"></a>

### "before_*" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a measurement method is requested

**Kind**: event emitted by [<code>Measurement</code>](#module_Measurement)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Measurement~onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_OmaObject"></a>

## OmaObject
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | OmaObject ID |
| name | <code>String</code> | OmaObject name |
| description | <code>String</code> | Define OmaObject purpose. |
| resourceIds | <code>string</code> | OmaResource references contained in this OmaObjectId |
| resources | <code>object</code> | OmaResource default key : value object |

<a name="module_OmaResource"></a>

## OmaResource
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | OmaResource ID |
| name | <code>String</code> | OmaResource name |
| description | <code>String</code> | Define OmaResource purpose. |
| type | <code>string</code> | value type ( string, integer, float, ...) |
| [operations] | <code>string</code> | authorized operation ( read, write ) |
| [unit] | <code>string</code> | OmaResource unit ( meter, second, volt ... ) |
| [range] | <code>array</code> | OmaResource value range |

<a name="module_OmaViews"></a>

## OmaViews
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | OmaObject ID |
| name | <code>String</code> | OmaObject name |
| icons | <code>array</code> | List of icons url to assign in widgets |
| resources | <code>object</code> | { [OmaViewssId] : "color" } |

<a name="module_Scheduler"></a>

## Scheduler
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | Scheduler ID |
| [name] | <code>String</code> | Scheduler name |
| [model] | <code>String</code> | Aloes model ( Application, Device, ... ) |


* [Scheduler](#module_Scheduler)
    * _static_
        * [.getAll([filter])](#module_Scheduler.getAll) ⇒ <code>Promise.&lt;array&gt;</code>
        * [.deleteAll([filter])](#module_Scheduler.deleteAll) ⇒ <code>Promise.&lt;array&gt;</code>
        * [.publish(device, measurement, [method], [client])](#module_Scheduler.publish) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [.onTimeout(body)](#module_Scheduler.onTimeout) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.createOrUpdate(sensor, [client])](#module_Scheduler.createOrUpdate) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.onTick(data)](#module_Scheduler.onTick)
        * [.onTickHook(body)](#module_Scheduler.onTickHook) ⇒ <code>function</code>
        * [.setClock(interval)](#module_Scheduler.setClock) ⇒ <code>Promise.&lt;functions&gt;</code>
        * [.get(key, [cb])](#module_Scheduler.get)
        * [.set(key, value, [ttl], [cb])](#module_Scheduler.set)
        * [.delete(key, [cb])](#module_Scheduler.delete)
        * [.expire(key, [ttl], [cb])](#module_Scheduler.expire)
        * [.keys([filter], [cb])](#module_Scheduler.keys) ⇒ <code>Array.&lt;string&gt;</code>
        * [.iterateKeys([filter])](#module_Scheduler.iterateKeys) ⇒ <code>AsyncIterator</code>
    * _inner_
        * [~onTickHook(body)](#module_Scheduler..onTickHook) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [~onBeforeRemote(app, ctx)](#module_Scheduler..onBeforeRemote) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~startTimer(Scheduler, sensor, resources, client, mode)](#module_Scheduler..startTimer) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~stopTimer(Scheduler, sensor, resources, client, mode)](#module_Scheduler..stopTimer) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~parseTimerEvent(Scheduler, sensor, client)](#module_Scheduler..parseTimerEvent) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~parseTimerEvent(Scheduler, sensor, client)](#module_Scheduler..parseTimerEvent) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onTimeout(Scheduler, sensorId)](#module_Scheduler..onTimeout) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [~syncRunningTimers(Scheduler, delay)](#module_Scheduler..syncRunningTimers)
        * ["stopped"](#event_stopped) ⇒ <code>Promise.&lt;(functions\|null)&gt;</code>
        * ["stopped"](#event_stopped) ⇒ <code>Promise.&lt;(functions\|null)&gt;</code>
        * ["tick"](#event_tick) ⇒ <code>Promise.&lt;functions&gt;</code>
        * ["before_*" (ctx)](#event_before_*) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [~errorCallback](#module_Scheduler..errorCallback) : <code>function</code>
        * [~resultCallback](#module_Scheduler..resultCallback) : <code>function</code>

<a name="module_Scheduler.getAll"></a>

### Scheduler.getAll([filter]) ⇒ <code>Promise.&lt;array&gt;</code>
Find schedulers in the cache and add to device instance

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;array&gt;</code> - schedulers - Cached schedulers  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Scheduler filter |

<a name="module_Scheduler.deleteAll"></a>

### Scheduler.deleteAll([filter]) ⇒ <code>Promise.&lt;array&gt;</code>
Delete schedulers stored in cache

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;array&gt;</code> - schedulers - Cached schedulers keys  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Scheduler filter |

<a name="module_Scheduler.publish"></a>

### Scheduler.publish(device, measurement, [method], [client]) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - scheduler  
**Emits**: <code>Server.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found Device instance |
| measurement | <code>object</code> | Scheduler instance |
| [method] | <code>string</code> | MQTT method |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Scheduler.onTimeout"></a>

### Scheduler.onTimeout(body) ⇒ <code>Promise.&lt;function()&gt;</code>
Scheduler timeout callback / webhook ( sensor timer )

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - onTimeout  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>object</code> | Timer callback body |

<a name="module_Scheduler.createOrUpdate"></a>

### Scheduler.createOrUpdate(sensor, [client]) ⇒ <code>Promise.&lt;object&gt;</code>
Create or update scheduler stored in cache

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;object&gt;</code> - scheduler - Updated scheduler  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | found Sensor instance |
| [client] | <code>object</code> | MQTT client |

<a name="module_Scheduler.onTick"></a>

### Scheduler.onTick(data)
Scheduler tick event ( scheduler clock )

Update every sensor having an active scheduler

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Emits**: <code>Scheduler.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Timer event data |

<a name="module_Scheduler.onTickHook"></a>

### Scheduler.onTickHook(body) ⇒ <code>function</code>
Endpoint for Scheduler external timeout hooks

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>function</code> - Scheduler~onTickHook  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>object</code> | Timer callback data |

<a name="module_Scheduler.setClock"></a>

### Scheduler.setClock(interval) ⇒ <code>Promise.&lt;functions&gt;</code>
Init clock to synchronize with every active schedulers

if EXTERNAL_TIMER is enabled, Scheduler will use Skyring external timer handler

else a DeltaTimer instance will be created and stored in memory

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;functions&gt;</code> - setExternalClock | setInternalClock  

| Param | Type | Description |
| --- | --- | --- |
| interval | <code>number</code> | Timeout interval |

<a name="module_Scheduler.get"></a>

### Scheduler.get(key, [cb])
Get Scheduler by key
Use callback or promise

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Promise**: result  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [cb] | <code>resultCallback</code> | Optional callback |

<a name="module_Scheduler.set"></a>

### Scheduler.set(key, value, [ttl], [cb])
Set Scheduler by key, with optional TTL

Use callback or promise

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| value | <code>string</code> |  |
| [ttl] | <code>number</code> |  |
| [cb] | <code>ErrorCallback</code> | Optional callback |

<a name="module_Scheduler.delete"></a>

### Scheduler.delete(key, [cb])
Delete Scheduler by key

Use callback or promise

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [cb] | <code>ErrorCallback</code> | Optional callback |

<a name="module_Scheduler.expire"></a>

### Scheduler.expire(key, [ttl], [cb])
Set the TTL (time to live) in ms (milliseconds) for a given key

Use callback or promise

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [ttl] | <code>number</code> |  |
| [cb] | <code>ErrorCallback</code> | Optional callback |

<a name="module_Scheduler.keys"></a>

### Scheduler.keys([filter], [cb]) ⇒ <code>Array.&lt;string&gt;</code>
Get all Scheduler keys

Use callback or promise

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> |  |
| filter.match | <code>object</code> | Glob string used to filter returned keys (i.e. userid.*) |
| [cb] | <code>function</code> |  |

<a name="module_Scheduler.iterateKeys"></a>

### Scheduler.iterateKeys([filter]) ⇒ <code>AsyncIterator</code>
Iterate over all Scheduler keys

Use callback or promise

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>AsyncIterator</code> - An Object implementing next(cb) -> Promise function that can be used to iterate all keys.  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> |  |
| filter.match | <code>object</code> | Glob string used to filter returned keys (i.e. userid.*) |

<a name="module_Scheduler..onTickHook"></a>

### Scheduler~onTickHook(body) ⇒ <code>Promise.&lt;boolean&gt;</code>
Scheduler timeout callback ( scheduler clock )

validate webhook content before dispatch

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Emits**: <code>Scheduler.event:tick</code>  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>object</code> | Timer callback data |

<a name="module_Scheduler..onBeforeRemote"></a>

### Scheduler~onBeforeRemote(app, ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Called when a remote method tries to access Scheduler Model / instance

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;object&gt;</code> - context  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback App |
| ctx | <code>object</code> | Express context |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Scheduler..startTimer"></a>

### Scheduler~startTimer(Scheduler, sensor, resources, client, mode) ⇒ <code>Promise.&lt;object&gt;</code>
Start a timer instance based on sensor resources ( startInternalTimer | startExternalTimer )

Update Sensor resources

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;object&gt;</code> - scheduler  

| Param | Type | Description |
| --- | --- | --- |
| Scheduler | <code>object</code> | Scheduler Model |
| sensor | <code>object</code> | Sensor instance |
| resources | <code>object</code> | Sensor instance resources |
| client | <code>object</code> | MQTT client |
| mode | <code>number</code> | Timer mode |

<a name="module_Scheduler..stopTimer"></a>

### Scheduler~stopTimer(Scheduler, sensor, resources, client, mode) ⇒ <code>Promise.&lt;object&gt;</code>
Stop a timer instance based on sensor resources ( stopInternalTimer | stopExternalTimer )

Update Sensor resources

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;object&gt;</code> - scheduler  

| Param | Type | Description |
| --- | --- | --- |
| Scheduler | <code>object</code> | Scheduler Model |
| sensor | <code>object</code> | Sensor instance |
| resources | <code>object</code> | Sensor instance resources |
| client | <code>object</code> | MQTT client |
| mode | <code>number</code> | Timer mode |

<a name="module_Scheduler..parseTimerEvent"></a>

### Scheduler~parseTimerEvent(Scheduler, sensor, client) ⇒ <code>Promise.&lt;object&gt;</code>
Parse a timer event and dispatch to the proper function

( startTimer | stopTimer )

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;object&gt;</code> - scheduler  

| Param | Type | Description |
| --- | --- | --- |
| Scheduler | <code>object</code> | Scheduler Model |
| sensor | <code>object</code> | Sensor instance |
| client | <code>object</code> | MQTT client |

<a name="module_Scheduler..parseTimerEvent"></a>

### Scheduler~parseTimerEvent(Scheduler, sensor, client) ⇒ <code>Promise.&lt;object&gt;</code>
Parse a timer state and dispatch to the proper function

( startTimer | stopTimer )

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;object&gt;</code> - scheduler  

| Param | Type | Description |
| --- | --- | --- |
| Scheduler | <code>object</code> | Scheduler Model |
| sensor | <code>object</code> | Sensor instance |
| client | <code>object</code> | MQTT client |

<a name="module_Scheduler..onTimeout"></a>

### Scheduler~onTimeout(Scheduler, sensorId) ⇒ <code>Promise.&lt;boolean&gt;</code>
Method called by a timer instance at timeout

( startTimer | stopTimer )

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - status  

| Param | Type | Description |
| --- | --- | --- |
| Scheduler | <code>object</code> | Scheduler Model |
| sensorId | <code>object</code> | Sensor instance id |

<a name="module_Scheduler..syncRunningTimers"></a>

### Scheduler~syncRunningTimers(Scheduler, delay)
Method called by a timer instance at timeout

Update active Scheduler and related Sensor instances

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  

| Param | Type | Description |
| --- | --- | --- |
| Scheduler | <code>object</code> | Scheduler Model |
| delay | <code>object</code> | Sensor instance id |

<a name="event_stopped"></a>

### "stopped" ⇒ <code>Promise.&lt;(functions\|null)&gt;</code>
Event reporting that application started

Trigger Scheduler starting routine

**Kind**: event emitted by [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;(functions\|null)&gt;</code> - Scheduler.setClock  
<a name="event_stopped"></a>

### "stopped" ⇒ <code>Promise.&lt;(functions\|null)&gt;</code>
Event reporting that application stopped

Trigger Scheduler stopping routine

**Kind**: event emitted by [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;(functions\|null)&gt;</code> - Scheduler.delClock  
<a name="event_tick"></a>

### "tick" ⇒ <code>Promise.&lt;functions&gt;</code>
Event reporting tick

Trigger Scheduler tick routine

**Kind**: event emitted by [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;functions&gt;</code> - Scheduler.onTick  
<a name="event_before_*"></a>

### "before_*" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a Scheduler method is requested

**Kind**: event emitted by [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Scheduler~onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Scheduler..errorCallback"></a>

### Scheduler~errorCallback : <code>function</code>
Optional error callback

**Kind**: inner typedef of [<code>Scheduler</code>](#module_Scheduler)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 

<a name="module_Scheduler..resultCallback"></a>

### Scheduler~resultCallback : <code>function</code>
Optional result callback

**Kind**: inner typedef of [<code>Scheduler</code>](#module_Scheduler)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 
| result | <code>object</code> | 

<a name="module_SensorResource"></a>

## SensorResource
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| resource | <code>String</code> | Stringified Sensor resource instance |


* [SensorResource](#module_SensorResource)
    * _static_
        * [.deleteAll([filter])](#module_SensorResource.deleteAll) ⇒ <code>Array.&lt;object&gt;</code>
        * [.deleteAll([filter])](#module_SensorResource.deleteAll) ⇒ <code>Array.&lt;string&gt;</code>
        * [.find(deviceId, sensorId, [resourceId])](#module_SensorResource.find) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
        * [.save(deviceId, sensorId, resources, [ttl])](#module_SensorResource.save) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
        * [.remove(deviceId, sensorId, [resourceId])](#module_SensorResource.remove) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.expireCache(deviceId, sensorId, resourceId, [ttl])](#module_SensorResource.expireCache) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.get(key, [cb])](#module_SensorResource.get)
        * [.set(key, value, [ttl], [cb])](#module_SensorResource.set)
        * [.delete(key, [cb])](#module_SensorResource.delete)
        * [.expire(key, [ttl], [cb])](#module_SensorResource.expire)
        * [.keys([filter], [cb])](#module_SensorResource.keys) ⇒ <code>Array.&lt;string&gt;</code>
        * [.iterateKeys([filter])](#module_SensorResource.iterateKeys) ⇒ <code>AsyncIterator</code>
    * _inner_
        * [~errorCallback](#module_SensorResource..errorCallback) : <code>function</code>
        * [~resultCallback](#module_SensorResource..resultCallback) : <code>function</code>

<a name="module_SensorResource.deleteAll"></a>

### SensorResource.deleteAll([filter]) ⇒ <code>Array.&lt;object&gt;</code>
Get SensorResource instances stored in cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>Array.&lt;object&gt;</code> - resources - Cached sensorResources  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Key filter |

<a name="module_SensorResource.deleteAll"></a>

### SensorResource.deleteAll([filter]) ⇒ <code>Array.&lt;string&gt;</code>
Delete SensorResource instance(s) stored in cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>Array.&lt;string&gt;</code> - resources - Cached SensorResource keys  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Key filter |

<a name="module_SensorResource.find"></a>

### SensorResource.find(deviceId, sensorId, [resourceId]) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
Find SensorResource instance(s) from the cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code> - resources  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensorId | <code>string</code> | Sensor instance Id |
| [resourceId] | <code>string</code> | OMA Resource key |

<a name="module_SensorResource.save"></a>

### SensorResource.save(deviceId, sensorId, resources, [ttl]) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
Create or update SensorResource instance(s) into the cache memory

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code> - resources  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensorId | <code>string</code> | Sensor Id owning the resource |
| resources | <code>object</code> | Resource(s) instance to save |
| [ttl] | <code>number</code> | Expire delay |

<a name="module_SensorResource.remove"></a>

### SensorResource.remove(deviceId, sensorId, [resourceId]) ⇒ <code>Promise.&lt;boolean&gt;</code>
Delete a SensorResource instance(s) stored in cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - success  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensorId | <code>string</code> | Sensor instance Id |
| [resourceId] | <code>string</code> | OMA Resource key |

<a name="module_SensorResource.expireCache"></a>

### SensorResource.expireCache(deviceId, sensorId, resourceId, [ttl]) ⇒ <code>Promise.&lt;boolean&gt;</code>
Set TTL for a sensor stored in cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - success  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensorId | <code>string</code> | Sensor instance Id |
| resourceId | <code>string</code> | OMA Resource key |
| [ttl] | <code>number</code> | Sensor instance Id |

<a name="module_SensorResource.get"></a>

### SensorResource.get(key, [cb])
Get SensorResource by key

Use callback or promise

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Promise**: result  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [cb] | <code>resultCallback</code> | Optional callback |

<a name="module_SensorResource.set"></a>

### SensorResource.set(key, value, [ttl], [cb])
Set SensorResource by key, with optional TTL

Use callback or promise

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| value | <code>string</code> |  |
| [ttl] | <code>number</code> |  |
| [cb] | <code>ErrorCallback</code> | Optional callback |

<a name="module_SensorResource.delete"></a>

### SensorResource.delete(key, [cb])
Delete SensorResource by key

Use callback or promise

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [cb] | <code>ErrorCallback</code> | Optional callback |

<a name="module_SensorResource.expire"></a>

### SensorResource.expire(key, [ttl], [cb])
Set the TTL (time to live) in ms (milliseconds) for a given key

Use callback or promise

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Promise**: undefined  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> |  |
| [ttl] | <code>number</code> |  |
| [cb] | <code>ErrorCallback</code> | Optional callback |

<a name="module_SensorResource.keys"></a>

### SensorResource.keys([filter], [cb]) ⇒ <code>Array.&lt;string&gt;</code>
Get all SensorResource keys

Use callback or promise

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> |  |
| filter.match | <code>object</code> | Glob string used to filter returned keys (i.e. userid.*) |
| [cb] | <code>function</code> |  |

<a name="module_SensorResource.iterateKeys"></a>

### SensorResource.iterateKeys([filter]) ⇒ <code>AsyncIterator</code>
Iterate over all SensorResource keys

Use callback or promise

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>AsyncIterator</code> - An Object implementing next(cb) -> Promise function that can be used to iterate all keys.  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> |  |
| filter.match | <code>object</code> | Glob string used to filter returned keys (i.e. userid.*) |

<a name="module_SensorResource..errorCallback"></a>

### SensorResource~errorCallback : <code>function</code>
Optional error callback

**Kind**: inner typedef of [<code>SensorResource</code>](#module_SensorResource)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 

<a name="module_SensorResource..resultCallback"></a>

### SensorResource~resultCallback : <code>function</code>
Optional result callback

**Kind**: inner typedef of [<code>SensorResource</code>](#module_SensorResource)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 
| result | <code>string</code> | 

<a name="module_Sensor"></a>

## Sensor
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Database generated ID. |
| name | <code>string</code> | required. |
| devEui | <code>string</code> | hardware generated Device Id required. |
| createdAt | <code>date</code> |  |
| lastSignal | <code>date</code> |  |
| frameCounter | <code>number</code> | Number of messages since last connection |
| type | <code>string</code> | OMA object ID, used to format resources schema |
| resource | <code>string</code> | OMA resource ID used for last message |
| resources | <code>array</code> | OMA Resources ( formatted object where sensor value and settings are stored ) |
| icons | <code>array</code> | OMA Object icons URL |
| colors | <code>bject</code> | OMA Resource colors |
| transportProtocol | <code>string</code> | Framework used for message transportation |
| transportProtocolVersion | <code>string</code> | Framework version |
| messageProtocol | <code>string</code> | Framework used for message encoding |
| messageProtocolVersion | <code>string</code> | Framework version |
| nativeSensorId | <code>string</code> | Original sensor id ( stringified integer ) |
| [nativeNodeId] | <code>string</code> | Original node id ( stringified integer ) |
| nativeType | <code>string</code> | Original sensor type identifier |
| nativeResource | <code>string</code> | Original sensor variables identifier |
| ownerId | <code>string</code> | User ID of the developer who registers the application. |
| deviceId | <code>string</code> | Device instance Id which has sent this measurement |


* [Sensor](#module_Sensor)
    * _instance_
        * [.__findById__sensors(id)](#module_Sensor+__findById__sensors) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.__get__resources()](#module_Sensor+__get__resources) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.__findById__resources(id)](#module_Sensor+__findById__resources) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.__create__resources(resources)](#module_Sensor+__create__resources) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.__replace__resources(resources)](#module_Sensor+__replace__resources) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.__delete__resources()](#module_Sensor+__delete__resources) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.__get__measurements(filter)](#module_Sensor+__get__measurements) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
        * [.__findById__measurements(id)](#module_Sensor+__findById__measurements) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.__create__measurements(measurement)](#module_Sensor+__create__measurements) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.__replace__measurements(attributes, filter)](#module_Sensor+__replace__measurements) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
        * [.__delete__measurements(filter)](#module_Sensor+__delete__measurements) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * _static_
        * [.createOrUpdate(device, [client])](#module_Sensor.createOrUpdate) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.publish(device, sensor, [method], [client])](#module_Sensor.publish) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [.compose(device, attributes)](#module_Sensor.compose) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.handlePresentation(sensor, [client])](#module_Sensor.handlePresentation) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.createOrUpdate(sensor, resourceKey, resourceValue, [client])](#module_Sensor.createOrUpdate) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.getInstance(sensor, [client])](#module_Sensor.getInstance) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.onPublish(device, attributes, [sensor], client)](#module_Sensor.onPublish) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [.search(filter)](#module_Sensor.search) ⇒ <code>Promise.&lt;array&gt;</code>
        * [.export(sensors, [format])](#module_Sensor.export) ⇒ <code>Promise.&lt;string&gt;</code>
        * [.find(filter)](#module_Sensor.find) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.count(where)](#module_Sensor.count) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.findById(id, filter)](#module_Sensor.findById) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.create(sensor)](#module_Sensor.create) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.updateById(id, filter)](#module_Sensor.updateById) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.deleteById(id, filter)](#module_Sensor.deleteById) ⇒ <code>Promise.&lt;object&gt;</code>
    * _inner_
        * [~typeValidator(err)](#module_Sensor..typeValidator)
        * [~resourceValidator(err)](#module_Sensor..resourceValidator)
        * [~transportProtocolValidator(err)](#module_Sensor..transportProtocolValidator)
        * [~messageProtocolValidator(err)](#module_Sensor..messageProtocolValidator)
        * [~compose(device, attributes, isNewInstance)](#module_Sensor..compose) ⇒ <code>object</code>
        * [~getPersistingMethod(sensorType, resource, type)](#module_Sensor..getPersistingMethod) ⇒ <code>number</code>
        * [~saveFile(app, sensor)](#module_Sensor..saveFile) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~saveMeasurement(app, sensor, client)](#module_Sensor..saveMeasurement) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [~saveScheduler(app, sensor, client)](#module_Sensor..saveScheduler) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~persistingResource(app, sensor, [client])](#module_Sensor..persistingResource) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onBeforeSave(ctx)](#module_Sensor..onBeforeSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onAfterSave(ctx)](#module_Sensor..onAfterSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~deleteProps(app, instance)](#module_Sensor..deleteProps) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [~onBeforeDelete(ctx)](#module_Sensor..onBeforeDelete) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onBeforeRemote(app, ctx)](#module_Sensor..onBeforeRemote) ⇒ <code>Promise.&lt;object&gt;</code>
        * ["publish" (message)](#event_publish) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
        * ["before_save" (ctx)](#event_before_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["after_save" (ctx)](#event_after_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_delete" (ctx)](#event_before_delete) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_*" (ctx)](#event_before_*) ⇒ <code>Promise.&lt;function()&gt;</code>
        * [~errorCallback](#module_Sensor..errorCallback) : <code>function</code>

<a name="module_Sensor+__findById__sensors"></a>

### sensor.\_\_findById\_\_sensors(id) ⇒ <code>Promise.&lt;function()&gt;</code>
Get device sensors by id

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - module:Sensor.findById  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Resource key |

<a name="module_Sensor+__get__resources"></a>

### sensor.\_\_get\_\_resources() ⇒ <code>Promise.&lt;function()&gt;</code>
Get sensor resources from key/value store

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - module:SensorResource.find  
<a name="module_Sensor+__findById__resources"></a>

### sensor.\_\_findById\_\_resources(id) ⇒ <code>Promise.&lt;function()&gt;</code>
Get sensor resources from key/value store by key

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - module:SensorResource.find  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Resource key |

<a name="module_Sensor+__create__resources"></a>

### sensor.\_\_create\_\_resources(resources) ⇒ <code>Promise.&lt;function()&gt;</code>
Create sensor resources in key/value store

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - module:SensorResource.save  

| Param | Type | Description |
| --- | --- | --- |
| resources | <code>object</code> | Resources key/value object |

<a name="module_Sensor+__replace__resources"></a>

### sensor.\_\_replace\_\_resources(resources) ⇒ <code>Promise.&lt;function()&gt;</code>
Replace sensor resources in key/value store

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - module:SensorResource.save  

| Param | Type | Description |
| --- | --- | --- |
| resources | <code>object</code> | Resources key/value object |

<a name="module_Sensor+__delete__resources"></a>

### sensor.\_\_delete\_\_resources() ⇒ <code>Promise.&lt;function()&gt;</code>
Delete sensor resources from key/value store

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - module:SensorResource.remove  
<a name="module_Sensor+__get__measurements"></a>

### sensor.\_\_get\_\_measurements(filter) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
Get sensor measurement from timeseries store

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;Array.&lt;object&gt;&gt;</code> - module:Measurement.find  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Measurement filter |

<a name="module_Sensor+__findById__measurements"></a>

### sensor.\_\_findById\_\_measurements(id) ⇒ <code>Promise.&lt;function()&gt;</code>
Get sensor measurement from timeseries store by id

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - module:Measurement.findById  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Resource key |

<a name="module_Sensor+__create__measurements"></a>

### sensor.\_\_create\_\_measurements(measurement) ⇒ <code>Promise.&lt;object&gt;</code>
Create sensor measurement in timeseries store

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| measurement | <code>object</code> | 

<a name="module_Sensor+__replace__measurements"></a>

### sensor.\_\_replace\_\_measurements(attributes, filter) ⇒ <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code>
Replace sensor measurement in timeseries store

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;(Array.&lt;object&gt;\|null)&gt;</code> - module:Measurement.replace  

| Param | Type |
| --- | --- |
| attributes | <code>object</code> | 
| filter | <code>object</code> | 

<a name="module_Sensor+__delete__measurements"></a>

### sensor.\_\_delete\_\_measurements(filter) ⇒ <code>Promise.&lt;boolean&gt;</code>
Delete sensor measurement from timeseries store

**Kind**: instance method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - module:Measurement.delete  

| Param | Type |
| --- | --- |
| filter | <code>object</code> | 

<a name="module_Sensor.createOrUpdate"></a>

### Sensor.createOrUpdate(device, [client]) ⇒ <code>Promise.&lt;object&gt;</code>
When POST or PUT method detected, update device instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | detected Device instance |
| [client] | <code>object</code> | MQTT client |

<a name="module_Sensor.publish"></a>

### Sensor.publish(device, sensor, [method], [client]) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - sensor  
**Emits**: <code>Server.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found Device instance |
| sensor | <code>object</code> | Sensor instance |
| [method] | <code>string</code> | MQTT API method |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Sensor.compose"></a>

### Sensor.compose(device, attributes) ⇒ <code>Promise.&lt;object&gt;</code>
When device found,validate sensor instance produced by IoTAgent

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found device instance |
| attributes | <code>object</code> | IotAgent parsed message |

<a name="module_Sensor.handlePresentation"></a>

### Sensor.handlePresentation(sensor, [client]) ⇒ <code>Promise.&lt;function()&gt;</code>
When HEAD method detected, update sensor instance ( not the value )

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Sensor.publish  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | Incoming sensor instance |
| [client] | <code>object</code> | MQTT client |

<a name="module_Sensor.createOrUpdate"></a>

### Sensor.createOrUpdate(sensor, resourceKey, resourceValue, [client]) ⇒ <code>Promise.&lt;object&gt;</code>
When POST or PUT method detected, validate sensor.resource and value, then save sensor instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | Incoming Densor instance |
| resourceKey | <code>number</code> | Sensor resource name ( OMA ) |
| resourceValue | <code>object</code> | Sensor resource value to save |
| [client] | <code>object</code> | MQTT client |

<a name="module_Sensor.getInstance"></a>

### Sensor.getInstance(sensor, [client]) ⇒ <code>Promise.&lt;object&gt;</code>
When GET method detected, find and publish instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | Incoming sensor instance |
| [client] | <code>object</code> | MQTT client |

<a name="module_Sensor.onPublish"></a>

### Sensor.onPublish(device, attributes, [sensor], client) ⇒ <code>Promise.&lt;function()&gt;</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Sensor.execute  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Found Device instance |
| attributes | <code>object</code> | Sensor attributes detected by Iot-Agent |
| [sensor] | <code>object</code> | Found Sensor instance |
| client | <code>object</code> | MQTT client |

<a name="module_Sensor.search"></a>

### Sensor.search(filter) ⇒ <code>Promise.&lt;array&gt;</code>
Search sensor by keywords ( name, type, )

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;array&gt;</code> - sensors  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Requested filter |

<a name="module_Sensor.export"></a>

### Sensor.export(sensors, [format]) ⇒ <code>Promise.&lt;string&gt;</code>
Export sensors list from JSON to {format}

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| sensors | <code>array</code> | 
| [format] | <code>string</code> | 

<a name="module_Sensor.find"></a>

### Sensor.find(filter) ⇒ <code>Promise.&lt;object&gt;</code>
Find sensors

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| filter | <code>object</code> | 

<a name="module_Sensor.count"></a>

### Sensor.count(where) ⇒ <code>Promise.&lt;number&gt;</code>
Returns sensors length

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| where | <code>object</code> | 

<a name="module_Sensor.findById"></a>

### Sensor.findById(id, filter) ⇒ <code>Promise.&lt;object&gt;</code>
Find sensor by id

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Sensor.create"></a>

### Sensor.create(sensor) ⇒ <code>Promise.&lt;object&gt;</code>
Create sensor

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| sensor | <code>object</code> | 

<a name="module_Sensor.updateById"></a>

### Sensor.updateById(id, filter) ⇒ <code>Promise.&lt;object&gt;</code>
Update sensor by id

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Sensor.deleteById"></a>

### Sensor.deleteById(id, filter) ⇒ <code>Promise.&lt;object&gt;</code>
Delete sensor by id

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 
| filter | <code>object</code> | 

<a name="module_Sensor..typeValidator"></a>

### Sensor~typeValidator(err)
Validate sensor type before saving instance

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| err | <code>ErrorCallback</code> | 

<a name="module_Sensor..resourceValidator"></a>

### Sensor~resourceValidator(err)
Validate sensor resource before saving instance

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| err | <code>ErrorCallback</code> | 

<a name="module_Sensor..transportProtocolValidator"></a>

### Sensor~transportProtocolValidator(err)
Validate sensor transportProtocol before saving instance

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| err | <code>ErrorCallback</code> | 

<a name="module_Sensor..messageProtocolValidator"></a>

### Sensor~messageProtocolValidator(err)
Validate sensor messageProtocol before saving instance

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| err | <code>ErrorCallback</code> | 

<a name="module_Sensor..compose"></a>

### Sensor~compose(device, attributes, isNewInstance) ⇒ <code>object</code>
Compose a sensor instance from a device and retrieved attributes

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>object</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |
| attributes | <code>object</code> | Sensor attributes |
| isNewInstance | <code>object</code> | Flag to indicate that the sensor is a new instance |

<a name="module_Sensor..getPersistingMethod"></a>

### Sensor~getPersistingMethod(sensorType, resource, type) ⇒ <code>number</code>
Define the way to persist data based on OMA resource type

SaveMethods :
buffer: 10,
location: 20,
log: 30,
measurement: 40,
scheduler: 50,

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>number</code> - method  

| Param | Type | Description |
| --- | --- | --- |
| sensorType | <code>string</code> | OMA object Id |
| resource | <code>number</code> | OMA resource ID |
| type | <code>string</code> | OMA resource type |

<a name="module_Sensor..saveFile"></a>

### Sensor~saveFile(app, sensor) ⇒ <code>Promise.&lt;object&gt;</code>
Save a sensor resource as a file

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - fileMeta  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| sensor | <code>object</code> | Sensor instance |

<a name="module_Sensor..saveMeasurement"></a>

### Sensor~saveMeasurement(app, sensor, client) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Save a sensor resource as a measurement

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - measurement  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| sensor | <code>object</code> | Sensor instance |
| client | <code>object</code> | MQTT client |

<a name="module_Sensor..saveScheduler"></a>

### Sensor~saveScheduler(app, sensor, client) ⇒ <code>Promise.&lt;object&gt;</code>
Save a sensor resource as a timer

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - scheduler  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| sensor | <code>object</code> | Sensor instance |
| client | <code>object</code> | MQTT client |

<a name="module_Sensor..persistingResource"></a>

### Sensor~persistingResource(app, sensor, [client]) ⇒ <code>Promise.&lt;object&gt;</code>
Persist data based on OMA resource type

use influxdb for integers and floats

use filestorage for strings and buffers

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - result - saved value  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| sensor | <code>object</code> | Sensor instance |
| [client] | <code>object</code> | MQTT client |

<a name="module_Sensor..onBeforeSave"></a>

### Sensor~onBeforeSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Validate instance before creation

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Sensor..onAfterSave"></a>

### Sensor~onAfterSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Create relations on instance creation

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Sensor..deleteProps"></a>

### Sensor~deleteProps(app, instance) ⇒ <code>Promise.&lt;boolean&gt;</code>
Remove sensor dependencies

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| instance | <code>object</code> |  |

<a name="module_Sensor..onBeforeDelete"></a>

### Sensor~onBeforeDelete(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Delete relations on instance(s) deletetion

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_Sensor..onBeforeRemote"></a>

### Sensor~onBeforeRemote(app, ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Called when a remote method tries to access Sensor Model / instance

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;object&gt;</code> - context  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback App |
| ctx | <code>object</code> | Express context |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="event_publish"></a>

### "publish" (message) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
Event reporting that a device client sent sensors update.

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;(function()\|null)&gt;</code> - Sensor.onPublish  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.device | <code>object</code> | found device instance. |
| message.pattern | <code>object</code> | Pattern detected by Iot-Agent |
| message.attributes | <code>object</code> | IotAgent parsed message |
| [message.sensor] | <code>object</code> | Found sensor instance |
| message.client | <code>object</code> | MQTT client |

<a name="event_before_save"></a>

### "before_save" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a sensor instance will be created or updated.

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Sensor~onBeforeSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Sensor instance |

<a name="event_after_save"></a>

### "after_save" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a sensor instance has been created or updated.

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Sensor~onAfterSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Sensor instance |

<a name="event_before_delete"></a>

### "before_delete" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a/several sensor instance(s) will be deleted.

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Sensor~onBeforeDelete  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | Sensor id |

<a name="event_before_*"></a>

### "before_*" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a sensor method is requested

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Sensor~onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Sensor..errorCallback"></a>

### Sensor~errorCallback : <code>function</code>
Error callback

**Kind**: inner typedef of [<code>Sensor</code>](#module_Sensor)  

| Param | Type |
| --- | --- |
| ErrorObject | <code>error</code> | 

<a name="module_User"></a>

## User
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Database generated ID |
| firstName | <code>string</code> |  |
| lastName | <code>string</code> |  |
| fullName | <code>string</code> |  |
| fullAddress | <code>string</code> |  |
| avatarImgUrl | <code>string</code> |  |
| headerImgUrl | <code>string</code> |  |
| status | <code>boolean</code> |  |
| roleName | <code>string</code> | admin or user |


* [User](#module_User)
    * _static_
        * [.findByEmail(email)](#module_User.findByEmail) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.verifyEmail(user)](#module_User.verifyEmail) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.updatePasswordFromToken(accessToken, newPassword)](#module_User.updatePasswordFromToken) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.setNewPassword(ctx, oldPassword, newPassword)](#module_User.setNewPassword) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.sendContactForm(form)](#module_User.sendContactForm) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.sendInvite(options)](#module_User.sendInvite) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.updateStatus(client, status)](#module_User.updateStatus) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.find(filter)](#module_User.find) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.count(where)](#module_User.count) ⇒ <code>Promise.&lt;number&gt;</code>
        * [.findById(id)](#module_User.findById) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.create(user)](#module_User.create) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.updateById(id)](#module_User.updateById) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.deleteById(id)](#module_User.deleteById) ⇒ <code>Promise.&lt;object&gt;</code>
    * _inner_
        * [~createProps(app, user)](#module_User..createProps) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
        * [~onBeforeSave(ctx)](#module_User..onBeforeSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onAfterSave(ctx)](#module_User..onAfterSave) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onBeforeLogin(ctx)](#module_User..onBeforeLogin) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~deleteProps(app, user)](#module_User..deleteProps) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [~onBeforeDelete(ctx)](#module_User..onBeforeDelete) ⇒ <code>Promise.&lt;object&gt;</code>
        * [~onBeforeRemote(ctx)](#module_User..onBeforeRemote) ⇒ <code>Promise.&lt;object&gt;</code>
        * ["attached"](#event_attached)
        * ["verifyEmail" (user)](#event_verifyEmail) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["sendContactForm" (options)](#event_sendContactForm) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["sendMailInvite" (options)](#event_sendMailInvite) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["resetPasswordRequest" (options)](#event_resetPasswordRequest) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["client" (message)](#event_client) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
        * ["before_save" (ctx, user)](#event_before_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["after_save" (ctx, user)](#event_after_save) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_delete" (ctx)](#event_before_delete) ⇒ <code>Promise.&lt;function()&gt;</code>
        * ["before_*" (ctx)](#event_before_*) ⇒ <code>Promise.&lt;function()&gt;</code>

<a name="module_User.findByEmail"></a>

### User.findByEmail(email) ⇒ <code>Promise.&lt;object&gt;</code>
Find a user by its email address and send a confirmation link

**Kind**: static method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - user  

| Param | Type | Description |
| --- | --- | --- |
| email | <code>string</code> | User email address |

<a name="module_User.verifyEmail"></a>

### User.verifyEmail(user) ⇒ <code>Promise.&lt;object&gt;</code>
Send a confirmation link to confirm signup

**Kind**: static method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - user  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | User instance |

<a name="module_User.updatePasswordFromToken"></a>

### User.updatePasswordFromToken(accessToken, newPassword) ⇒ <code>Promise.&lt;boolean&gt;</code>
Updating user password using an authorization token

**Kind**: static method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - result  

| Param | Type | Description |
| --- | --- | --- |
| accessToken | <code>object</code> | User instance |
| newPassword | <code>string</code> | User new password |

<a name="module_User.setNewPassword"></a>

### User.setNewPassword(ctx, oldPassword, newPassword) ⇒ <code>Promise.&lt;object&gt;</code>
Updating user password

**Kind**: static method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - user  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| oldPassword | <code>string</code> |  |
| newPassword | <code>string</code> |  |

<a name="module_User.sendContactForm"></a>

### User.sendContactForm(form) ⇒ <code>Promise.&lt;boolean&gt;</code>
Sending a request to admin

**Kind**: static method of [<code>User</code>](#module_User)  
**Emits**: <code>User.event:sendContactForm</code>  

| Param | Type | Description |
| --- | --- | --- |
| form | <code>object</code> | Client form options |

<a name="module_User.sendInvite"></a>

### User.sendInvite(options) ⇒ <code>Promise.&lt;boolean&gt;</code>
Sending a mail invitation to a new user

**Kind**: static method of [<code>User</code>](#module_User)  
**Emits**: <code>User.event:sendMailInvite</code>  

| Param | Type |
| --- | --- |
| options | <code>object</code> | 

<a name="module_User.updateStatus"></a>

### User.updateStatus(client, status) ⇒ <code>Promise.&lt;object&gt;</code>
Update client (as the user) status from MQTT connection status

**Kind**: static method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - client  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT parsed client |
| status | <code>boolean</code> | MQTT connection status |

<a name="module_User.find"></a>

### User.find(filter) ⇒ <code>Promise.&lt;object&gt;</code>
Find users

**Kind**: static method of [<code>User</code>](#module_User)  

| Param | Type |
| --- | --- |
| filter | <code>object</code> | 

<a name="module_User.count"></a>

### User.count(where) ⇒ <code>Promise.&lt;number&gt;</code>
Returns users length

**Kind**: static method of [<code>User</code>](#module_User)  

| Param | Type |
| --- | --- |
| where | <code>object</code> | 

<a name="module_User.findById"></a>

### User.findById(id) ⇒ <code>Promise.&lt;object&gt;</code>
Find user by id

**Kind**: static method of [<code>User</code>](#module_User)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 

<a name="module_User.create"></a>

### User.create(user) ⇒ <code>Promise.&lt;object&gt;</code>
Create user

**Kind**: static method of [<code>User</code>](#module_User)  

| Param | Type |
| --- | --- |
| user | <code>object</code> | 

<a name="module_User.updateById"></a>

### User.updateById(id) ⇒ <code>Promise.&lt;object&gt;</code>
Update user by id

**Kind**: static method of [<code>User</code>](#module_User)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 

<a name="module_User.deleteById"></a>

### User.deleteById(id) ⇒ <code>Promise.&lt;object&gt;</code>
Delete user by id

**Kind**: static method of [<code>User</code>](#module_User)  

| Param | Type |
| --- | --- |
| id | <code>any</code> | 

<a name="module_User..createProps"></a>

### User~createProps(app, user) ⇒ <code>Promise.&lt;(object\|null)&gt;</code>
Create dependencies after a new user has been created

**Kind**: inner method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;(object\|null)&gt;</code> - user  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| user | <code>object</code> | New user instance |

<a name="module_User..onBeforeSave"></a>

### User~onBeforeSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Validate instance before creation

**Kind**: inner method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_User..onAfterSave"></a>

### User~onAfterSave(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Create relations on instance creation

**Kind**: inner method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_User..onBeforeLogin"></a>

### User~onBeforeLogin(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Control access validity and limit access if needed before login request

Incrementing counter on failure and resetting it on success

**Kind**: inner method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_User..deleteProps"></a>

### User~deleteProps(app, user) ⇒ <code>Promise.&lt;boolean&gt;</code>
Delete relations on instance(s) deletion

**Kind**: inner method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| user | <code>object</code> | user to delete |

<a name="module_User..onBeforeDelete"></a>

### User~onBeforeDelete(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Delete registered user

**Kind**: inner method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="module_User..onBeforeRemote"></a>

### User~onBeforeRemote(ctx) ⇒ <code>Promise.&lt;object&gt;</code>
Hook executed before every remote methods

**Kind**: inner method of [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;object&gt;</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |

<a name="event_attached"></a>

### "attached"
Event reporting that User model has been attached to the application

**Kind**: event emitted by [<code>User</code>](#module_User)  
<a name="event_verifyEmail"></a>

### "verifyEmail" (user) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting to trigger mails.verifyEmail

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Mails.verifyEmail  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | User instance |

<a name="event_sendContactForm"></a>

### "sendContactForm" (options) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting to trigger mails.send

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Mails.sendContactForm  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Form properties |

<a name="event_sendMailInvite"></a>

### "sendMailInvite" (options) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting to trigger mails.send

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Mails.sendMailInvite  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Form properties |

<a name="event_resetPasswordRequest"></a>

### "resetPasswordRequest" (options) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting to send password reset link when requested

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - Mails.sendResetPasswordMail  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Mail options |

<a name="event_client"></a>

### "client" (message) ⇒ <code>Promise.&lt;(function()\|null)&gt;</code>
Event reporting that a client ( as the user ) connection status has changed.

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;(function()\|null)&gt;</code> - User.updateStatus  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.client | <code>object</code> | MQTT client |
| message.status | <code>boolean</code> | MQTT client status. |

<a name="event_before_save"></a>

### "before_save" (ctx, user) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a new user instance will be created.

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - User~onBeforeSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| user | <code>object</code> | User new instance |

<a name="event_after_save"></a>

### "after_save" (ctx, user) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a new user instance has been created.

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - User~onAfterSave  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| user | <code>object</code> | User new instance |

<a name="event_before_delete"></a>

### "before_delete" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a user instance will be deleted.

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - User~onBeforeDelete  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | User instance id |

<a name="event_before_*"></a>

### "before_*" (ctx) ⇒ <code>Promise.&lt;function()&gt;</code>
Event reporting that a remote user method has been requested

**Kind**: event emitted by [<code>User</code>](#module_User)  
**Returns**: <code>Promise.&lt;function()&gt;</code> - User~onBeforeRemote  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |

<a name="external_OmaObjects"></a>

## OmaObjects
Oma Object References.

**Kind**: global external  
**See**: [https://aloes.io/app/api/omaObjects](https://aloes.io/app/api/omaObjects)  
<a name="external_OmaResources"></a>

## OmaResources
Oma Resources References.

**Kind**: global external  
**See**: [https://aloes.io/app/api/omaResources](https://aloes.io/app/api/omaResources)  
