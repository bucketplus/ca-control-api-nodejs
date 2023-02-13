# About Efficient Actions

This Readme contains info to help developers build Standard Container Services for Cloud Actions.

Standard Container Services perform modular tasks such as importing and analyzing files or enriching and transforming data. Standard Container Services must:
1. Contain a valid Dockerfile.
3. Contain a valid manifest.json file.
4. Take an input, produce an output or both.
5. Return a JSON.
6. Use the Control API to send progress updates.

# Dockerfile
Each Standard Container Service must include a Dockerfile that runs one job to completion, then terminates. It should terminate as quickly as possible, and should not start a long-running service (e.g. it should not start a Node.js express server). It should be as light as possible.

# Manifest
Each Standard Container Service must include a `manifest.json` file that includes:

* `version` - the manifest version - set to `0.1` for now.

* `controlVersion` - the version of the control API it relies on

* `public` - whether the action should be listed in our marketplace, or private to the user

* `name` - the name of the service.

* `description` - a human-readable description of the service.

* `icon` - path to a local 512x512 jpg or png file that represents the service.

* `developer` - the email address of the developer (should match their login)

* `tags` - an array of text tags that describe the action (these should be defined somewhere so people re-use the same labels)

* `attribution` - info about external services used, if any

  * `name` - the name of the external service that powers the action
  
  * `url` - the URL of the external service that powers the action
  
* `billing` - info about the cost of this service. Collected fees are shared between Bucket+ and the developer.

  * `unit_name` - the plural name of the chargeable unit, e.g. `pixels`, `characters`, `bytes`, or `seconds`
  
  * `unit_price` - the default chargeable price per unit
  
* `params` - an array of custom job parameters that should be passed by the end user when invoking the service container. Each should include:

  * `name` - the name of the environment variable when passed to the service, e.g. `JP_INPUT_FILE`. All parameter names should start with `JP_` (for job parameter), and should be in ALL_CAPS.
  
  * `label` - a human-readable to help users understand the parameter
  
  * `description` - a human-readable description to help users understand the parameter 
  
  * `paramType` - either `input`, `output`, or `option`.
  
  * `type` - the display type for the input, either `text`, `boolen`, `file` , `url`.   *Support for select, number, email, url or checkbox - Coming Soon*

  * `fileTypes` - array of mime types supported of file if params.type is file,This can be from predefined group of mime types or array of any mime types, Some predefined fileTypes are : `image`, `video`, `audio` `document`.

  * `required` - true if the parameter is required  
  
  * `defaultValue` - a default value, if any
  
* `compute` - info about the compute properties of the container

  * `RAM` - the default RAM to allocate to the container, in Gigabytes
  
  * `vCPU` - the default number of vCPUs to allocate to the container
  
  * `spot` - whether the container can run in a spot instance (strongly recommended for services which can safely re-run if terminated early). *Coming Soon*

# The Control API
The Efficient Actions Control API contains convenience methods making it easier for service developers to. This repo contains code for Node.js based containers.

## Installation
To install the Control API in a node.js container, run:
 `yarn add @efficientactions/ca-control-api-nodejs`.

## Importing 
To import the Control api, add:
`import ca from '@efficientactions/ca-control-api-nodejs;` to your code

## Environment Variables
The API expects the following .env variables to be set:

#### Only needed in production:
* `CA_ENV` (not needed in development)
* `CA_ENDPOINT` (not needed in development)
* `CA_JOB_ID` (not needed in development)

### Job Parameter Environment Variables
* Each Job Parameter defined in the manifest will be validated and sent using the appropriate name, e.g. `JP_INPUT_FILE`.

### Service Secret Environment Variables
* Each Service Secret defined in the manifest will be validated and sent using the appropriate name, e.g. `SS_GOOGLE_TRANSLATE_API_KEY`.

##  Methods
The following methods are currently available via the control API:

### Reading Params

#### For param.type = `file` containers

* `ca.getReadSignedUrl(bucketKey)` - return signed url for a file to read.

* `ca.readFile(bucketKey)` - reads the cloud input file as a stream. Recommended for small files, e.g. text and image files.

* `ca.downloadFile(bucketKey, localPath)` - downloads the cloud input file to a local relative path. Recommended for larger files, e.g. video files.

#### For param.type = `folder` containers
* `ca.downloadFiles(folderKey, localFolderPath)` - downloads all cloud input files to a local folder. *Coming Soon*

* `ca.listFolderObjects(folderKey)` - provides an array of all cloud input files in a folder.


### Writing Params

#### For param.type = `file` containers

* `ca.writeFile(bucketKey, fileStream)` - writes content to the cloud output file from stream/Buffer. The maximum size of a single object is limited to 5TB.

* `ca.uploadFile(bucketKey, localPath)` - uploads a specified local file to the cloud output file.

* `ca.getWriteSignedUrl(bucketKey)` - return signed url for a file to write.

#### For param.type = `folder` containers

* `ca.getWriteSignedUrlForFolder(folderKey, key)` - return signed url for a file to write for specified key path.

* `ca.uploadFileToFolder(folderKey, localPath, contentType, key)` - uploads a specified local file to the cloud output file for specified key path.

* `ca.writeFileToFolder(folderKey, content, key)` -writes content to the cloud output file for specified key path. Recommended for small files, e.g. text and image files.

* `ca.uploadOutputFiles(folderKey, localFolderPath)` - uploads all the files from a specified local folder to the cloud output folder. *Coming Soon*

