## Modules

<dl>
<dt><a href="#module_Address">Address</a></dt>
<dd></dd>
<dt><a href="#module_Application">Application</a></dt>
<dd></dd>
<dt><a href="#module_Device">Device</a></dt>
<dd></dd>
<dt><a href="#module_Files">Files</a></dt>
<dd></dd>
<dt><a href="#module_Measurement">Measurement</a></dt>
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

* [Application](#module_Application)
    * _static_
        * [.publish(application)](#module_Application.publish)
        * [.refreshToken(application)](#module_Application.refreshToken) ⇒ <code>functions</code>
        * [.authenticate(applicationId, key, err, matched)](#module_Application.authenticate)
        * [.onPublish(packet, pattern)](#module_Application.onPublish) ⇒ <code>functions</code>
        * [.updateStatus(client, status)](#module_Application.updateStatus) ⇒ <code>function</code>
    * _inner_
        * [~createKeys(application)](#module_Application..createKeys)
        * [~createProps(ctx)](#module_Application..createProps)
        * [~updateProps(ctx)](#module_Application..updateProps)
        * [~findDeviceByPattern(pattern, message)](#module_Application..findDeviceByPattern) ⇒ <code>object</code>
        * [~executeDeviceCommand(pattern, message, device)](#module_Application..executeDeviceCommand) ⇒ <code>functions</code> \| <code>functions</code>
        * [~executeSensorCommand(pattern, message, device)](#module_Application..executeSensorCommand) ⇒ <code>functions</code> \| <code>functions</code>
        * [~parseApplicationMessage(packet, pattern)](#module_Application..parseApplicationMessage) ⇒ <code>functions</code> \| <code>functions</code>
        * [~appDetector(packet, client)](#module_Application..appDetector) ⇒ <code>object</code>
        * ["client" (message)](#event_client) ⇒ <code>functions</code>
        * ["message" (message)](#event_message)
        * ["before save" (ctx)](#event_before save)
        * ["after save" (ctx)](#event_after save)
        * ["before delete" (ctx)](#event_before delete)
        * [~callback](#module_Application..callback) : <code>function</code>

<a name="module_Application.publish"></a>

### Application.publish(application)
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| application | <code>object</code> | Application instance returns {function} Application.app.publish() |

<a name="module_Application.refreshToken"></a>

### Application.refreshToken(application) ⇒ <code>functions</code>
Create new keys, and update Application instance

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - application.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| application | <code>object</code> | Application instance |

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

<a name="module_Application.onPublish"></a>

### Application.onPublish(packet, pattern) ⇒ <code>functions</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - parseApplicationMessage  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT bridge packet |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |

<a name="module_Application.updateStatus"></a>

### Application.updateStatus(client, status) ⇒ <code>function</code>
Update application status from MQTT conection status

**Kind**: static method of [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT conection status |

<a name="module_Application..createKeys"></a>

### Application~createKeys(application)
Keys creation helper - update application attributes

**Kind**: inner method of [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| application | <code>object</code> | Application instance returns {object} application |

<a name="module_Application..createProps"></a>

### Application~createProps(ctx)
Init device depencies ( token )

**Kind**: inner method of [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Application context |
| ctx.req | <code>object</code> | HTTP request |
| ctx.res | <code>object</code> | HTTP response returns {function} module:Device.publish |

<a name="module_Application..updateProps"></a>

### Application~updateProps(ctx)
Update application depencies

**Kind**: inner method of [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Application context |
| ctx.req | <code>object</code> | HTTP request |
| ctx.res | <code>object</code> | HTTP response returns {function} module:Application.publish |

<a name="module_Application..findDeviceByPattern"></a>

### Application~findDeviceByPattern(pattern, message) ⇒ <code>object</code>
Find device related to incoming MQTT packet

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent detected pattern |
| message | <code>object</code> | Parsed external app message |

<a name="module_Application..executeDeviceCommand"></a>

### Application~executeDeviceCommand(pattern, message, device) ⇒ <code>functions</code> \| <code>functions</code>
When device found, execute payload method

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - Application.app.publish<code>functions</code> - Device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent detected pattern |
| message | <code>object</code> | IotAgent parsed message |
| device | <code>object</code> | found device instance |

<a name="module_Application..executeSensorCommand"></a>

### Application~executeSensorCommand(pattern, message, device) ⇒ <code>functions</code> \| <code>functions</code>
When sensor found, execute payload method

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - Application.app.publish<code>functions</code> - Sensor.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent detected pattern |
| message | <code>object</code> | Parsed external app message |
| device | <code>object</code> | found device instance |

<a name="module_Application..parseApplicationMessage"></a>

### Application~parseApplicationMessage(packet, pattern) ⇒ <code>functions</code> \| <code>functions</code>
Find properties and dispatch to the right function

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - executeDeviceCommand<code>functions</code> - executeSensorCommand  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT bridge packet |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |

<a name="module_Application..appDetector"></a>

### Application~appDetector(packet, client) ⇒ <code>object</code>
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

<a name="event_message"></a>

### "message" (message)
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
| collaborators | <code>Array</code> | Used to share access to other users |
| ownerId | <code>String</code> | User ID of the developer who registers the application. |


* [Device](#module_Device)
    * _static_
        * [.publish(device)](#module_Device.publish)
        * [.refreshToken(device)](#module_Device.refreshToken) ⇒ <code>functions</code>
        * [.authenticate(deviceId, key, err, matched)](#module_Device.authenticate)
        * [.syncCache([direction])](#module_Device.syncCache)
        * [.findByPattern(pattern, attributes)](#module_Device.findByPattern) ⇒ <code>object</code>
        * [.onPublish(pattern, packet)](#module_Device.onPublish) ⇒ <code>functions</code>
        * [.updateStatus(client, status)](#module_Device.updateStatus) ⇒ <code>functions</code>
        * [.search(filter)](#module_Device.search) ⇒ <code>array</code>
        * [.geoLocate(filter)](#module_Device.geoLocate) ⇒ <code>array</code>
    * _inner_
        * [~setDeviceQRCode(device)](#module_Device..setDeviceQRCode)
        * [~setDeviceIcons(device)](#module_Device..setDeviceIcons)
        * [~createKeys(device)](#module_Device..createKeys)
        * [~createProps(ctx)](#module_Device..createProps)
        * [~updateProps(ctx)](#module_Device..updateProps)
        * [~includeCachedSensors(device)](#module_Device..includeCachedSensors)
        * [~parseMessage(pattern, encoded)](#module_Device..parseMessage) ⇒ <code>functions</code> \| <code>functions</code>
        * [~findDevice(whereFilter)](#module_Device..findDevice) ⇒ <code>promise</code>
        * [~findAddresses(filter)](#module_Device..findAddresses) ⇒ <code>promise</code>
        * [~getState(ctx, deviceId)](#module_Device..getState) ⇒ <code>object</code>
        * [~getOTAUpdate(ctx, deviceId, [version])](#module_Device..getOTAUpdate) ⇒ <code>object</code>
        * ["client" (message)](#event_client) ⇒ <code>functions</code>
        * ["message" (message)](#event_message)
        * ["before save" (ctx)](#event_before save)
        * ["after save" (ctx)](#event_after save)
        * ["before find" (ctx)](#event_before find) ⇒ <code>object</code>
        * ["before delete" (ctx)](#event_before delete)
        * [~callback](#module_Device..callback) : <code>function</code>

<a name="module_Device.publish"></a>

### Device.publish(device)
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance returns {function} Device.app.publish() |

<a name="module_Device.refreshToken"></a>

### Device.refreshToken(device) ⇒ <code>functions</code>
Create new keys, and update Device instance

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

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

<a name="module_Device.syncCache"></a>

### Device.syncCache([direction])
Synchronize cache memory with database on disk

**Kind**: static method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| [direction] | <code>string</code> | UP to save on disk | DOWN to save on cache, |

<a name="module_Device.findByPattern"></a>

### Device.findByPattern(pattern, attributes) ⇒ <code>object</code>
Find device related to incoming MQTT packet

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent parsed pattern |
| attributes | <code>object</code> | IotAgent parsed message |

<a name="module_Device.onPublish"></a>

### Device.onPublish(pattern, packet) ⇒ <code>functions</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - parseMessage  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |
| packet | <code>object</code> | MQTT bridge packet |

<a name="module_Device.updateStatus"></a>

### Device.updateStatus(client, status) ⇒ <code>functions</code>
Update device status from MQTT connection status

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | MQTT client |
| status | <code>boolean</code> | MQTT connection status |

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

### Device~setDeviceQRCode(device)
Set device QRcode access based on declared protocol and access point url

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance returns {object} device |

<a name="module_Device..setDeviceIcons"></a>

### Device~setDeviceIcons(device)
Set device icons ( urls ) based on its type

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance returns {object} device |

<a name="module_Device..createKeys"></a>

### Device~createKeys(device)
Keys creation helper - update device attributes

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance returns {object} device |

<a name="module_Device..createProps"></a>

### Device~createProps(ctx)
Init device depencies ( token, address )

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Application context |
| ctx.req | <code>object</code> | HTTP request |
| ctx.res | <code>object</code> | HTTP response returns {function} module:Device.publish |

<a name="module_Device..updateProps"></a>

### Device~updateProps(ctx)
Update device depencies ( token, sensors )

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Application context |
| ctx.req | <code>object</code> | HTTP request |
| ctx.res | <code>object</code> | HTTP response returns {function} module:Device.publish |

<a name="module_Device..includeCachedSensors"></a>

### Device~includeCachedSensors(device)
Find sensors in the cache and add to device instance

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | device instance |

<a name="module_Device..parseMessage"></a>

### Device~parseMessage(pattern, encoded) ⇒ <code>functions</code> \| <code>functions</code>
Find properties and dispatch to the right function

Adding device and sensor context to raw incoming data

**Kind**: inner method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - getInstance<code>functions</code> - createOrUpdateSensor  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | Pattern detected by IotAgent |
| encoded | <code>object</code> | IotAgent parsed message |

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

<a name="module_Device..getState"></a>

### Device~getState(ctx, deviceId) ⇒ <code>object</code>
Endpoint for device requesting their own state

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| deviceId | <code>string</code> | Device instance id |

<a name="module_Device..getOTAUpdate"></a>

### Device~getOTAUpdate(ctx, deviceId, [version]) ⇒ <code>object</code>
Update OTA if a firmware is available

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Loopback context |
| deviceId | <code>string</code> | Device instance id |
| [version] | <code>string</code> | Firmware version requested |

<a name="event_client"></a>

### "client" (message) ⇒ <code>functions</code>
Event reporting that an application client connection status has changed.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - Application.updateStatus  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed MQTT message. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| message.client | <code>object</code> | MQTT client |
| message.status | <code>boolean</code> | MQTT client status. |

<a name="event_message"></a>

### "message" (message)
Event reporting that a device client sent a message.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  

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

<a name="event_before delete"></a>

### "before delete" (ctx)
Event reporting that a device instance will be deleted.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | Device instance |

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
    * _static_
        * [.compose(sensor)](#module_Measurement.compose) ⇒ <code>object</code>
    * _inner_
        * [~publish(sensor, [method])](#module_Measurement..publish)

<a name="module_Measurement.compose"></a>

### Measurement.compose(sensor) ⇒ <code>object</code>
On sensor update, if an OMA resource is of float or integer type

**Kind**: static method of [<code>Measurement</code>](#module_Measurement)  
**Returns**: <code>object</code> - measurement  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | updated Sensor instance |

<a name="module_Measurement..publish"></a>

### Measurement~publish(sensor, [method])
Format packet and send it via MQTT broker

**Kind**: inner method of [<code>Measurement</code>](#module_Measurement)  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | Sensor instance |
| [method] | <code>string</code> | MQTT method returns {function} Measurement.app.publish() |

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
        * [.getCache(deviceId, sensorId)](#module_Sensor.getCache) ⇒ <code>object</code>
        * [.setCache(deviceId, sensor, [ttl])](#module_Sensor.setCache) ⇒ <code>object</code>
        * [.expireCache(deviceId, sensorId)](#module_Sensor.expireCache) ⇒ <code>boolean</code>
        * [.expireCache(deviceId, sensor, [ttl])](#module_Sensor.expireCache) ⇒ <code>boolean</code>
        * [.syncCache(device, [direction])](#module_Sensor.syncCache)
        * [.publish(sensor, [method])](#module_Sensor.publish)
        * [.compose(device, encoded)](#module_Sensor.compose) ⇒ <code>object</code>
        * [.handlePresentation(device, sensor, encoded)](#module_Sensor.handlePresentation) ⇒ <code>function</code> \| <code>function</code>
        * [.createOrUpdate(device, sensor, resourceKey, resourceValue)](#module_Sensor.createOrUpdate) ⇒ <code>function</code>
        * [.getInstance(pattern, sensor)](#module_Sensor.getInstance) ⇒ <code>function</code>
    * _inner_
        * [~updateCache(device)](#module_Sensor..updateCache)
        * ["before save" (ctx)](#event_before save)
        * ["after save" (ctx)](#event_after save)
        * ["before delete" (ctx)](#event_before delete)

<a name="module_Sensor.getCache"></a>

### Sensor.getCache(deviceId, sensorId) ⇒ <code>object</code>
Find Sensor instance from the cache

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>object</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensorId | <code>string</code> | Sensor instance Id |

<a name="module_Sensor.setCache"></a>

### Sensor.setCache(deviceId, sensor, [ttl]) ⇒ <code>object</code>
Create or update sensor instance into the cache memory

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>object</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensor | <code>object</code> | Sensor instance to save |
| [ttl] | <code>number</code> | Expire delay |

<a name="module_Sensor.expireCache"></a>

### Sensor.expireCache(deviceId, sensorId) ⇒ <code>boolean</code>
Set TTL for a sensor store in cache

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>boolean</code> - success  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensorId | <code>string</code> | Sensor instance Id |

<a name="module_Sensor.expireCache"></a>

### Sensor.expireCache(deviceId, sensor, [ttl]) ⇒ <code>boolean</code>
Set TTL for a sensor store in cache

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>boolean</code> - success  

| Param | Type | Description |
| --- | --- | --- |
| deviceId | <code>string</code> | Device Id owning the sensor |
| sensor | <code>object</code> | Sensor instance to save |
| [ttl] | <code>number</code> | Sensor instance Id |

<a name="module_Sensor.syncCache"></a>

### Sensor.syncCache(device, [direction])
Synchronize cache memory with database on disk

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device Instance to sync |
| [direction] | <code>string</code> | UP to save on disk | DOWN to save on cache, |

<a name="module_Sensor.publish"></a>

### Sensor.publish(sensor, [method])
Format packet and send it via MQTT broker

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type | Description |
| --- | --- | --- |
| sensor | <code>object</code> | Sensor instance |
| [method] | <code>string</code> | MQTT method returns {function} Sensor.app.publish() |

<a name="module_Sensor.compose"></a>

### Sensor.compose(device, encoded) ⇒ <code>object</code>
When device found,validate sensor instance produced by IoTAgent

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>object</code> - sensor  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found device instance |
| encoded | <code>object</code> | IotAgent parsed message |

<a name="module_Sensor.handlePresentation"></a>

### Sensor.handlePresentation(device, sensor, encoded) ⇒ <code>function</code> \| <code>function</code>
When HEAD detected, validate sensor.resource and value, then save sensor instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>function</code> - sensor.create<code>function</code> - sensor.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found device instance |
| sensor | <code>object</code> | Incoming sensor instance |
| encoded | <code>object</code> | IotAgent parsed message |

<a name="module_Sensor.createOrUpdate"></a>

### Sensor.createOrUpdate(device, sensor, resourceKey, resourceValue) ⇒ <code>function</code>
When POST or PUT method detected, validate sensor.resource and value, then save sensor instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>function</code> - sensor.publish  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found device instance |
| sensor | <code>object</code> | Incoming sensor instance |
| resourceKey | <code>number</code> | Sensor resource name ( OMA ) |
| resourceValue | <code>object</code> | Sensor resource value to save |

<a name="module_Sensor.getInstance"></a>

### Sensor.getInstance(pattern, sensor) ⇒ <code>function</code>
When GET method detected, find and publish instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>function</code> - Sensor.publish  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent detected pattern |
| sensor | <code>object</code> | Incoming sensor instance |

<a name="module_Sensor..updateCache"></a>

### Sensor~updateCache(device)
Update device's sensors stored in cache

**Kind**: inner method of [<code>Sensor</code>](#module_Sensor)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance returns {array} sensor |

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
Event reporting that a sensor instance will be deleted.

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
        * ["create" (ctx, user)](#event_create)
        * ["after confirm" (ctx)](#event_after confirm)
        * ["before confirm" (ctx)](#event_before confirm)
        * ["before delete" (ctx)](#event_before delete)

<a name="module_User.findByEmail"></a>

### User.findByEmail(email) ⇒ <code>object</code>
Find an user by its email address and send a confirmation link

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

