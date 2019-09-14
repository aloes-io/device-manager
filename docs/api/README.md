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

<a name="module_Address"></a>

## Address
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
    * _static_
        * [.publish(application, [client])](#module_Application.publish) ⇒ <code>function</code>
        * [.refreshToken(application)](#module_Application.refreshToken) ⇒ <code>functions</code>
        * [.onPublish(packet, client, pattern)](#module_Application.onPublish) ⇒ <code>functions</code>
        * [.updateStatus(client, status)](#module_Application.updateStatus) ⇒ <code>function</code>
        * [.authenticate(applicationId, key, err, matched)](#module_Application.authenticate)
        * [.getState(applicationId, error)](#module_Application.getState)
    * _inner_
        * [~createKeys(application)](#module_Application..createKeys) ⇒ <code>object</code>
        * [~createProps(ctx)](#module_Application..createProps) ⇒ <code>function</code>
        * [~updateProps(ctx)](#module_Application..updateProps) ⇒ <code>function</code>
        * [~detector(packet, client)](#module_Application..detector) ⇒ <code>object</code>
        * [~detector(packet, client)](#module_Application..detector) ⇒ <code>object</code>
        * ["client" (message)](#event_client) ⇒ <code>functions</code>
        * ["publish" (message)](#event_publish)
        * ["before save" (ctx)](#event_before save)
        * ["after save" (ctx)](#event_after save)
        * ["before delete" (ctx)](#event_before delete)
        * [~callback](#module_Application..callback) : <code>function</code>

<a name="module_Application.publish"></a>

### Application.publish(application, [client]) ⇒ <code>function</code>
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>function</code> - Application.app.publish()  

| Param | Type | Description |
| --- | --- | --- |
| application | <code>object</code> | Application instance |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Application.refreshToken"></a>

### Application.refreshToken(application) ⇒ <code>functions</code>
Create new keys, and update Application instance

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - application.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| application | <code>object</code> | Application instance |

<a name="module_Application.onPublish"></a>

### Application.onPublish(packet, client, pattern) ⇒ <code>functions</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - parseApplicationMessage  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT bridge packet |
| client | <code>object</code> | MQTT client |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |

<a name="module_Application.updateStatus"></a>

### Application.updateStatus(client, status) ⇒ <code>function</code>
Update application status from MQTT conection status

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT conection status |

<a name="module_Application.authenticate"></a>

### Application.authenticate(applicationId, key, err, matched)
Endpoint for application authentification with APIKey

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Promise**:   

| Param | Type | Description |
| --- | --- | --- |
| applicationId | <code>Any</code> |  |
| key | <code>String</code> |  |
| err | <code>Error</code> |  |
| matched | <code>String</code> | The matching key; one of: - clientKey - apiKey - javaScriptKey - restApiKey - windowsKey - masterKey |

<a name="module_Application.getState"></a>

### Application.getState(applicationId, error)
Endpoint to get resources attached to an application

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type |
| --- | --- |
| applicationId | <code>String</code> | 
| error | <code>Error</code> | 

<a name="module_Application..createKeys"></a>

### Application~createKeys(application) ⇒ <code>object</code>
Keys creation helper - update application attributes

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>object</code> - application  

| Param | Type | Description |
| --- | --- | --- |
| application | <code>object</code> | Application instance |

<a name="module_Application..createProps"></a>

### Application~createProps(ctx) ⇒ <code>function</code>
Init device depencies ( token )

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>function</code> - module:Device.publish  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Application context |
| ctx.req | <code>object</code> | HTTP request |
| ctx.res | <code>object</code> | HTTP response |

<a name="module_Application..updateProps"></a>

### Application~updateProps(ctx) ⇒ <code>function</code>
Update application depencies

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>function</code> - module:Application.publish  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Application context |
| ctx.req | <code>object</code> | HTTP request |
| ctx.res | <code>object</code> | HTTP response |

<a name="module_Application..detector"></a>

### Application~detector(packet, client) ⇒ <code>object</code>
Detect application known pattern and load the application instance

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>object</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="module_Application..detector"></a>

### Application~detector(packet, client) ⇒ <code>object</code>
Detect application known pattern and load the application instance

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>object</code> - pattern  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT packet |
| client | <code>object</code> | MQTT client |

<a name="event_client"></a>

### "client" (message) ⇒ <code>functions</code>
Event reporting that an application client connection status has changed.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - Application.updateStatus  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.client | <code>object</code> | MQTT client |
| message.status | <code>boolean</code> | MQTT client status. |

<a name="event_publish"></a>

### "publish" (message)
Event reporting that an application client sent a message.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.packet | <code>object</code> | MQTT packet. |
| message.pattern | <code>object</code> | Pattern detected |
| message.client | <code>object</code> | MQTT client |

<a name="event_before save"></a>

### "before save" (ctx)
Event reporting that an application instance will be created or updated.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Application instance |

<a name="event_after save"></a>

### "after save" (ctx)
Event reporting that a device instance has been created or updated.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Application instance |

<a name="event_before delete"></a>

### "before delete" (ctx)
Event reporting that an application instance will be deleted.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | Application instance |

<a name="module_Application..callback"></a>

### Application~callback : <code>function</code>
Reset keys for the application instance

**Kind**: inner typedef of [<code>Application</code>](#module_Application)  

| Param | Type |
| --- | --- |
| err | <code>Error</code> | 

<a name="module_Client"></a>

## Client
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | Client ID |
| [name] | <code>String</code> | Client name |
| [user] | <code>String</code> | Username attribute ( once client authenthified ) |
| [type] | <code>String</code> | Client type ( MQTT, ... ) |
| status | <code>boolean</code> | Client status |
| [model] | <code>String</code> | Aloes model ( Application, Device, ... ) |


* [Client](#module_Client)
    * [.cacheIterator([filter])](#module_Client.cacheIterator) ⇒ <code>string</code>
    * [.deleteAll()](#module_Client.deleteAll) ⇒ <code>array</code>

<a name="module_Client.cacheIterator"></a>

### Client.cacheIterator([filter]) ⇒ <code>string</code>
Iterate over each Client keys found in cache

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Returns**: <code>string</code> - key - Cached key  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Client filter |

<a name="module_Client.deleteAll"></a>

### Client.deleteAll() ⇒ <code>array</code>
Delete clients stored in cache

**Kind**: static method of [<code>Client</code>](#module_Client)  
**Returns**: <code>array</code> - clients - Cached clients keys  
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
    * _static_
        * [.publish(device, method, [client])](#module_Device.publish)
        * [.refreshToken(device)](#module_Device.refreshToken) ⇒ <code>functions</code>
        * [.syncCache([direction])](#module_Device.syncCache)
        * [.findByPattern;(pattern, attributes)](#module_Device.findByPattern;) ⇒ <code>object</code>
        * [.onPublish(packet, client, pattern)](#module_Device.onPublish) ⇒ <code>functions</code>
        * [.updateStatus(client, status)](#module_Device.updateStatus) ⇒ <code>functions</code>
        * [.authenticate(deviceId, key, err, matched)](#module_Device.authenticate)
        * [.getState(ctx, deviceId)](#module_Device.getState) ⇒ <code>object</code>
        * [.getOTAUpdate(ctx, deviceId, [version])](#module_Device.getOTAUpdate) ⇒ <code>object</code>
        * [.search(filter)](#module_Device.search) ⇒ <code>array</code>
        * [.geoLocate(filter)](#module_Device.geoLocate) ⇒ <code>array</code>
    * _inner_
        * [~setDeviceQRCode(device)](#module_Device..setDeviceQRCode) ⇒ <code>object</code>
        * [~setDeviceIcons(device)](#module_Device..setDeviceIcons) ⇒ <code>object</code>
        * [~createKeys(device)](#module_Device..createKeys) ⇒ <code>object</code>
        * [~createProps(app, device)](#module_Device..createProps) ⇒ <code>function</code>
        * [~updateProps(app, device)](#module_Device..updateProps) ⇒ <code>function</code>
        * [~parseMessage(app, packet, pattern, client)](#module_Device..parseMessage)
        * [~findDevice(whereFilter)](#module_Device..findDevice) ⇒ <code>promise</code>
        * [~findAddresses(filter)](#module_Device..findAddresses) ⇒ <code>promise</code>
        * ["client" (message)](#event_client) ⇒ <code>functions</code>
        * ["publish" (message)](#event_publish)
        * ["before save" (ctx)](#event_before save)
        * ["after save" (ctx)](#event_after save)
        * ["before delete" (ctx)](#event_before delete)
        * ["before find" (ctx)](#event_before find) ⇒ <code>object</code>
        * [~callback](#module_Device..callback) : <code>function</code>

<a name="module_Device.publish"></a>

### Device.publish(device, method, [client])
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Emits**: <code>{event} module:Server.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |
| method | <code>string</code> | MQTT method |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Device.refreshToken"></a>

### Device.refreshToken(device) ⇒ <code>functions</code>
Create new keys, and update Device instance

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Device.syncCache"></a>

### Device.syncCache([direction])
Synchronize cache memory with database on disk

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| [direction] | <code>string</code> | UP to save on disk | DOWN to save on cache, |

<a name="module_Device.findByPattern;"></a>

### Device.findByPattern;(pattern, attributes) ⇒ <code>object</code>
Find device related to incoming MQTT packet

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent parsed pattern |
| attributes | <code>object</code> | IotAgent parsed message |

<a name="module_Device.onPublish"></a>

### Device.onPublish(packet, client, pattern) ⇒ <code>functions</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - parseMessage  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT bridge packet |
| client | <code>object</code> | MQTT client |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |

<a name="module_Device.updateStatus"></a>

### Device.updateStatus(client, status) ⇒ <code>functions</code>
Update device status from MQTT connection status

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT connection status |

<a name="module_Device.authenticate"></a>

### Device.authenticate(deviceId, key, err, matched)
Endpoint for device authentification with APIKey

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Promise**:   

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>Any</code> |  |
| key | <code>String</code> |  |
| err | <code>Error</code> |  |
| matched | <code>String</code> | The matching key; one of: - clientKey - apiKey - javaScriptKey - restApiKey - windowsKey - masterKey |

<a name="module_Device.getState"></a>

### Device.getState(ctx, deviceId) ⇒ <code>object</code>
Endpoint for device requesting their own state

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| deviceId | <code>string</code> | Device instance id |

<a name="module_Device.getOTAUpdate"></a>

### Device.getOTAUpdate(ctx, deviceId, [version]) ⇒ <code>object</code>
Update OTA if a firmware is available

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| deviceId | <code>string</code> | Device instance id |
| [version] | <code>string</code> | Firmware version requested |

<a name="module_Device.search"></a>

### Device.search(filter) ⇒ <code>array</code>
Search device by location ( keyword )

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>array</code> - devies  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Requested filter |

<a name="module_Device.geoLocate"></a>

### Device.geoLocate(filter) ⇒ <code>array</code>
Search device by location ( GPS coordinates )

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>array</code> - deviceAddresses  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Requested filter |

<a name="module_Device..setDeviceQRCode"></a>

### Device~setDeviceQRCode(device) ⇒ <code>object</code>
Set device QRcode access based on declared protocol and access point url

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Device..setDeviceIcons"></a>

### Device~setDeviceIcons(device) ⇒ <code>object</code>
Set device icons ( urls ) based on its type

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Device..createKeys"></a>

### Device~createKeys(device) ⇒ <code>object</code>
Keys creation helper - update device attributes

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Device..createProps"></a>

### Device~createProps(app, device) ⇒ <code>function</code>
Init device depencies ( token, address )

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>function</code> - module:Device.publish  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| device | <code>object</code> | Device instance |

<a name="module_Device..updateProps"></a>

### Device~updateProps(app, device) ⇒ <code>function</code>
Update device depencies ( token, sensors )

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>function</code> - module:Device.publish  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| device | <code>object</code> | Device instance |

<a name="module_Device..parseMessage"></a>

### Device~parseMessage(app, packet, pattern, client)
Find properties and dispatch to the right function

Adding device and sensor context to raw incoming data

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Emits**: <code>module:Device~event:publish</code>, <code>module:Sensor~event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| packet | <code>object</code> | MQTT packet |
| pattern | <code>object</code> | Pattern detected by IotAgent |
| client | <code>object</code> | MQTT client |

<a name="module_Device..findDevice"></a>

### Device~findDevice(whereFilter) ⇒ <code>promise</code>
Helper for device search

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>promise</code> - Device.find  

| Param | Type | Description |
| --- | --- | --- |
| whereFilter | <code>object</code> | Device filter |

<a name="module_Device..findAddresses"></a>

### Device~findAddresses(filter) ⇒ <code>promise</code>
Helper for reverse geocoding

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>promise</code> - Device.app.models.Address.find  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Device location filter |

<a name="event_client"></a>

### "client" (message) ⇒ <code>functions</code>
Event reporting that an device client connection status has changed.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - Device.updateStatus  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.client | <code>object</code> | MQTT client |
| message.status | <code>boolean</code> | MQTT client status. |

<a name="event_publish"></a>

### "publish" (message)
Event reporting that a device client sent a message.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.packet | <code>object</code> | MQTT packet. |
| message.pattern | <code>object</code> | Pattern detected by Iot-Agent |
| message.device- | <code>object</code> | Found Device instance |
| [message.client] | <code>object</code> | MQTT client |

<a name="event_before save"></a>

### "before save" (ctx)
Event reporting that a device instance will be created or updated.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Device instance |

<a name="event_after save"></a>

### "after save" (ctx)
Event reporting that a device instance has been created or updated.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Device instance |

<a name="event_before delete"></a>

### "before delete" (ctx)
Event reporting that a / several device instance(s) will be deleted.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | Device instance |

<a name="event_before find"></a>

### "before find" (ctx) ⇒ <code>object</code>
Event reporting that a device instance / collection is requested

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - ctx  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="module_Device..callback"></a>

### Device~callback : <code>function</code>
Reset keys for the application instance

**Kind**: inner typedef of [<code>Device</code>](#module_Device)  

| Param | Type |
| --- | --- |
| err | <code>Error</code> | 

<a name="module_Files"></a>

## Files

* [Files](#module_Files)
    * [.upload(ctx, ownerId, [name])](#module_Files.upload) ⇒ <code>object</code>
    * [.uploadBuffer(buffer, ownerId, name)](#module_Files.uploadBuffer) ⇒ <code>object</code>
    * [.download(ownerId, name)](#module_Files.download) ⇒ <code>object</code>

<a name="module_Files.upload"></a>

### Files.upload(ctx, ownerId, [name]) ⇒ <code>object</code>
Request to upload file in userId container via multipart/form data

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>object</code> - file  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| ownerId | <code>string</code> | Container owner and path |
| [name] | <code>string</code> | File name |

<a name="module_Files.uploadBuffer"></a>

### Files.uploadBuffer(buffer, ownerId, name) ⇒ <code>object</code>
Request to upload file in userId container via raw buffer

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>object</code> - fileMeta  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>buffer</code> | Containing file data |
| ownerId | <code>string</code> | Container owner and path |
| name | <code>string</code> | File name |

<a name="module_Files.download"></a>

### Files.download(ownerId, name) ⇒ <code>object</code>
Request to download file in userId container

**Kind**: static method of [<code>Files</code>](#module_Files)  
**Returns**: <code>object</code> - fileMeta  

| Param | Type | Description |
| --- | --- | --- |
| ownerId | <code>string</code> | Container owner and path |
| name | <code>string</code> | File name |

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
    * [.compose(sensor)](#module_Measurement.compose) ⇒ <code>object</code>
    * [.publish(device, measurement, [method], [client])](#module_Measurement.publish) ⇒ <code>function</code>

<a name="module_Measurement.compose"></a>

### Measurement.compose(sensor) ⇒ <code>object</code>
On sensor update, if an OMA resource is of float or integer type

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  
**Returns**: <code>object</code> - measurement  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | updated Sensor instance |

<a name="module_Measurement.publish"></a>

### Measurement.publish(device, measurement, [method], [client]) ⇒ <code>function</code>
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  
**Returns**: <code>function</code> - Measurement.app.publish()  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found Device instance |
| measurement | <code>object</code> | Measurement instance |
| [method] | <code>string</code> | MQTT method |
| [client] | <code>object</code> | MQTT client target |

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
| [unit] | <code>string</code> | OmaResource default key : value object |
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
        * [.publish(device, measurement, [method], [client])](#module_Scheduler.publish) ⇒ <code>function</code>
        * [.onTimeout(body)](#module_Scheduler.onTimeout) ⇒ <code>functions</code>
        * [.createOrUpdate(device, sensor, [client])](#module_Scheduler.createOrUpdate) ⇒ <code>object</code>
        * [.cacheIterator([filter])](#module_Scheduler.cacheIterator) ⇒ <code>string</code>
        * [.getAll([filter])](#module_Scheduler.getAll) ⇒ <code>array</code>
        * [.deleteAll([filter])](#module_Scheduler.deleteAll) ⇒ <code>array</code>
        * [.onTick(body)](#module_Scheduler.onTick) ⇒ <code>functions</code>
        * [.setClock(interval)](#module_Scheduler.setClock) ⇒ <code>functions</code> \| <code>functions</code>
    * _inner_
        * [~onTimeout(data)](#module_Scheduler..onTimeout) ⇒ <code>object</code>
        * [~onTick(data)](#module_Scheduler..onTick) ⇒ <code>object</code>
        * [~onTickHook(body)](#module_Scheduler..onTickHook) ⇒ <code>functions</code>

<a name="module_Scheduler.publish"></a>

### Scheduler.publish(device, measurement, [method], [client]) ⇒ <code>function</code>
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>function</code> - Scheduler.app.publish()  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found Device instance |
| measurement | <code>object</code> | Scheduler instance |
| [method] | <code>string</code> | MQTT method |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Scheduler.onTimeout"></a>

### Scheduler.onTimeout(body) ⇒ <code>functions</code>
Endpoint for Sensor timers hooks

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>functions</code> - module:Scheduler~onTimeout  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>object</code> | Timer callback data |

<a name="module_Scheduler.createOrUpdate"></a>

### Scheduler.createOrUpdate(device, sensor, [client]) ⇒ <code>object</code>
Create or update scheduler stored in cache

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>object</code> - scheduler - Updated scheduler  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found Device instance |
| sensor | <code>object</code> | found Sensor instance |
| [client] | <code>object</code> | MQTT client |

<a name="module_Scheduler.cacheIterator"></a>

### Scheduler.cacheIterator([filter]) ⇒ <code>string</code>
Iterate over each Scheduler keys found in cache

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>string</code> - key - Cached key  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Scheduler filter |

<a name="module_Scheduler.getAll"></a>

### Scheduler.getAll([filter]) ⇒ <code>array</code>
Find schedulers in the cache and add to device instance

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>array</code> - schedulers - Cached schedulers  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Scheduler filter |

<a name="module_Scheduler.deleteAll"></a>

### Scheduler.deleteAll([filter]) ⇒ <code>array</code>
Delete schedulers stored in cache

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>array</code> - schedulers - Cached schedulers keys  

| Param | Type | Description |
| --- | --- | --- |
| [filter] | <code>object</code> | Scheduler filter |

<a name="module_Scheduler.onTick"></a>

### Scheduler.onTick(body) ⇒ <code>functions</code>
Endpoint for Scheduler external timeout hooks

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>functions</code> - module:Scheduler~onTickHook  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>object</code> | Timer callback data |

<a name="module_Scheduler.setClock"></a>

### Scheduler.setClock(interval) ⇒ <code>functions</code> \| <code>functions</code>
Init clock to synchronize with every active schedulers

if EXTERNAL_TIMER is enabled, Scheduler will use Skyring external timer handler

else a DeltaTimer instance will be created and stored in memory

**Kind**: static method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>functions</code> - setExternalClock<code>functions</code> - setInternalClock  

| Param | Type | Description |
| --- | --- | --- |
| interval | <code>number</code> | Timeout interval |

<a name="module_Scheduler..onTimeout"></a>

### Scheduler~onTimeout(data) ⇒ <code>object</code>
Scheduler timeout callback ( sensor timers )

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>object</code> - payload - Updated timeout  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Timer callback data |

<a name="module_Scheduler..onTick"></a>

### Scheduler~onTick(data) ⇒ <code>object</code>
Scheduler timeout callback ( scheduler clock )

Update every sensor having an active scheduler

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>object</code> - payload - Updated timeout  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Timer callback data |

<a name="module_Scheduler..onTickHook"></a>

### Scheduler~onTickHook(body) ⇒ <code>functions</code>
Scheduler timeout callback ( scheduler clock )

validate webhook content before dispatch

**Kind**: inner method of [<code>Scheduler</code>](#module_Scheduler)  
**Returns**: <code>functions</code> - module:Scheduler~onTick  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>object</code> | Timer callback data |

<a name="module_SensorResource"></a>

## SensorResource
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sensor | <code>String</code> | Stringified Sensor instance |


* [SensorResource](#module_SensorResource)
    * [.getCache(deviceId, sensorId)](#module_SensorResource.getCache) ⇒ <code>object</code>
    * [.setCache(deviceId, sensor, [ttl])](#module_SensorResource.setCache) ⇒ <code>object</code>
    * [.expireCache(deviceId, sensorId)](#module_SensorResource.expireCache) ⇒ <code>boolean</code>
    * [.expireCache(deviceId, sensor, [ttl])](#module_SensorResource.expireCache) ⇒ <code>boolean</code>
    * [.cacheIterator(filter)](#module_SensorResource.cacheIterator) ⇒ <code>string</code>
    * [.includeCache(device)](#module_SensorResource.includeCache)
    * [.updateCache(device)](#module_SensorResource.updateCache) ⇒ <code>array</code>

<a name="module_SensorResource.getCache"></a>

### SensorResource.getCache(deviceId, sensorId) ⇒ <code>object</code>
Find Sensor instance from the cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>object</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensorId | <code>string</code> | Sensor instance Id |

<a name="module_SensorResource.setCache"></a>

### SensorResource.setCache(deviceId, sensor, [ttl]) ⇒ <code>object</code>
Create or update sensor instance into the cache memory

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>object</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensor | <code>object</code> | Sensor instance to save |
| [ttl] | <code>number</code> | Expire delay |

<a name="module_SensorResource.expireCache"></a>

### SensorResource.expireCache(deviceId, sensorId) ⇒ <code>boolean</code>
Set TTL for a sensor store in cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>boolean</code> - success  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensorId | <code>string</code> | Sensor instance Id |

<a name="module_SensorResource.expireCache"></a>

### SensorResource.expireCache(deviceId, sensor, [ttl]) ⇒ <code>boolean</code>
Set TTL for a sensor store in cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>boolean</code> - success  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensor | <code>object</code> | Sensor instance to save |
| [ttl] | <code>number</code> | Sensor instance Id |

<a name="module_SensorResource.cacheIterator"></a>

### SensorResource.cacheIterator(filter) ⇒ <code>string</code>
Async generator sending cache key promise

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>string</code> - key - Cached key  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Key filter |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| filter.match | <code>string</code> | glob string |

<a name="module_SensorResource.includeCache"></a>

### SensorResource.includeCache(device)
Find sensors in the cache and add to device instance

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | device instance |

<a name="module_SensorResource.updateCache"></a>

### SensorResource.updateCache(device) ⇒ <code>array</code>
Update device's sensors stored in cache

**Kind**: static method of [<code>SensorResource</code>](#module_SensorResource)  
**Returns**: <code>array</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Sensor"></a>

## Sensor
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | Database generated ID. |
| name | <code>String</code> | required. |
| devEui | <code>String</code> | hardware generated Device Id required. |
| lastSignal | <code>Date</code> |  |
| lastSync | <code>Date</code> | last date when this sensor cache was synced |
| frameCounter | <code>Number</code> | Number of messages since last connection |
| type | <code>String</code> | OMA object ID, used to format resources schema |
| resource | <code>String</code> | OMA resource ID used for last message |
| resources | <code>Array</code> | OMA Resources ( formatted object where sensor value and settings are stored ) |
| icons | <code>Array</code> | OMA Object icons URL |
| colors | <code>Object</code> | OMA Resource colors |
| transportProtocol | <code>String</code> | Framework used for message transportation |
| transportProtocolVersion | <code>String</code> | Framework version |
| messageProtocol | <code>String</code> | Framework used for message encoding |
| messageProtocolVersion | <code>String</code> | Framework version |
| nativeSensorId | <code>String</code> | Original sensor id ( stringified integer ) |
| [nativeNodeId] | <code>String</code> | Original node id ( stringified integer ) |
| nativeType | <code>String</code> | Original sensor type identifier |
| nativeResource | <code>String</code> | Original sensor variables identifier |
| ownerId | <code>String</code> | User ID of the developer who registers the application. |
| deviceId | <code>String</code> | Device instance Id which has sent this measurement |


* [Sensor](#module_Sensor)
    * _static_
        * [.syncCache(device, [direction])](#module_Sensor.syncCache)
        * [.publish(device, sensor, [method], [client])](#module_Sensor.publish)
        * [.compose(device, attributes)](#module_Sensor.compose) ⇒ <code>object</code>
        * [.handlePresentation(device, sensor, [client])](#module_Sensor.handlePresentation) ⇒ <code>function</code> \| <code>function</code>
        * [.createOrUpdate(device, sensor, resourceKey, resourceValue, [client])](#module_Sensor.createOrUpdate) ⇒ <code>function</code>
        * [.getInstance(device, pattern, sensor)](#module_Sensor.getInstance) ⇒ <code>function</code>
        * [.onPublish(device, attributes, [sensor], client)](#module_Sensor.onPublish) ⇒ <code>functions</code>
    * _inner_
        * [~getPersistingMethod(sensorType, resource, type)](#module_Sensor..getPersistingMethod) ⇒ <code>string</code>
        * [~persistingResource(app, device, sensor, [client])](#module_Sensor..persistingResource) ⇒ <code>object</code>
        * ["publish" (message)](#event_publish) ⇒ <code>functions</code>
        * ["before save" (ctx)](#event_before save)
        * ["after save" (ctx)](#event_after save)
        * ["before delete" (ctx)](#event_before delete)

<a name="module_Sensor.syncCache"></a>

### Sensor.syncCache(device, [direction])
Synchronize cache memory with database on disk

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device Instance to sync |
| [direction] | <code>string</code> | UP to save on disk | DOWN to save on cache, |

<a name="module_Sensor.publish"></a>

### Sensor.publish(device, sensor, [method], [client])
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Emits**: <code>{event} module:Server.event:publish</code>  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found Device instance |
| sensor | <code>object</code> | Sensor instance |
| [method] | <code>string</code> | MQTT API method |
| [client] | <code>object</code> | MQTT client target |

<a name="module_Sensor.compose"></a>

### Sensor.compose(device, attributes) ⇒ <code>object</code>
When device found,validate sensor instance produced by IoTAgent

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>object</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found device instance |
| attributes | <code>object</code> | IotAgent parsed message |

<a name="module_Sensor.handlePresentation"></a>

### Sensor.handlePresentation(device, sensor, [client]) ⇒ <code>function</code> \| <code>function</code>
When HEAD detected, validate sensor.resource and value, then save sensor instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>function</code> - sensor.create<code>function</code> - sensor.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found device instance |
| sensor | <code>object</code> | Incoming sensor instance |
| [client] | <code>object</code> | MQTT client |

<a name="module_Sensor.createOrUpdate"></a>

### Sensor.createOrUpdate(device, sensor, resourceKey, resourceValue, [client]) ⇒ <code>function</code>
When POST or PUT method detected, validate sensor.resource and value, then save sensor instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>function</code> - sensor.publish  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found Device instance |
| sensor | <code>object</code> | Incoming Densor instance |
| resourceKey | <code>number</code> | Sensor resource name ( OMA ) |
| resourceValue | <code>object</code> | Sensor resource value to save |
| [client] | <code>object</code> | MQTT client |

<a name="module_Sensor.getInstance"></a>

### Sensor.getInstance(device, pattern, sensor) ⇒ <code>function</code>
When GET method detected, find and publish instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>function</code> - Sensor.publish  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found device instance |
| pattern | <code>object</code> | IotAgent detected pattern |
| sensor | <code>object</code> | Incoming sensor instance |

<a name="module_Sensor.onPublish"></a>

### Sensor.onPublish(device, attributes, [sensor], client) ⇒ <code>functions</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>functions</code> - Sensor.execute  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Found Device instance |
| attributes | <code>object</code> | Sensor attributes detected by Iot-Agent |
| [sensor] | <code>object</code> | Found Sensor instance |
| client | <code>object</code> | MQTT client |

<a name="module_Sensor..getPersistingMethod"></a>

### Sensor~getPersistingMethod(sensorType, resource, type) ⇒ <code>string</code>
Define the way to persist data based on OMA resource type

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>string</code> - method  

| Param | Type | Description |
| --- | --- | --- |
| sensorType | <code>string</code> | OMA object Id |
| resource | <code>number</code> | OMA resource ID |
| type | <code>string</code> | OMA resource type |

<a name="module_Sensor..persistingResource"></a>

### Sensor~persistingResource(app, device, sensor, [client]) ⇒ <code>object</code>
Persist data based on OMA resource type

use influxdb for integers and floats

use filestorage for strings and buffers

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>object</code> - result - saved value  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>object</code> | Loopback app |
| device | <code>object</code> | Device instance |
| sensor | <code>object</code> | Sensor instance |
| [client] | <code>object</code> | MQTT client |

<a name="event_publish"></a>

### "publish" (message) ⇒ <code>functions</code>
Event reporting that a device client sent sensors update.

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>functions</code> - Sensor.onPublish  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.device | <code>object</code> | found device instancet. |
| message.pattern | <code>object</code> | Pattern detected by Iot-Agent |
| message.attributes | <code>object</code> | IotAgent parsed message |
| [message.sensor] | <code>object</code> | Found sensor instance |
| message.client | <code>object</code> | MQTT client |

<a name="event_before save"></a>

### "before save" (ctx)
Event reporting that a sensor instance will be created or updated.

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Sensor instance |

<a name="event_after save"></a>

### "after save" (ctx)
Event reporting that a sensor instance has been created or updated.

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Sensor instance |

<a name="event_before delete"></a>

### "before delete" (ctx)
Event reporting that a/several sensor instance(s) will be deleted.

**Kind**: event emitted by [<code>Sensor</code>](#module_Sensor)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | Sensor id |

<a name="module_User"></a>

## User

* [User](#module_User)
    * _static_
        * [.findByEmail(email)](#module_User.findByEmail) ⇒ <code>object</code>
        * [.verifyEmail(user)](#module_User.verifyEmail) ⇒ <code>object</code>
    * _inner_
        * ["after confirm" (ctx)](#event_after confirm)
        * ["before confirm" (ctx)](#event_before confirm)
        * ["create" (ctx, user)](#event_create)
        * ["create" (ctx, user)](#event_create)
        * ["before delete" (ctx)](#event_before delete)

<a name="module_User.findByEmail"></a>

### User.findByEmail(email) ⇒ <code>object</code>
Find a user by its email address and send a confirmation link

**Kind**: static method of [<code>User</code>](#module_User)  
**Returns**: <code>object</code> - mail result  

| Param | Type | Description |
| --- | --- | --- |
| email | <code>string</code> | User email address |

<a name="module_User.verifyEmail"></a>

### User.verifyEmail(user) ⇒ <code>object</code>
Send a confirmation link to confirm signup

**Kind**: static method of [<code>User</code>](#module_User)  
**Returns**: <code>object</code> - mail result  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | User instance |

<a name="event_after confirm"></a>

### "after confirm" (ctx)
Event reporting that an user has confirmed mail validation

**Kind**: event emitted by [<code>User</code>](#module_User)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="event_before confirm"></a>

### "before confirm" (ctx)
Event reporting that an user attempts to login

**Kind**: event emitted by [<code>User</code>](#module_User)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |

<a name="event_create"></a>

### "create" (ctx, user)
Event reporting that a new user instance will be created.

**Kind**: event emitted by [<code>User</code>](#module_User)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| user | <code>object</code> | User new instance |

<a name="event_create"></a>

### "create" (ctx, user)
Event reporting that a new user instance has been created.

**Kind**: event emitted by [<code>User</code>](#module_User)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| user | <code>object</code> | User new instance |

<a name="event_before delete"></a>

### "before delete" (ctx)
Event reporting that a user instance will be deleted.

**Kind**: event emitted by [<code>User</code>](#module_User)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | User instance id |

