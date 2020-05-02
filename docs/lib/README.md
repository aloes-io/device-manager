<a name="module_Utils"></a>

## Utils

* [Utils](#module_Utils)
    * _static_
        * [.buildError(statusCode, code, message)](#module_Utils.buildError) ⇒ <code>Error</code>
        * [.mkDirByPathSync(targetDir, options)](#module_Utils.mkDirByPathSync) ⇒ <code>Promise.&lt;string&gt;</code>
        * [.readFile(options)](#module_Utils.readFile) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.readFile(filePath, [opts])](#module_Utils.readFile) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.writeFile(filePath, data, [opts])](#module_Utils.writeFile) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.removeFile(filePath)](#module_Utils.removeFile) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.cacheIterator(Model, [filter])](#module_Utils.cacheIterator) ⇒ <code>Promise.&lt;string&gt;</code>
        * [.find(Model, [filter])](#module_Utils.find) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
        * [.find(Model, [filter])](#module_Utils.find) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.find(Model, id, [filter])](#module_Utils.find) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.create(Model, instances)](#module_Utils.create) ⇒ <code>Promise.&lt;(object\|Array.&lt;object&gt;)&gt;</code>
        * [.updateAttribute(instance, name, value)](#module_Utils.updateAttribute) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.updateAttributes(instance, attributes)](#module_Utils.updateAttributes) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.generateKey([hmacKey], [algorithm], [encoding])](#module_Utils.generateKey) ⇒ <code>string</code>
        * [.flatten(input)](#module_Utils.flatten) ⇒ <code>array</code>
        * [.exportToCSV(input, [filter])](#module_Utils.exportToCSV) ⇒ <code>string</code>
        * [.isMasterProcess(env)](#module_Utils.isMasterProcess) ⇒ <code>boolean</code>
        * [.getOwnerId(options)](#module_Utils.getOwnerId) ⇒ <code>string</code> \| <code>null</code>
    * _inner_
        * [~getCacheKey(iterator)](#module_Utils..getCacheKey) ⇒ <code>Promise.&lt;string&gt;</code>

<a name="module_Utils.buildError"></a>

### Utils.buildError(statusCode, code, message) ⇒ <code>Error</code>
Custom Error builder

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type | Description |
| --- | --- | --- |
| statusCode | <code>number</code> |  |
| code | <code>string</code> | error description |
| message | <code>string</code> | error message |

<a name="module_Utils.mkDirByPathSync"></a>

### Utils.mkDirByPathSync(targetDir, options) ⇒ <code>Promise.&lt;string&gt;</code>
Create directory

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>Promise.&lt;string&gt;</code> - directory path  

| Param | Type |
| --- | --- |
| targetDir | <code>string</code> | 
| options | <code>object</code> | 

<a name="module_Utils.readFile"></a>

### Utils.readFile(options) ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to render EJS template in HTML

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>Promise.&lt;object&gt;</code> - - HTML file and options  

| Param | Type |
| --- | --- |
| options | <code>object</code> | 

<a name="module_Utils.readFile"></a>

### Utils.readFile(filePath, [opts]) ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to read a file

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> |  |
| [opts] | <code>string</code> | format of the file |

<a name="module_Utils.writeFile"></a>

### Utils.writeFile(filePath, data, [opts]) ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to write a file

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> |  |
| data | <code>object</code> | file content |
| [opts] | <code>string</code> | format of the file |

<a name="module_Utils.removeFile"></a>

### Utils.removeFile(filePath) ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to remove a file

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type |
| --- | --- |
| filePath | <code>string</code> | 

<a name="module_Utils.cacheIterator"></a>

### Utils.cacheIterator(Model, [filter]) ⇒ <code>Promise.&lt;string&gt;</code>
Iterate over each KV Store keys found in cache

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>Promise.&lt;string&gt;</code> - Storage key  

| Param | Type | Description |
| --- | --- | --- |
| Model | <code>object</code> | Loopback Model |
| [filter] | <code>object</code> | filter.match |

<a name="module_Utils.find"></a>

### Utils.find(Model, [filter]) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
Promise wrapper to find Model instances

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>Promise.&lt;Array.&lt;object&gt;&gt;</code> - instances  

| Param | Type |
| --- | --- |
| Model | <code>function</code> | 
| [filter] | <code>object</code> | 

<a name="module_Utils.find"></a>

### Utils.find(Model, [filter]) ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to findOne Model instance

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>Promise.&lt;object&gt;</code> - instance  

| Param | Type |
| --- | --- |
| Model | <code>function</code> | 
| [filter] | <code>object</code> | 

<a name="module_Utils.find"></a>

### Utils.find(Model, id, [filter]) ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to findById Model instance

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>Promise.&lt;object&gt;</code> - instance  

| Param | Type |
| --- | --- |
| Model | <code>function</code> | 
| id | <code>string</code> \| <code>number</code> | 
| [filter] | <code>object</code> | 

<a name="module_Utils.create"></a>

### Utils.create(Model, instances) ⇒ <code>Promise.&lt;(object\|Array.&lt;object&gt;)&gt;</code>
Promise wrapper to create Model instance(s)

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type |
| --- | --- |
| Model | <code>function</code> | 
| instances | <code>object</code> \| <code>Array.&lt;object&gt;</code> | 

<a name="module_Utils.updateAttribute"></a>

### Utils.updateAttribute(instance, name, value) ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to updateAttribute of an instance

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>Promise.&lt;object&gt;</code> - instance  

| Param | Type |
| --- | --- |
| instance | <code>function</code> | 
| name | <code>string</code> | 
| value | <code>any</code> | 

<a name="module_Utils.updateAttributes"></a>

### Utils.updateAttributes(instance, attributes) ⇒ <code>Promise.&lt;object&gt;</code>
Promise wrapper to updateAttributes of an instance

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>Promise.&lt;object&gt;</code> - instance  

| Param | Type |
| --- | --- |
| instance | <code>function</code> | 
| attributes | <code>object</code> | 

<a name="module_Utils.generateKey"></a>

### Utils.generateKey([hmacKey], [algorithm], [encoding]) ⇒ <code>string</code>
Key generator for authentification

**Kind**: static method of [<code>Utils</code>](#module_Utils)  
**Returns**: <code>string</code> - key - Encoded key  

| Param | Type |
| --- | --- |
| [hmacKey] | <code>string</code> | 
| [algorithm] | <code>string</code> | 
| [encoding] | <code>string</code> | 

<a name="module_Utils.flatten"></a>

### Utils.flatten(input) ⇒ <code>array</code>
Array flattener, to transform multi dimensional arrays

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type |
| --- | --- |
| input | <code>array</code> | 

<a name="module_Utils.exportToCSV"></a>

### Utils.exportToCSV(input, [filter]) ⇒ <code>string</code>
Convert an object as a CSV table

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type |
| --- | --- |
| input | <code>object</code> \| <code>array</code> | 
| [filter] | <code>object</code> | 

<a name="module_Utils.isMasterProcess"></a>

### Utils.isMasterProcess(env) ⇒ <code>boolean</code>
Check if a process is configured to be master

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type | Description |
| --- | --- | --- |
| env | <code>object</code> | environment variables |

<a name="module_Utils.getOwnerId"></a>

### Utils.getOwnerId(options) ⇒ <code>string</code> \| <code>null</code>
Extract ownerId from HTTP user options

**Kind**: static method of [<code>Utils</code>](#module_Utils)  

| Param | Type |
| --- | --- |
| options | <code>object</code> | 

<a name="module_Utils..getCacheKey"></a>

### Utils~getCacheKey(iterator) ⇒ <code>Promise.&lt;string&gt;</code>
Promise wrapper to get next key in Cache store

**Kind**: inner method of [<code>Utils</code>](#module_Utils)  

| Param | Type |
| --- | --- |
| iterator | <code>object</code> | 

