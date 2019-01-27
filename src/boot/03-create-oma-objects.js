import {ipsoObjects, ipsoResources} from "aloes-handlers";
import logger from "../logger";

export default async function createResources(server) {
  try {
    await server.models.OmaObject.destroyAll();
    ipsoObjects.forEach((object) => (object.id = object.value));
    const omaObjects = await server.models.OmaObject.create(ipsoObjects);
    //  console.log("createOmaObjects:res", omaObjects);
    ipsoResources.forEach((resource) => {
      resource.id = resource.value;
      return resource;
    });
    await server.models.OmaResource.destroyAll();
    const omaResources = await server.models.OmaResource.create(ipsoResources);
    //  console.log("createOmaResources:res", omaResources);
    return {omaObjects, omaResources};
  } catch (error) {
    console.log("createResources:err", error);
    return error;
  }
}
