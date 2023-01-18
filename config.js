import fs from 'fs';
import path  from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestfile = fs.readFileSync(path.join(__dirname, '../../../manifest.json'))
const manifestObject = JSON.parse(manifestfile.toString());

const expectedManifest = {
  version: {
    required: true,
    expectedFormat: ''
  },
  controlVersion:  {
    required: true,
    expectedFormat: ''
  },
  name: {
    required: true,
    expectedFormat: ''
  },
  description: {
    required: false,
    expectedFormat: ''
  },
  developer: {
    required: false,
    expectedFormat: ''
  },
  tags: {
    required: false,
    expectedFormat: ''
  },
  attribution: {
    required: false,
    expectedFormat: {
      name: {
        required: true,
        expectedFormat: ''
      },
      url: {
        required: true,
        expectedFormat: ''
      }
    }
  },
  billing: {
    required: true,
    expectedFormat: {
      unit: {
        required: true,
        expectedFormat: ''
      },
      price: {
        required: true,
        expectedFormat: 0.1
      }
    }
  },
  compute: {
    required: true,
    expectedFormat: {
      RAM: {
        required: true,
        expectedFormat: 0.5
      },
      vCPU: {
        required: true,
        expectedFormat: 0.5
      }
    }
  }
};

function checkObject(expectedObject, parsedObject, key) {
  if(parsedObject){
    if(typeof(expectedObject.expectedFormat) === 'object')
      for(let subkey in expectedObject.expectedFormat)
        checkObject(expectedObject.expectedFormat[subkey], parsedObject[subkey], subkey);
    else if(typeof(parsedObject) !== typeof(expectedObject.expectedFormat))
      throw new Error(`${key} in manifest file should be of ${typeof(expectedObject.expectedFormat)} type`) 
  }
}

for(let key in expectedManifest)
  checkObject(expectedManifest[key], manifestObject[key], key);