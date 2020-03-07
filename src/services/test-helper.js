/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { promisify } from 'util';
import { omaObjects, omaViews } from 'oma-json';
import roleManager from './role-manager';
import deviceTypes from '../initial-data/device-types.json';

let lastAddressId = 0;
let lastApplicationId = 0;
let lastDeviceId = 0;
let lastSensorId = 0;
let lastMeasurmentId = 0;
let lastFileId = 0;
let lastUserId = 0;

function addressFactory(id, owner) {
  if (!owner) return null;
  let ownerType;
  if (id) {
    lastAddressId = id;
  } else {
    lastAddressId += 1;
    id = lastAddressId;
  }
  if (owner.devEui) {
    ownerType = 'Device';
  } else if (owner.roleName) {
    ownerType = 'User';
  }
  const address = {
    street: '1 rue du minage',
    streetName: 'Rue du minage',
    streetNumber: 0,
    postalCode: 17000,
    city: 'La Rochelle',
    verified: false,
    public: true,
    ownerId: owner.id,
    ownerType,
  };
  return address;
}

async function fileFactory(type) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const readFile = promisify(fs.readFile);
  const buffer = await readFile(`${path.resolve('.')}/docs/.vuepress/public/logo.png`);
  if (type === 'formdata') {
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: `test.png`,
      contentType: 'application/octet-stream',
      mimeType: 'application/octet-stream',
    });
    return formData;
  }
  return buffer;
}

function fileMetaFactory(id, file, ownerId) {
  if (id) {
    lastFileId = id;
  } else {
    lastFileId += 1;
    id = lastFileId;
  }
  ownerId = ownerId || lastUserId;

  const baseUrl = `${process.env.REST_API_ROOT}/Files/`;
  // const baseUrl = `${process.env.REST_API_ROOT}/${process.env.API_VERSION}/Files/`
  return {
    name: file.name,
    type: 'image/png',
    size: file.size,
    role: file.role,
    url: `${baseUrl}${ownerId}/download/${file.name}`,
    ownerId,
  };
}

function applicationFactory(id, ownerId) {
  if (id) {
    lastApplicationId = id;
  } else {
    lastApplicationId += 1;
    id = lastApplicationId;
  }
  ownerId = ownerId || lastUserId;
  return {
    name: `Application ${id}`,
    appEui: `12345${id}`,
    transportProtocol: 'lorawan',
    ownerId,
    pattern: '+appId/+collection/+method',
    validators: {
      collection: [
        {
          field: '+collection',
          value: 'application | device | sensor | iotagent',
          operation: 'equals',
          transformation: 'lowercase',
          registered: true,
        },
      ],
      method: [
        {
          field: '+method',
          value: 'HEAD | GET | POST | PUT | DELETE | STREAM',
          transformation: 'uppercase',
          operation: 'includes',
          registered: true,
        },
      ],
    },
  };
}

function clientEvent(client, event) {
  return new Promise((resolve, reject) => {
    client.once(event, resolve);
    client.once('error', reject);
  });
}

