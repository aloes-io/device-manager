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
        * [.onPublish(packet, pattern)](#module_Application.onPublish) ⇒ <code>functions</code>
    * _inner_
        * [~findDeviceByPattern(pattern, message)](#module_Application..findDeviceByPattern) ⇒ <code>object</code>
        * [~executeDeviceCommand(pattern, message, device)](#module_Application..executeDeviceCommand) ⇒ <code>functions</code> \| <code>functions</code>
        * [~executeSensorCommand(pattern, message, device)](#module_Application..executeSensorCommand) ⇒ <code>functions</code> \| <code>functions</code>
        * [~parseApplicationMessage(packet, pattern)](#module_Application..parseApplicationMessage) ⇒ <code>functions</code> \| <code>functions</code>
        * ["after save" (ctx)](#event_after save)

<a name="module_Application.onPublish"></a>

### Application.onPublish(packet, pattern) ⇒ <code>functions</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - parseApplicationMessage  

| Param | Type | Description |
| --- | --- | --- |
| packet | <code>object</code> | MQTT bridge packet |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |

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

<a name="event_after save"></a>

### "after save" (ctx)
Event reporting that an application instance has been created or updated.

**Kind**: event emitted by [<code>Application</code>](#module_Application)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.instance | <code>object</code> | Application instance |

<a name="module_Device"></a>

## Device

* [Device](#module_Device)
    * _static_
        * [.refreshToken(device)](#module_Device.refreshToken) ⇒ <code>functions</code>
        * [.findByPattern(pattern, encoded)](#module_Device.findByPattern) ⇒ <code>object</code>
        * [.onPublish(pattern, packet)](#module_Device.onPublish) ⇒ <code>functions</code>
        * [.refreshToken(device)](#module_Device.refreshToken) ⇒ <code>functions</code>
        * [.search(filter)](#module_Device.search) ⇒ <code>array</code>
        * [.geoLocate(filter)](#module_Device.geoLocate) ⇒ <code>array</code>
    * _inner_
        * [~createToken(device)](#module_Device..createToken)
        * [~createDeviceProps(ctx)](#module_Device..createDeviceProps)
        * [~updateDeviceProps(ctx)](#module_Device..updateDeviceProps)
        * [~parseMessage(pattern, encoded)](#module_Device..parseMessage) ⇒ <code>functions</code> \| <code>functions</code>
        * [~findDevice(whereFilter)](#module_Device..findDevice) ⇒ <code>promise</code>
        * [~findAddresses(filter)](#module_Device..findAddresses) ⇒ <code>promise</code>
        * ["before save" (ctx)](#event_before save)
        * ["after save" (ctx)](#event_after save)
        * ["before delete"](#event_before delete)

<a name="module_Device.refreshToken"></a>

### Device.refreshToken(device) ⇒ <code>functions</code>
Create new token, and update Device instance

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

<a name="module_Device.findByPattern"></a>

### Device.findByPattern(pattern, encoded) ⇒ <code>object</code>
Find device related to incoming MQTT packet

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent parsed pattern |
| encoded | <code>object</code> | IotAgent parsed message |

<a name="module_Device.onPublish"></a>

### Device.onPublish(pattern, packet) ⇒ <code>functions</code>
Dispatch incoming MQTT packet

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - parseMessage  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | Pattern detected by Iot-Agent |
| packet | <code>object</code> | MQTT bridge packet |

<a name="module_Device.refreshToken"></a>

### Device.refreshToken(device) ⇒ <code>functions</code>
Create new token, and update Device instance

**Kind**: static method of [<code>Device</code>](#module_Device)  
**Returns**: <code>functions</code> - device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance |

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

<a name="module_Device..createToken"></a>

### Device~createToken(device)
Token creation helper

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | Device instance returns {object} token |

<a name="module_Device..createDeviceProps"></a>

### Device~createDeviceProps(ctx)
Init device depencies ( token, address )

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Application context |
| ctx.req | <code>object</code> | HTTP request |
| ctx.res | <code>object</code> | HTTP response |

<a name="module_Device..updateDeviceProps"></a>

### Device~updateDeviceProps(ctx)
Update device depencies ( token, sensors )

**Kind**: inner method of [<code>Device</code>](#module_Device)  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Application context |
| ctx.req | <code>object</code> | HTTP request |
| ctx.res | <code>object</code> | HTTP response |

<a name="module_Device..parseMessage"></a>

### Device~parseMessage(pattern, encoded) ⇒ <code>functions</code> \| <code>functions</code>
Find properties and dispatch to the right function

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

### "before delete"
Event reporting that a device instance will be deleted.

**Kind**: event emitted by [<code>Device</code>](#module_Device)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Express context. |
| ctx.req | <code>object</code> | Request |
| ctx.res | <code>object</code> | Response |
| ctx.where.id | <code>object</code> | Device id |

<a name="module_Files"></a>

## Files
<a name="module_Sensor"></a>

## Sensor

* [Sensor](#module_Sensor)
    * _static_
        * [.compose(device, encoded)](#module_Sensor.compose) ⇒ <code>object</code>
        * [.handlePresentation(device, sensor, encoded)](#module_Sensor.handlePresentation) ⇒ <code>function</code> \| <code>function</code>
        * [.createOrUpdate(device, sensor, encoded)](#module_Sensor.createOrUpdate) ⇒ <code>function</code> \| <code>function</code>
        * [.getInstance(pattern, sensor)](#module_Sensor.getInstance) ⇒ <code>object</code> \| <code>function</code>
    * _inner_
        * ["after save" (ctx)](#event_after save)
        * ["before delete" (ctx)](#event_before delete)

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

### Sensor.createOrUpdate(device, sensor, encoded) ⇒ <code>function</code> \| <code>function</code>
When POST or PUT method detected, validate sensor.resource and value, then save sensor instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>function</code> - sensor.create<code>function</code> - sensor.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| device | <code>object</code> | found device instance |
| sensor | <code>object</code> | Incoming sensor instance |
| encoded | <code>object</code> | IotAgent parsed message |

<a name="module_Sensor.getInstance"></a>

### Sensor.getInstance(pattern, sensor) ⇒ <code>object</code> \| <code>function</code>
When GET method detected, find and publish instance

**Kind**: static method of [<code>Sensor</code>](#module_Sensor)  
**Returns**: <code>object</code> - sensor<code>function</code> - app.publish  

| Param | Type | Description |
| --- | --- | --- |
| pattern | <code>object</code> | IotAgent detected pattern |
| sensor | <code>object</code> | Incoming sensor instance |

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

