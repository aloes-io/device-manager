module.exports = async function initCache(app) {
  try {
    const Device = app.models.Device;
    const res = await Device.syncCache('DOWN');
    //  console.log('result cache', res);
    return res;
  } catch (error) {
    return error;
  }
};
