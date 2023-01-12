import fs from 'fs';
import axios from 'axios';
import AWS from 'aws-sdk';

const CA_ENDPOINT = process.env.CA_ENDPOINT;
const isProd = (process.env.CA_ENV == 'production');

function getInputS3({accessKeyId, secretAccessKey, endpoint}) {
  const s3 = new AWS.S3({
    accessKeyId,
    secretAccessKey,
    endpoint,
  });
  return s3;
}

function getOutputS3({accessKeyId, secretAccessKey, endpoint}) {
  return new AWS.S3({
    accessKeyId,
    secretAccessKey,
    endpoint,
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

async function readInputFile(bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getInputS3(bucketCreds);
  const data = await s3.getObject({
    Bucket: bucketCreds.bucket,
    Key: bucketCreds.key,
  }).promise();
  return data.Body;
}

async function getSignedInputFileUrl(bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getInputS3(bucketCreds);
  return s3.getSignedUrl('getObject', {
    Bucket: bucketCreds.bucket,
    Key: bucketCreds.key,
  });
}
async function getSignedOutputFileUrl(contentType, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getOutputS3(bucketCreds);
  return s3.getSignedUrl('putObject', {
    Bucket: bucketCreds.bucket,
    Key: bucketCreds.key,
    ContentType: contentType
  });
}

async function listInputFolderObjects(bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getInputS3(bucketCreds);
  const resp = await s3.listObjectsV2({
    Bucket: bucketCreds.bucket,
    Prefix: bucketCreds.key,
    MaxKeys: 1000,
  }).promise();
  console.log(resp);
  return resp.Contents;
}

async function writeOutputFile(content, contentType, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getOutputS3(bucketCreds);
  return await s3.putObject({
    Bucket: bucketCreds.bucket,
    Key: bucketCreds.key,
    Body: content,
    ContentType: contentType,
  }).promise();
}

async function uploadOutputFile(localPath, contentType, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getOutputS3(bucketCreds);
  return await s3.putObject({
    Bucket: bucketCreds.bucket,
    Key: bucketCreds.key,
    Body: fs.readFileSync(localPath),
    ContentType: contentType,
  }).promise();
}

async function uploadOutputFileToKey(localPath, contentType, key, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getOutputS3(bucketCreds);
  return await s3.putObject({
    Bucket: bucketCreds.bucket,
    Key: (bucketCreds.key ? `${bucketCreds.key}/${key}` : `${key}`),
    Body: fs.readFileSync(localPath),
    ContentType: contentType,
  }).promise();
}

async function downloadInputFile(localPath, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getInputS3(bucketCreds);
  const { Body } = await s3.getObject({
    Bucket: bucketCreds.bucket,
    Key: bucketCreds.key,
  }).promise()
  return fs.writeFileSync(localPath, Body.toString());

}

async function writeObjectFileToKey(content, contentType, key, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getOutputS3(bucketCreds);
  return await s3.putObject({
    Bucket: bucketCreds.bucket,
    Key: (bucketCreds.key ? `${bucketCreds.key}/${key}` : `${key}`),
    Body: content,
    ContentType: contentType,
  }).promise();
}

async function getSignedOutputFileForKey(contentType, key, bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getOutputS3(bucketCreds);
  return s3.getSignedUrl('putObject', {
    Bucket: bucketCreds.bucket,
    Key: (bucketCreds.key ? `${bucketCreds.key}/${key}` : `${key}`),
    ContentType: contentType
  });
}

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

async function requestInputObject(bucketUrl) {
  const bucketCreds = getBucketParams(bucketUrl);
  const s3 = getInputS3(bucketCreds);
  return await s3.getObject({
    Bucket: bucketCreds.bucket,
    Key: bucketCreds.key,
  }).promise();
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
  readInputFile,
  writeOutputFile,
  charge,
  log,
  reportStarted,
  reportFailed,
  reportCompleted,
  getSignedInputFileUrl,
  getSignedOutputFileUrl,
  listInputFolderObjects,
  writeObjectFileToKey,
  getSignedOutputFileForKey,
  uploadOutputFile,
  downloadInputFile,
  uploadOutputFileToKey,
  requestInputObject,
}