function clientFactory(profile, type, key) {
  let clientId;
  if (type === 'user') {
    clientId = `${profile.id}-${Math.random()
      .toString(16)
      .substr(2, 8)}`;
  } else if (type === 'device') {
    clientId = `${profile.devEui}-${Math.random()
      .toString(16)
      .substr(2, 8)}`;
  } else if (type === 'application') {
    clientId = `${profile.id}-${Math.random()
      // clientId = `${profile.appEui}-${Math.random()
      .toString(16)
      .substr(2, 8)}`;
  } else {
    clientId = profile.id;
  }
  return {
    keepalive: 60,
    reschedulePings: true,
    reconnectPeriod: 1000,
    connectTimeout: 2 * 1000,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    clientId,
    username: profile.id.toString(),
    password: key.toString(),
    will: { topic: `${clientId}/status`, payload: 'KO?', retain: false, qos: 0 },
  };
}

function deviceFactory(id, ownerId) {
  if (id) {
    lastDeviceId = id;
  } else {
    lastDeviceId += 1;
    id = lastDeviceId;
  }
  ownerId = ownerId || lastUserId;
  const deviceTypesList = Object.keys(deviceTypes);
  return {
    name: `Device ${id}`,
    type: deviceTypesList[Math.floor(Math.random() * deviceTypesList.length)],
    devEui: `12345${id}`,
    transportProtocol: 'aloeslight',
    messageProtocol: 'aloeslight',
    ownerId,
  };
}

function measurementFactory(id, sensor, ownerId) {
  if (id) {
    lastMeasurmentId = id;
  } else {
    lastMeasurmentId += 1;
    id = lastMeasurmentId;
  }
  ownerId = ownerId || lastUserId;
  return {
    value: 1,
    timestamp: new Date().getTime(),
    type: sensor.type,
    resource: sensor.resource,
    nativeSensorId: sensor.nativeSensorId,
    nativeNodeId: sensor.nativeNodeId,
    sensorId: sensor.id,
    deviceId: sensor.deviceId,
    ownerId,
  };
}

function sensorFactory(id, device, ownerId, sensorType) {
  if (id) {
    lastSensorId = id;
  } else {
    lastSensorId += 1;
    id = lastSensorId;
  }
  ownerId = ownerId || lastUserId;
  if (!device) return null;
  let omaObject;
  if (sensorType) {
    omaObject = omaObjects.find(obj => obj.value === sensorType);
  }
  if (!omaObject) {
    omaObject = omaObjects[Math.floor(Math.random() * omaObjects.length)];
  }
  const resourceKeys = Object.keys(omaObject.resources);
  let resource = Number(resourceKeys[Math.floor(Math.random() * resourceKeys.length)]);
  const omaView = omaViews.find(view => view.value === omaObject.value);

  if (resource === 0 || resource === 5 || resource === 6) {
    // these resources have no description yet
    resource = 5700;
  }

  return {
    name: omaObject.name,
    type: omaObject.value,
    resource,
    resources: omaObject.resources,
    frameCounter: 0,
    icons: omaView.icons,
    colors: omaView.resources,
    // nativeSensorId: id,
    nativeSensorId: 1,
    nativeNodeId: 0,
    nativeType: omaObject.value,
    ownerId,
    devEui: device.devEui,
    transportProtocol: device.transportProtocol,
    messageProtocol: device.messageProtocol,
    deviceId: device.id,
  };
}

function userFactory(id, roleName) {
  id = id || lastUserId + 1;
  lastUserId = id;
  const user = {
    email: `${roleName || 'name'}-${id}@aloes.io`,
    password: `user-${id}-pwd`,
    // emailVerified: true,
  };

  if (roleName) {
    user.roleName = roleName;
  }
  return user;
}

function buildMethods(profile) {
  return {
    profile,
    create: app =>
      app.models.user
        .create({
          email: profile.email,
          password: profile.password,
          // emailVerified: true,
        })
        .then(user => {
          // restricted the admin creation in app:
          // admin role cannot be set without a valid admin session
          if (profile.roleName === 'admin') {
            // need to manually set the role here
            return roleManager.setUserRole(app, user.id, 'admin', true).then(() => user); // force the return of the user
          }
          return user;
        }),
    login: app => app.models.user.login(profile),
  };
}
function timeout(fn, delay) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        fn();
        resolve();
      } catch (err) {
        reject(err);
      }
    }, delay);
  });
}

module.exports = {
  clientEvent,
  timeout,
  factories: {
    address: addressFactory,
    application: applicationFactory,
    client: clientFactory,
    device: deviceFactory,
    file: fileFactory,
    fileMeta: fileMetaFactory,
    measurement: measurementFactory,
    sensor: sensorFactory,
    user: userFactory,
  },
  access: {
    admin: buildMethods(userFactory(undefined, 'admin')),
    user: buildMethods(userFactory(undefined, 'user')),
  },
};
