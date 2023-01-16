import axios from 'axios';
import * as Minio from 'minio';

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

function getBucketParams(bucketUrl) {
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
// Signed Url fuctions
// -----------------------------

async function getSignedInputFileUrl(bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const minioClient = getMinioClient(bucketCreds);
  return minioClient.presignedGetObject(
    bucketCreds.bucket,
    bucketCreds.key,
    24*60*60
  )
}

async function getSignedOutputFileUrl(bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const minioClient = getMinioClient(bucketCreds);
  return minioClient.presignedPutObject(
    bucketCreds.bucket,
    bucketCreds.key,
    24*60*60
  );
}

async function getSignedOutputUrlForKey(contentType, key, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const minioClient = getMinioClient(bucketCreds);
  return minioClient.presignedPutObject(
    bucketCreds.bucket,
    bucketCreds.key ? `${bucketCreds.key}/${key}` : `${key}`,
    24*60*60
  );
}

// -----------------------------
// File Reading fuctions
// -----------------------------

async function readFileAsStream(bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const minioClient = getMinioClient(bucketCreds);
  return await minioClient.getObject(
    bucketCreds.bucket,
    bucketCreds.key
  );
}

async function readFile(bucketUrl) {
  const signedUrl = await getSignedInputFileUrl(bucketUrl);
  return await axios({
    method: 'GET',
    url: signedUrl,
  });  
}

async function downloadFile(localPath, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const minioClient = getMinioClient(bucketCreds);  
  await minioClient.fGetObject(
    bucketCreds.bucket,
    bucketCreds.key,
    localPath
  );
}


// -----------------------------
// Folder fuctions
// -----------------------------
// TODO: Need fix
async function listInputFolderObjects(bucketUrl) {
  // const bucketCreds = getBucketParams(bucketUrl);
  // const minioClient = getMinioClient(bucketCreds);
  // var data = []
  // var stream = await minioClient.listObjects(bucketCreds.bucket,'folder/', true)
  // stream.on('data', function(obj) { data.push(obj) } )
  // stream.on("end", function (obj) { console.log(data) })
  // stream.on('error', function(err) { console.log(err) } )
}

// -----------------------------
// Writing File Functions
// -----------------------------

async function writeFile(bucketUrl, content) {
  const signedUrl = await getSignedOutputFileUrl(bucketUrl);  
  return await axios({
    method: 'PUT',
    url: signedUrl,
    data: content
  });
}

async function writeFileToKey(bucketUrl, content, key) {
  const signedUrl = await getSignedOutputFileUrl(`${bucketUrl/key}`);
  return await axios({
    method: 'PUT',
    url: signedUrl,
    data: content
  });
}


async function uploadFile(bucketUrl, localPath, contentType) {
  const bucketCreds = getBucketParams(bucketUrl);
  const minioClient = getMinioClient(bucketCreds);
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

async function uploadFileToKey(bucketUrl, localPath, contentType, key) {
  const bucketCreds = getBucketParams(bucketUrl);
  const minioClient = getMinioClient(bucketCreds);
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


// -----------------------------
// Cloud advisor internal functions
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
      msg,
    });
  }
}

async function reportStarted() {
  await setStatus('STARTED');
}

async function reportCompleted(msg) {
  await setStatus('COMPLETED', msg);
}

async function reportFailed(msg) {
  await setStatus('FAILED', msg);
}

export default {
  getSignedInputFileUrl,
  getSignedOutputFileUrl,
  getSignedOutputUrlForKey,

  readFileAsStream,
  readFile,
  downloadFile,

  listInputFolderObjects,

  writeFile,
  writeFileToKey,

  uploadFile,
  uploadFileToKey,

  charge,
  log,
  reportStarted,
  reportFailed,
  reportCompleted,
}
