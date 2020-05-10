/* Copyright 2020 Edouard Maleix, read LICENSE */

/**
 * Oma Resources References.
 * @external OmaResources
 * @see {@link https://aloes.io/app/api/omaResources}
 */

/**
 * @module OmaResource
 * @property {String} id OmaResource ID
 * @property {String} name OmaResource name
 * @property {String} description Define OmaResource purpose.
 * @property {string} type value type ( string, integer, float, ...)
 * @property {string} [operations] authorized operation ( read, write )
 * @property {string} [unit] OmaResource unit ( meter, second, volt ... )
 * @property {array} [range] OmaResource value range
 */

module.exports = function (OmaResource) {
  OmaResource.disableRemoteMethodByName('create');
  OmaResource.disableRemoteMethodByName('upsert');
  OmaResource.disableRemoteMethodByName('deleteById');
  OmaResource.disableRemoteMethodByName('replaceOrCreate');
  OmaResource.disableRemoteMethodByName('update');
  OmaResource.disableRemoteMethodByName('upsertWithWhere');
  OmaResource.disableRemoteMethodByName('replaceById');
  OmaResource.disableRemoteMethodByName('updateById');
  OmaResource.disableRemoteMethodByName('updateAll');
  OmaResource.disableRemoteMethodByName('prototype.updateAttributes');
  OmaResource.disableRemoteMethodByName('prototype.patchAttributes');
  OmaResource.disableRemoteMethodByName('prototype.replace');
  OmaResource.disableRemoteMethodByName('createChangeStream');
};
