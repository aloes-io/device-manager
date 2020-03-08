<a name="module_Utils"></a>

## Utils

* [Utils](#module_Utils)
    * [.buildError(statusCode, code, message)](#module_Utils.buildError) ⇒ <code>Error</code>
    * [.mkDirByPathSync(targetDir, options)](#module_Utils.mkDirByPathSync) ⇒ <code>Promise.&lt;string&gt;</code>
    * [.readFile(options)](#module_Utils.readFile) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.readFile(filePath, [opts])](#module_Utils.readFile) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.writeFile(filePath, data, [opts])](#module_Utils.writeFile) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.removeFile(filePath)](#module_Utils.removeFile) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.cacheIterator(Model, [filter])](#module_Utils.cacheIterator) ⇒ <code>Promise.&lt;string&gt;</code>
    * [.generateKey([hmacKey], [algorithm], [encoding])](#module_Utils.generateKey) ⇒ <code>string</code>
    * [.flatten(input)](#module_Utils.flatten) ⇒ <code>array</code>
    * [.exportToCSV(input, [filter])](#module_Utils.exportToCSV) ⇒ <code>object</code>
    * [.isMasterProcess(env)](#module_Utils.isMasterProcess) ⇒ <code>boolean</code>
    * [.getOwnerId(options)](#module_Utils.getOwnerId) ⇒ <code>string</code> \| <code>null</code>

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

### Utils.exportToCSV(input, [filter]) ⇒ <code>object</code>
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

