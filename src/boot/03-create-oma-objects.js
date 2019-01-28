import {omaObjects, omaResources, omaViews} from "aloes-handlers";
import logger from "../logger";

export default async function createResources(server) {
  try {
    const foundOmaObjects = await server.models.OmaObject.find();
    if (foundOmaObjects.length === omaObjects.length) {
      return null;
    }
    await server.models.OmaObject.destroyAll();
    omaObjects.forEach((object) => (object.id = object.value));
    const savedOmaObjects = await server.models.OmaObject.create(omaObjects);
    //  console.log("createOmaObjects:res", omaObjects);
    omaResources.forEach((resource) => {
      resource.id = resource.value;
      return resource;
    });
    await server.models.OmaResource.destroyAll();
    const savedOmaResources = await server.models.OmaResource.create(omaResources);
    //  console.log("createOmaResources:res", omaResources);
    omaViews.forEach((resource) => (resource.id = resource.value));
    await server.models.OmaView.destroyAll();
    const savedOmaViews = await server.models.OmaView.create(omaViews);

    return {savedOmaObjects, savedOmaResources, savedOmaViews};
  } catch (error) {
    console.log("createResources:err", error);
    return error;
  }
}
