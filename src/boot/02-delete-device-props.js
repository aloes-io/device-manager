// import logger from '../services/logger';

// module.exports = async function deleteDeviceProps(app) {
//   try {
//     const Device = app.models.Device;

//     const deleteAddress = async instances => {
//       try {
//         const promises = await instances.map(async instance => instance.address.destroy());
//         const result = await Promise.all(promises);
//         return result;
//       } catch (error) {
//         return error;
//       }
//     };

//     const devices = await Device.find();
//     const result = await deleteAddress(devices);
//     logger.publish(4, 'loopback', 'boot:deleteDeviceProps:res', 'success');
//     return result;
//   } catch (error) {
//     logger.publish(2, 'loopback', 'boot:deleteDeviceProps:err', error);
//     return error;
//   }
// };
