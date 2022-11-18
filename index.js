import fs from 'fs';
import axios from 'axios';
import AWS from 'aws-sdk';

const BP_ENDPOINT = process.env.BP_ENDPOINT;
const isProd = (process.env.BP_ENV == 'production');

function getInputS3() {
  const s3 = new AWS.S3({
    accessKeyId: process.env.BP_INPUT_ACCESS_KEY,
    secretAccessKey: process.env.BP_INPUT_ACCESS_SECRET,
    endpoint: process.env.BP_INPUT_ENDPOINT,
  });
  return s3;
}

function getOutputS3() {
  return new AWS.S3({
    accessKeyId: process.env.BP_OUTPUT_ACCESS_KEY,
    secretAccessKey: process.env.BP_OUTPUT_ACCESS_SECRET,
    endpoint: process.env.BP_OUTPUT_ENDPOINT,
  });
}

async function readInputFile() {
  const s3 = getInputS3();
  const data = await s3.getObject({
    Bucket: process.env.BP_INPUT_BUCKET,
    Key: (process.env.BP_INPUT_FILE || process.env.BP_INPUT_PATH),
  }).promise();
  return data.Body;
}

async function getSignedInputFileUrl() {
  const s3 = getInputS3();
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.BP_INPUT_BUCKET,
    Key: (process.env.BP_INPUT_FILE || process.env.BP_INPUT_PATH),
  });
}
async function getSignedOutputFileUrl(contentType) {
  const s3 = getOutputS3();
  return s3.getSignedUrl('putObject', {
    Bucket: process.env.BP_OUTPUT_BUCKET,
    Key: (process.env.BP_OUTPUT_FILE || process.env.BP_OUTPUT_PATH),
    ContentType: contentType
  });
}

async function listInputFolderObjects() {
  const s3 = getInputS3();
  const resp = await s3.listObjectsV2({
    Bucket: process.env.BP_INPUT_BUCKET,
    Prefix: (process.env.BP_INPUT_FILE || process.env.BP_INPUT_PATH),
    MaxKeys: 1000,
  }).promise();
  console.log(resp);
  return resp.Contents;
}

async function writeOutputFile(content, contenttype) {
  const s3 = getOutputS3();
  return await s3.putObject({
    Bucket: process.env.BP_OUTPUT_BUCKET,
    Key: (process.env.BP_OUTPUT_FILE || process.env.BP_OUTPUT_PATH),
    Body: content,
    ContentType: contenttype,
  }).promise();
}

async function uploadOutputFile(localPath, contenttype) {
  const s3 = getOutputS3();
  return await s3.putObject({
    Bucket: process.env.BP_OUTPUT_BUCKET,
    Key: (process.env.BP_OUTPUT_FILE || process.env.BP_OUTPUT_PATH),
    Body: fs.readFileSync(localPath),
    ContentType: contenttype,
  }).promise();
}

async function uploadOutputFileToKey(localPath, contenttype, key) {
  const s3 = getOutputS3();
  return await s3.putObject({
    Bucket: process.env.BP_OUTPUT_BUCKET,
    Key: (process.env.BP_OUTPUT_PATH ? `${process.env.BP_OUTPUT_PATH}/${key}` : `${key}`),
    Body: fs.readFileSync(localPath),
    ContentType: contenttype,
  }).promise();
}

async function downloadInputFile(localPath) {
  const s3 = getInputS3();

  const { Body } = await s3.getObject({
    Bucket: process.env.BP_OUTPUT_BUCKET,
    Key: (process.env.BP_OUTPUT_FILE || process.env.BP_OUTPUT_PATH)
  }).promise()
  return fs.writeFileSync(localPath, Body.toString());

}

async function writeObjectFileToKey(content, contenttype, key) {
  const s3 = getOutputS3();
  return await s3.putObject({
    Bucket: process.env.BP_OUTPUT_BUCKET,
    Key: (`${process.env.BP_OUTPUT_PATH}/${key}` || `${key}`),
    Body: content,
    ContentType: contenttype,
  }).promise();
}

async function getSignedOutputFileForKey(contentType, key) {
  const s3 = getOutputS3();
  return s3.getSignedUrl('putObject', {
    Bucket: process.env.BP_OUTPUT_BUCKET,
    Key: (process.env.BP_OUTPUT_PATH ? `${process.env.BP_OUTPUT_PATH}/${key}` : `${key}`),
    ContentType: contentType
  });
}

async function charge(quantity, unit) {
  if (isProd) {
    await axios.post(`${BP_ENDPOINT}/charge`, {
      jobId: process.env.BP_JOB_ID,
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
    await axios.post(`${BP_ENDPOINT}/log`, {
      jobId: process.env.BP_JOB_ID,
      msg,
    });
  }
}

async function setStatus(status, msg) {
  console.log('Set job status to', status, msg);
  if (isProd) {
    await axios.post(`${BP_ENDPOINT}/status`, {
      jobId: process.env.BP_JOB_ID,
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
  uploadOutputFileToKey
}
