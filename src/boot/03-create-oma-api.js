/* Copyright 2020 Edouard Maleix, read LICENSE */

import { omaObjects, omaResources, omaViews, version } from 'oma-json';
import logger from '../services/logger';
import utils from '../lib/utils';

export default async function createOmaApi(server) {
  if (!utils.isMasterProcess(process.env)) return;
  // update models based on package.json version for oma-json
  const foundOmaObjects = await server.models.OmaObject.find();
  if (
    foundOmaObjects.length === omaObjects.length &&
    foundOmaObjects[0].version &&
    foundOmaObjects[0].version === version
  ) {
    return;
  }

  await server.models.OmaObject.destroyAll();
  omaObjects.forEach(object => {
    object.id = object.value;
    object.version = version;
  });
  const savedOmaObjects = await server.models.OmaObject.create(omaObjects);
  omaResources.forEach(resource => {
    resource.id = resource.value;
    resource.version = version;
  });

  await server.models.OmaResource.destroyAll();
  const savedOmaResources = await server.models.OmaResource.create(omaResources);
  omaViews.forEach(resource => {
    resource.id = resource.value;
    resource.version = version;
  });

  await server.models.OmaView.destroyAll();
  const savedOmaViews = await server.models.OmaView.create(omaViews);
  logger.publish(4, 'loopback', 'boot:createOmaApi:res', {
    savedOmaObjects,
    savedOmaResources,
    savedOmaViews,
  });
}
