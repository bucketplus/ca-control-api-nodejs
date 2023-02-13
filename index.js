import './config.js'
import axios from 'axios';
import * as Minio from 'minio';
import mime from "mime-types";

const CA_ENDPOINT = process.env.CA_ENDPOINT;
const isProd = (process.env.CA_ENV == 'production');

function getMinioClient({accessKeyId, secretAccessKey, endpoint}) {
  return new Minio.Client({
    endPoint: endpoint,
    useSSL: true,
    accessKey: accessKeyId,
    secretKey: secretAccessKey
  });
}

function getBucketParams(bucketKey) {
  const bucketUrl = process.env[bucketKey]
  // Assuming bucket url in this format 
  // https://accesskey:secretkey@endpoint/bucket/key
  const bucketCreds = bucketUrl.split('//')[1].split('@')
  return {
    accessKeyId: bucketCreds[0].split(':')[0],
    secretAccessKey: bucketCreds[0].split(':')[1],
    endpoint: bucketCreds[1].split('/')[0],
    bucket: bucketCreds[1].split('/')[1],
    key: bucketCreds[1].split('/')[2]
  }
}

// -----------------------------
// Reading Input file Functions
// -----------------------------

async function readFile(bucketKey) {
  const bucketCreds = getBucketParams(bucketKey);
  const minioClient = getMinioClient(bucketCreds);
  return await minioClient.getObject(
    bucketCreds.bucket,
    bucketCreds.key
  );
}


async function downloadFile(bucketKey, localPath) {
  const bucketCreds = getBucketParams(bucketKey);
  const minioClient = getMinioClient(bucketCreds);  
  await minioClient.fGetObject(
    bucketCreds.bucket,
    bucketCreds.key,
    localPath
  );
}


async function getReadSignedUrl(bucketKey) {
  const bucketCreds = getBucketParams(bucketKey);
  const minioClient = getMinioClient(bucketCreds);
  return minioClient.presignedGetObject(
    bucketCreds.bucket,
    bucketCreds.key,
    24*60*60
  )
}

// -----------------------------
// Reading Folder fuctions
// -----------------------------
async function listFolderObjects(folderKey) {
  const bucketCreds = getBucketParams(folderKey);
  const minioClient = getMinioClient(bucketCreds);
  var data = []
  var stream = await minioClient.listObjects(bucketCreds.bucket,'folder/', true)
  stream.on('data', function(obj) { data.push(obj) } )
  await new Promise(resolve => stream.on("end", function (obj) { 
    resolve(data);
  }))
  return data;
}

// -----------------------------
// Writing File Functions
// -----------------------------

async function writeFile(bucketKey, fileStream) {
  const bucketCreds = getBucketParams(bucketKey);
  const minioClient = getMinioClient(bucketCreds);  
  minioClient.putObject(
    bucketCreds.bucket,
    bucketCreds.key,
    fileStream
  );
}

async function uploadFile(bucketKey, localPath) {
  const bucketCreds = getBucketParams(bucketKey);
  const minioClient = getMinioClient(bucketCreds);
  const contentType = mime.lookup(`${tempDirectory}/${dir}/${file}`);
  const metaData = {
    'Content-Type': contentType
  }
  return await minioClient.fPutObject(
    bucketCreds.bucket,
    bucketCreds.key,
    localPath,
    metaData
  );
}

async function getWriteSignedUrl(bucketKey) {
  const bucketCreds = getBucketParams(bucketKey);
  const minioClient = getMinioClient(bucketCreds);
  return minioClient.presignedPutObject(
    bucketCreds.bucket,
    bucketCreds.key,
    24*60*60
  );
}


// -----------------------------
// Writing to Folder fuctions
// -----------------------------

async function getWriteSignedUrlForFolder(folderKey, key) {
  const bucketCreds = getBucketParams(folderKey);
  const minioClient = getMinioClient(bucketCreds);
  return minioClient.presignedPutObject(
    bucketCreds.bucket,
    bucketCreds.key ? `${bucketCreds.key}/${key}` : `${key}`,
    24*60*60
  );
}


async function uploadFileToFolder(folderKey, localPath, key) {
  const bucketCreds = getBucketParams(folderKey);
  const minioClient = getMinioClient(bucketCreds);
  const contentType = mime.lookup(`${tempDirectory}/${dir}/${file}`);
  const metaData = {
    'Content-Type': contentType
  }
  return await minioClient.fPutObject(
    bucketCreds.bucket,
    bucketCreds.key ? `${bucketCreds.key}/${key}` : `${key}`,
    localPath,
    metaData
  );
}

async function writeFileToFolder(folderKey, content, key) {
  const signedUrl = await getWriteSignedUrlForFolder(folderKey, key);
  return await axios({
    method: 'PUT',
    url: signedUrl,
    data: content
  });
}

// -----------------------------
// Lifecycle Updates functions
// -----------------------------

async function charge(quantity, unit) {
  if (isProd) {
    await axios.post(`${CA_ENDPOINT}/charge`, {
      jobId: process.env.CA_JOB_ID,
      quantity,
      unit,
    });
  } else {
    console.log('Charge', quantity, unit);
  }
}

async function log(...msg) {
  console.log(msg);
  if (isProd) {
    await axios.post(`${CA_ENDPOINT}/log`, {
      jobId: process.env.CA_JOB_ID,
      msg,
    });
  }
}

async function setStatus(status, msg) {
  console.log('Set job status to', status, msg);
  if (isProd) {
    await axios.post(`${CA_ENDPOINT}/status`, {
      jobId: process.env.CA_JOB_ID,
      status,
      msg
    });
  }
}

async function reportStarted() {
  await setStatus('STARTED');
}

async function reportCompleted(data) {
  if(process.env.jsonFilePath) {
    const signedUrl = await getWriteSignedUrl('jsonFilePath');
    await axios({
      method: 'PUT',
      url: signedUrl,
      data: data
    });
  }
  await setStatus('COMPLETED', data);
}

async function reportFailed(msg) {
  await setStatus('FAILED', msg);
}

export default {
  readFile,
  downloadFile,
  getReadSignedUrl,

  listFolderObjects,

  writeFile,
  uploadFile,
  getWriteSignedUrl,

  getWriteSignedUrlForFolder,
  uploadFileToFolder,
  writeFileToFolder,
  
  charge,
  log,
  reportStarted,
  reportFailed,
  reportCompleted,
}
