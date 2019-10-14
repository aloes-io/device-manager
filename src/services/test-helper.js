/* eslint-disable import/no-extraneous-dependencies */
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { promisify } from 'util';
import { omaObjects, omaViews } from 'oma-json';
import roleManager from './role-manager';
import deviceTypes from '../initial-data/device-types.json';

let lastDeviceId = 0;
let lastSensorId = 0;
let lastMeasurmentId = 0;
let lastFileId = 0;
let lastAddressId = 0;
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
  } else if (owner.role) {
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

function userFactory(id, role) {
  id = id || lastUserId + 1;
  lastUserId = id;
  const user = {
    email: `${role || 'name'}-${id}@aloes.io`,
    password: `user-${id}-pwd`,
    // emailVerified: true,
  };

  if (role) {
    user.role = role;
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
          if (profile.role === 'admin') {
            // need to manually set the role here
            return roleManager.setUserRole(app, user.id, 'admin', true).then(() => user); // force the return of the user
          }
          return user;
        }),
    login: app => app.models.user.login(profile),
  };
}

async function fileFactory(type) {
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

function sensorFactory(id, device, ownerId) {
  if (id) {
    lastSensorId = id;
  } else {
    lastSensorId += 1;
    id = lastSensorId;
  }
  ownerId = ownerId || lastUserId;
  if (!device) return null;
  const omaObject = omaObjects[Math.floor(Math.random() * omaObjects.length)];
  const resourceKeys = Object.keys(omaObject.resources);
  let resource = resourceKeys[Math.floor(Math.random() * resourceKeys.length)];
  const omaView = omaViews.find(view => view.value === omaObject.value);

  if (resource === 0 || resource === '0') {
    resource = 3300;
  }
  return {
    name: omaObject.name,
    type: omaObject.value,
    resource,
    resources: omaObject.resources,
    frameCounter: 0,
    icons: omaView.icons,
    colors: omaView.resources,
    nativeSensorId: id,
    nativeNodeId: 0,
    nativeType: omaObject.value,
    ownerId,
    devEui: device.devEui,
    transportProtocol: device.transportProtocol,
    messageProtocol: device.messageProtocol,
    deviceId: device.id,
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

module.exports = {
  factories: {
    user: userFactory,
    address: addressFactory,
    file: fileFactory,
    fileMeta: fileMetaFactory,
    device: deviceFactory,
    sensor: sensorFactory,
    measurement: measurementFactory,
  },
  access: {
    admin: buildMethods(userFactory(undefined, 'admin')),
    user: buildMethods(userFactory(undefined, 'user')),
  },
};
