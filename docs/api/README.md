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
        * [~findDevice(message, pattern)](#module_Application..findDevice) ⇒ <code>object</code>
        * [~executeDeviceCommand(message, device, pattern)](#module_Application..executeDeviceCommand) ⇒ <code>functions</code> \| <code>functions</code>
        * [~executeSensorCommand(message, device, pattern)](#module_Application..executeSensorCommand) ⇒ <code>functions</code> \| <code>functions</code>
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

<a name="module_Application..findDevice"></a>

### Application~findDevice(message, pattern) ⇒ <code>object</code>
Find device related to incoming MQTT packet

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>object</code> - device  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed external app message |
| pattern | <code>object</code> | IotAgent detected pattern |

<a name="module_Application..executeDeviceCommand"></a>

### Application~executeDeviceCommand(message, device, pattern) ⇒ <code>functions</code> \| <code>functions</code>
When device found, execute payload method

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - Application.app.publish<code>functions</code> - Device.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed external app message |
| device | <code>object</code> | found device instance |
| pattern | <code>object</code> | IotAgent detected pattern |

<a name="module_Application..executeSensorCommand"></a>

### Application~executeSensorCommand(message, device, pattern) ⇒ <code>functions</code> \| <code>functions</code>
When sensor found, execute payload method

**Kind**: inner method of [<code>Application</code>](#module_Application)  
**Returns**: <code>functions</code> - Application.app.publish<code>functions</code> - Sensor.updateAttributes  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>object</code> | Parsed external app message |
| device | <code>object</code> | found device instance |
| pattern | <code>object</code> | IotAgent detected pattern |

<a name="module_Application..parseApplicationMessage"></a>

### Application~parseApplicationMessage(packet, pattern) ⇒ <code>functions</code> \| <code>functions</code>
Find properties and dipatch to the right function

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
<a name="module_Files"></a>

## Files
<a name="module_Sensor"></a>

## Sensor
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

