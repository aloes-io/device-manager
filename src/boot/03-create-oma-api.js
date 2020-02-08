/* Copyright 2019 Edouard Maleix, read LICENSE */

import { omaObjects, omaResources, omaViews, version } from 'oma-json';
import logger from '../services/logger';

export default async function createOmaApi(server) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    // update models based on package.json version for oma-json
    const foundOmaObjects = await server.models.OmaObject.find();
    if (foundOmaObjects.length === omaObjects.length) {
      if (foundOmaObjects[0].version && foundOmaObjects[0].version === version) {
        return null;
      }
    }

    await server.models.OmaObject.destroyAll();
    omaObjects.forEach(object => {
      object.id = object.value;
      object.version = version;
      return object;
    });
    const savedOmaObjects = await server.models.OmaObject.create(omaObjects);
    omaResources.forEach(resource => {
      resource.id = resource.value;
      resource.version = version;
      return resource;
    });

    await server.models.OmaResource.destroyAll();
    const savedOmaResources = await server.models.OmaResource.create(omaResources);
    omaViews.forEach(resource => {
      resource.id = resource.value;
      resource.version = version;
      return resource;
    });

    await server.models.OmaView.destroyAll();
    const savedOmaViews = await server.models.OmaView.create(omaViews);
    logger.publish(4, 'loopback', 'boot:createOmaApi:res', {
      savedOmaObjects,
      savedOmaResources,
      savedOmaViews,
    });

    return {
      omaObjects: savedOmaObjects,
      omaResources: savedOmaResources,
      omaViews: savedOmaViews,
    };
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:createOmaApi:err', error);
    throw error;
  }
}
