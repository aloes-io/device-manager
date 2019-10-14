module.exports = async function initCache(app) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
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
