module.exports = {
  restApiRoot: `${process.env.REST_API_ROOT}`,
  // restApiRoot: `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`,
  // restApiHost: 'localhost',
  host: process.env.HTTP_SERVER_HOST,
  port: Number(process.env.HTTP_SERVER_PORT),
  remoting: {
    rest: {
      handleErrors: false,
      normalizeHttpPath: false,
      xml: false,
    },
    json: {
      strict: true,
      limit: '10mb',
    },
    urlencoded: {
      extended: true,
      limit: '1mb',
    },
    cors: false,
    handleErrors: false,
  },
};
