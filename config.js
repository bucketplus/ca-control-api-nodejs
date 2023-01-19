import fs from 'fs';
import path  from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestfile = fs.readFileSync(path.join(__dirname, '../../../manifest.json'))
const manifestObject = JSON.parse(manifestfile.toString());


const expectedParamType = {
  label: {
    required: true,
    expectedFormat: ''
  },
  description: {
    required: false,
    expectedFormat: ''
  },
  paramType: {
    required: true,
    expectedFormat: '',
    options: ['input', 'output', 'option']
  },
  type: {
    required: true,
    expectedFormat: '',
    options: ['text', 'boolen', 'file', 'url']
  },
  fileTypes: {
    required: false,
    expectedFormat: ''
  },
  required: {
    required: true,
    expectedFormat: false
  },
  defaultValue: {
    required: false
  }
}

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
  },
  params: {
    required: true,
    expectedFormat: [expectedParamType]
  }
};

function checkObject(expectedObject, parsedObject, key) {
  if(expectedObject.required && !parsedObject) 
    throw new Error(`${key} not found in manifest file`);
  if(parsedObject){
    if(typeof(expectedObject.expectedFormat) === 'object')
      for(let subkey in expectedObject.expectedFormat)
        checkObject(expectedObject.expectedFormat[subkey], parsedObject[subkey], subkey);
    else if(typeof(parsedObject) !== typeof(expectedObject.expectedFormat))
      throw new Error(`${key} in manifest file should be of ${typeof(expectedObject.expectedFormat)} type`) 
  }
}

for(let key in expectedManifest) {
  if(key === 'params') {    
    if(!manifestObject.params || !Object.keys(manifestObject.params).length)
      throw new Error('No param found')
    for(const paramKey in manifestObject.params) {
      const param = manifestObject.params[paramKey]      
      for(let expectedParamkey in expectedParamType){
        checkObject(expectedParamType[expectedParamkey], param[expectedParamkey], expectedParamkey);
      }
    }
  } else 
    checkObject(expectedManifest[key], manifestObject[key], key);  
}