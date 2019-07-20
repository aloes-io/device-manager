module.exports = async function initCache(app) {
  try {
    const res = await app.models.Device.syncCache('DOWN');
    const clients = await app.models.Client.updateCache();
    //  await app.models.Device.updateAll({ 'clients.length': {gt : 0}  }, { clients: [] });
    return { devices: res, clients };
  } catch (error) {
    return error;
  }
};
