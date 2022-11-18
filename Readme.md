# About Bucket+

This Readme contains info to help developers build Bucket+ Standard Container Services.

Standard Container Services import, export, modify, or analyze cloud-based objects. Standard Container Services must:
1. Contain a valid Dockerfile
2. Accept a "bucket path" input, output, or both.
3. Contain a valid manifest.json file.
4. Use the Control API to send progress updates.

# Dockerfile
Each Standard Container Service must include a Dockerfile that runs one job to completion, then terminates. It should terminate as quickly as possible, and should not start a long-running service (e.g. it should not start a Node.js express server). It should be as light as possible.

# Bucket Path
Every Standard Container Service must contain either a "bucket path" input, output or both. A "bucket path" is a fully defined reference to an entire bucket, a single folder within a bucket, or a single object within a bucket, together with the credentials needed to read/write to that path. Bucket Paths are defined via Environment Variables (see below).

# Manifest
Each Standard Container Service must include a `manifest.json` file that includes:

* `version` - the manifest version - set to `0.1` for now.
* `name` - the name of the service.
* `description` - a human-readable description of the service.
* `icon` - path to a local 512x512 jpg or png file that represents the service.
* `input` - info about the expected bucket path input, if any. This should include:
  * `type` - either `file`, `folder`, or `bucket`.

  * `supportedExtensions` (for `input.type=file` only) - an array of file extensions supported by this service, e.g. `.jpg`, `.png`.
* `output` - info about the expected bucket path output, if any. This should include:
  * `type` - either `file` or `folder`.

  * `defaultPath` - this should specify a default path where output files will be written. It will be appended to the input file path.
* `billing` - info about the cost of this service. Collected fees are shared between Bucket+ and the developer.
  * `unit_name` - the plural name of the chargeable unit, e.g. `pixels`, `characters`, `bytes`, or `seconds`

  * `unit_price` - the default chargeable price per unit

* `params` - an array of custom job parameters that should be passed by the end user when invoking the service container. Each should include:
  * `name` - the name of the environment variable when passed to the service, e.g. `JP_OUTPUT_LANGUAGE`. All parameter names should start with `JP_` (for job parameter), and should be in ALL_CAPS.

  * `label` - a human-readable to help users understand the parameter

  * `description` - a human-readable description to help users understand the parameter

  * `type` - the display type for the input, either `text`, `select`, `number`, `email`, `url` or `checkbox`

  * `required` - true if the parameter is required
  * `options` - an array of options (required for a `type=select` input), each with `label` and `value`

* `secrets` - an array of developer-defined service secrets that should be passed to the service container. Each should include:
  * `name` - the name of to the environment variable when passed to the service, e.g. `SS_GOOGLE_TRANSLATE_API_KEY`. All secret names should start with `SS_` (for service secret), and should be in ALL_CAPS.

  * `required` - whether the environment variable is required

* `compute` - info about the compute properties of the container
  * `RAM` - the default RAM to allocate to the container, in Gigabytes

  * `vCPU` - the default number of vCPUs to allocate to the container

  * `spot` - whether the container can run in a spot instance (strongly recommended for services which can safely re-run if terminated early).

# The Control API
The Bucket+ Control API contains convenience methods making it easier for service developers to. This repo contains code for Node.js based containers.

## Installation
To install the Control API in a node.js container, run:
 `yarn add https://www.github.com/bucketplus/bp-control-api-nodejs`.

## Environment Variables
The API expects the following .env variables to be set:

### Bucket+ Environment Variables

#### For services with input objects:
* `BP_INPUT_PROVIDER`, e.g. `aws`
* `BP_INPUT_BUCKET`, e.g. `bucket-plus-demo`
* `BP_INPUT_ENDPOINT`, e.g. `s3.us-east-1.amazonaws.com`
* `BP_INPUT_ACCESS_KEY`
* `BP_INPUT_ACCESS_SECRET`
* `BP_INPUT_FILE`, e.g. `myinput.txt` (for single-item objects only)
* `BP_INPUT_FOLDER` e.g. `myfolder/` (for folders of objects)

