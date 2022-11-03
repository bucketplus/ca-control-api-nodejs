import fs from 'fs';
import axios from 'axios';

const BP_ENDPOINT = process.env.BP_ENDPOINT;
const isProd = (process.env.BP_ENV == 'production');

const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf-8'));

if (manifest.options) {
  for (let option in manifest.options) {
    process.env[option] = manifest.options[option].test;
  }
}

if (manifest.env) {
  for (let env in manifest.env) {
    process.env[env] = manifest.env[env].test;
  }
}

async function readInputFile() {
  if (isProd) {
    const signResponse = await axios.post(`${BP_ENDPOINT}/sign`, {
      jobId: process.env.JOB_ID,
      type: 'source',
      path: process.env.INPUT_PATH,
    });
    const url = signResponse.data.url;
    const fileResponse = await axios.get(url);
    return fileResponse.data;
  } else {
    console.log('Read local file', manifest.input.test);
    return fs.readFileSync(manifest.input.test, 'utf-8');
  }
}

async function writeOutputFile(content, mimetype) {
  if (isProd) {
    const signResponse = await axios.post(`${BP_ENDPOINT}/sign`, {
      jobId: process.env.JOB_ID,
      type: 'destination',
      path: `${process.env.INPUT_PATH}/${process.env.OUTPUT_PATH}`,
    });
    const url = signResponse.data.url;
    const fileResponse = await axios.put(url, content, {
      headers: {
        'Content-Type': mimetype,
      },
    });
    return fileResponse.data;
  } else {
    console.log('Write local file', manifest.output.test);
    fs.writeFileSync(manifest.output.test, content, 'utf-8');
  }
}

async function charge(quantity, unit) {
  if (isProd) {
    await axios.post(`${BP_ENDPOINT}/charge`, {
      jobId: process.env.JOB_ID,
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
      jobId: process.env.JOB_ID,
      msg,
    });
  }
}

async function setStatus(status, msg) {
  if (isProd) {
    await axios.post(`${BP_ENDPOINT}/status`, {
      jobId: process.env.JOB_ID,
      status,
      msg,
    });
  } else {
    console.log('Set status to', status, msg);
  }
}

async function reportStarted() {
  await setStatus('STARTED');
}

async function reportCompleted() {
  await setStatus('COMPLETED');
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
}
