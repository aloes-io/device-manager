/* Copyright 2019 Edouard Maleix, read LICENSE */

import { omaObjects, omaResources, omaViews } from 'oma-json';
import logger from '../services/logger';

export default async function createOmaApi(server) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    const foundOmaObjects = await server.models.OmaObject.find();
    // todo update models based on package.json version for oma-json
    if (foundOmaObjects.length === omaObjects.length) {
      return null;
    }
    await server.models.OmaObject.destroyAll();
    omaObjects.forEach(object => {
      object.id = object.value;
      return object;
    });
    const savedOmaObjects = await server.models.OmaObject.create(omaObjects);
    //  console.log("createOmaObjects:res", omaObjects);
    omaResources.forEach(resource => {
      resource.id = resource.value;
      return resource;
    });
    await server.models.OmaResource.destroyAll();
    const savedOmaResources = await server.models.OmaResource.create(omaResources);
    //  console.log("createOmaResources:res", omaResources);
    omaViews.forEach(resource => {
      resource.id = resource.value;
      return resource;
    });
    await server.models.OmaView.destroyAll();
    const savedOmaViews = await server.models.OmaView.create(omaViews);
    logger.publish(5, 'loopback', 'boot:createOmaApi:res', {
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
