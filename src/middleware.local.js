// const domainsWhitelist = [
//   'http://localhost:8000',
//   /\.github\.com$/,
//   process.env.HTTP_SERVER_URL,
//   process.env.HTTP_CLIENT_URL,
// ];

module.exports = {
  initial: {
    compression: {},
    cors: {
      params: {
        //  origin: domainsWhitelist,
        origin: true,
        credentials: true,
        maxAge: 86400,
        //  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization'],
      },
    },
  },
  session: {},
  auth: {},
  // parse: {
  //   'body-parser#urlencoded': {
  //     params: {
  //       extended: true,
  //     },
  //   },
  //   'body-parser#json': {
  //     verify: (req, res, buf) => {
  //       req.rawBody = buf;
  //     },
  //   },
  // },
};
