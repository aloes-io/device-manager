/* Copyright 2020 Edouard Maleix, read LICENSE */

/**
 * Oma Object References.
 * @external OmaObjects
 * @see {@link https://aloes.io/app/api/omaObjects}
 */

/**
 * @module OmaObject
 * @property {String} id  OmaObject ID
 * @property {String} name OmaObject name
 * @property {String} description Define OmaObject purpose.
 * @property {string} resourceIds OmaResource references contained in this OmaObjectId
 * @property {object} resources OmaResource default key : value object
 */
module.exports = function (OmaObject) {
  OmaObject.disableRemoteMethodByName('create');
  OmaObject.disableRemoteMethodByName('upsert');
  OmaObject.disableRemoteMethodByName('deleteById');
  OmaObject.disableRemoteMethodByName('replaceOrCreate');
  OmaObject.disableRemoteMethodByName('update');
  OmaObject.disableRemoteMethodByName('upsertWithWhere');
  OmaObject.disableRemoteMethodByName('replaceById');
  OmaObject.disableRemoteMethodByName('updateById');
  OmaObject.disableRemoteMethodByName('updateAll');
  OmaObject.disableRemoteMethodByName('prototype.updateAttributes');
  OmaObject.disableRemoteMethodByName('prototype.patchAttributes');
  OmaObject.disableRemoteMethodByName('prototype.replace');
  OmaObject.disableRemoteMethodByName('createChangeStream');
};
