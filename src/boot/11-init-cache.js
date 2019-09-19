module.exports = async function initCache(app) {
  try {
    const devices = await app.models.Device.syncCache('DOWN');
    const clients = await app.models.Client.deleteAll();
    // todo keep schedulers cache and find timers
    const schedulers = await app.models.Scheduler.deleteAll();
    //  await app.models.Device.updateAll({ 'clients.length': {gt : 0}  }, { clients: [] });
    return { devices, clients, schedulers };
  } catch (error) {
    throw error;
  }
};
