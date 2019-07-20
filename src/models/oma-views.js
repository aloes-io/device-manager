/**
 * @module OmaViews
 * @property {String} id OmaObject ID
 * @property {String} name OmaObject name
 * @property {array} icons List of icons url to assign in widgets
 * @property {object} resources { [OmaViewssId] : "color" }
 */

module.exports = function(OmaViews) {
  //  const collectionName = 'OmaViews';

  OmaViews.disableRemoteMethodByName('create');
  OmaViews.disableRemoteMethodByName('upsert');
  OmaViews.disableRemoteMethodByName('deleteById');
  OmaViews.disableRemoteMethodByName('replaceOrCreate');
  OmaViews.disableRemoteMethodByName('update');
  OmaViews.disableRemoteMethodByName('upsertWithWhere');
  OmaViews.disableRemoteMethodByName('replaceById');
  OmaViews.disableRemoteMethodByName('updateById');
  OmaViews.disableRemoteMethodByName('updateAll');
  OmaViews.disableRemoteMethodByName('prototype.updateAttributes');
  OmaViews.disableRemoteMethodByName('prototype.patchAttributes');
  OmaViews.disableRemoteMethodByName('prototype.replace');
  OmaViews.disableRemoteMethodByName('createChangeStream');
};