#### For services with output objects
* `BP_OUTPUT_PROVIDER`, e.g. `aws`
* `BP_OUTPUT_BUCKET`, e.g. `bucket-plus-demo`
* `BP_OUTPUT_ENDPOINT`, e.g. `s3.us-east-1.amazonaws.com`
* `BP_OUTPUT_ACCESS_KEY`
* `BP_OUTPUT_ACCESS_SECRET`
* `BP_OUTPUT_FILE`, e.g. `myinput.txt` (for single-item objects only)
* `BP_OUTPUT_FOLDER` e.g. `myfolder/` (for folders of objects)

#### Only needed in production:
* `BP_ENV` (not needed in development)
* `BP_ENDPOINT` (not needed in development)
* `BP_JOB_ID` (not needed in development)

### Job Parameter Environment Variables
* Each Job Parameter defined in the manifest will be validated and sent using the appropriate name, e.g. `JP_OUTPUT_LANGUAGE`.

### Service Secret Environment Variables
* Each Service Secret defined in the manifest will be validated and sent using the appropriate name, e.g. `SS_GOOGLE_TRANSLATE_API_KEY`.

##  Methods
The following methods are currently available via the control API:

### Reading Inputs

#### For input.type = `file` containers
* `bp.readInputFile()` - reads the cloud input file into buffer. Recommended for small files, e.g. text and image files.

* `bp.getSignedInputFileUrl()` - return signed url for a file to read.

* `bp.downloadInputFile(localPath)` - downloads the cloud input file to a local relative path. Recommended for larger files, e.g. video files.

#### For input.type = `folder` containers
* `bp.downloadInputFiles(localFolderPath)` - downloads all cloud input files to a local folder. *Coming Soon*

* `bp.listInputFiles()` - provides an array of all cloud input files. *Coming Soon*

* `bp.readInputFile(path)` - reads a specific cloud input file. *Coming Soon*

#### For output.type = `file` containers
* `bp.writeOutputFile(content, mimetype)` - writes content to the cloud output file. Recommended for small files, e.g. text and image files.

* `bp.writeObjectFileToKey(content, mimetype, key)` -writes content to the cloud output file for specified key path. Recommended for small files, e.g. text and image files.

* `bp.getSignedOutputFileUrl(contentType)` - return signed url for a file to write cloud output file.

* `bp.getSignedOutputFileForKey(contentType, key)` - return signed url for a file to write cloud output file for specified key path.

* `bp.uploadOutputFile(localPath, contenttype)` - uploads a specified local file to the cloud output file.

#### For output.type = `folder` containers

* `bp.uploadOutputFiles(localFolderPath)` - uploads all the files from a specified local folder to the cloud output folder.

* `bp.writeOutputFile(content, mimetype, cloudPath)` - writes one file to the cloud output folder. Recommended for small files, e.g. text and image files.

### Lifecycle Updates

#### On Start
Each container must invoke `bp.reportStarted()` as soon as possible. This is used for timing and to confirm that the container has started.

#### On Completion
Each container must invoke `bp.reportCompleted(data)` as soon as the container has finished running. This is used for timing, and to confirm that the job completed successfully. Containers that fail to call this method will be re-attempted. Developers can optionally pass a `data` object which will be saved to the job history, and sent to the client via requested notification channels.

In addition, on completion each container must call `bp.charge(quantity, unit_name)` to charge the end customer. The `unit` specified MUST match the `unit_name` specified in the manifest. This function should only be invoked once, and only once the job has successfully completed.

#### On Error
Each container must invoke `bp.reportFailed(msg)` if a container fails. Developers should pass a meaningful `msg` parameter which will be visible to end users. Please note - once a failure report has been sent, the container should exit immediately, and should not send any further updates.

#### Logging
To log data, use `bp.log(...msg)`. This will immediately be passed to `console.log`, making it easy to use, but will also be retained for 30 days in production to enable debugging if needed.