### Lifecycle Updates

#### On Start
Each container must invoke `ca.reportStarted()` as soon as possible. This is used for timing and to confirm that the container has started.

#### On Completion
Each container must invoke `ca.reportCompleted(data)` as soon as the container has finished running. This is used for timing, and to confirm that the job completed successfully. Containers that fail to call this method will be re-attempted. Developers can optionally pass a `data` object in JSON format. For more information, see "Understanding JSON return values".

In addition, on completion each container must call `ca.charge(quantity, unit_name)` to charge the end customer. The `unit` specified MUST match the `unit_name` specified in the manifest. This function should only be invoked once, and only once the job has successfully completed.

#### On Error
Each container must invoke `ca.reportFailed(msg)` if a container fails. Developers should pass a meaningful `msg` parameter which will be visible to end users. Please note - once a failure report has been sent, the container should exit immediately, and should not send any further updates.

#### Logging
To log data, use `ca.log(...msg)`. This will immediately be passed to `console.log`, making it easy to use, but will also be retained for 30 days in production to enable debugging if needed.

## Notes

### Understanding manifest `params paramType`
paramType is decided based on the need of the parameter. `paramType` is
* `input` : if the parameter is needed as an `input` to the service
* `ouput` : if the parameter is an `output` of the service 
* `option`: if the parameter is neither an input nor an output type and is needed by the service to provide additional information for the job. Eg. a `JP_CONVERT_LANGUAGE` parameter in a text translation service which determines the language in which the service has to translate the text to.

### Understanding manifest `params type`
`type` is decided by the display and format type for the parameter. `type` is
* `text` : if the parameter needs a text value. This is a string.
* `boolean` : if the parameter needs a boolean value. This can be `true` or `false`. 
* `file`: if the parameter needs a file value. This can be a `bucketurl`. *(url,localfile - Coming Soon)* . `bucketurl` is of the format `https://accesskey:secretkey@endpoint/path`, where 

  * `accesskey` and `secretkey` is the access key id and secret access key to access the bucket.
  * `endpoint` is the bucekt endpoint which is provider specific , eg. for a bucket in aws it would be bucket-name.s3.region-code.amazonaws.com'.
  * `path` is the path the bucket where the file is present or needs to be uploaded. It must include the filename with extension. Eg. mydirectory/filename.txt
  The suggested `name` for this parameter type is `JP_INPUT_FILE`, and suggested `label` is `Input file Path`. 
* `folder`: if the parameter needs a folder value. This can be a `bucketurl` *(url, localfile - Coming Soon)* . `bucketurl` is of the format `https://accesskey:secretkey@endpoint/path`, where 

  * `accesskey` and `secretkey` are the access key id and secret access key to access the bucket.
  * `endpoint` is provider specific , eg. for aws it would be bucket-name.s3.region-code.amazonaws.com'.
  * `path` is the path of the folder in the bucket where the folder is present or needs to be created. It must include the foldername. Eg. mydirectory/foldername
 The suggested `name` for this parameter type is `JP_INPUT_FOLDER`, and suggested `label` is `Input file Path`. 
* `url` : if the parameter needs a url value. This is a string of a valid url format. 

### Naming suggestions for manifest `params`
for `type`=`file` and `paramType` = `input` 
* param `name` = `JP_INPUT_FILE`
* param `label` = `Input File Path`

for `type`=`file` and `paramType` = `output` 
* param `name` = `JP_OUTPUT_FILE`
* param `label` = `Output File Path`

for `type`=`folder` and `paramType` = `input` 
* param `name` = `JP_INPUT_FOLDER`
* param `label` = `Input Folder Path`

for `type`=`folder` and `paramType` = `output` 
* param `name` = `JP_OUTPUT_FOLDER`
* param `label` = `Output Folder Path`

### Understanding Signed Urls
Presigned URLs are generated for temporary download/upload access objects using a single url.

### Understanding JSON return values
When running actions, the user can choose whether to save the returned JSON (as a separate file), to receive it via webhook, or to process immediately via await - this is handled by the EfficientActions system, i.e. the individual statndard container service needs to return some JSON (can be null), and the EfficientActions system will handle the rest. 

#### Anonymize Image (Object/File Action that produces an anonymized file from the input file)
For an object/file action that produces a file, in the manifest the user specifies:
* the input file as a parameter (marked as type=file, paramType=input)
* the output file as a parameter (marked as type=file, paramType=output)

Please note - like all actions, this action will also generate a JSON "return value". In this case, it might be null, or it might contain metadata on the transformation, e.g. the number or position of faces. 

#### Extract Text (Object/File Action that extracts the text from a file)
For an object/file action that produces JSON only, in the manifest the user specifies:
* the input file as a parameter (marked as type=file, paramType=input)

Please note - like all actions, this action will also generate a JSON "return value". In this case it definitely will not be null - it will contain the extracted text. 

#### Import URL (Import Action that imports a file from a URL)
For an import action that has no file input, in the manifest the user specifies:
* the input URL as a parameter (marked as type=url, paramType=input)
* the output file as a parameter (marked as type=file, paramType=output)

Please note - like all actions, this action will also generate a JSON "return value". In this case, it might be null, or it might contain metadata on the import, e.g. the content type that was imported. 


### Example Actions
* https://github.com/bucketplus/ca-action-import-file-from-url
* https://github.com/bucketplus/ca-action-image-ocr
* https://github.com/bucketplus/ca-action-remove-bg-from-images
