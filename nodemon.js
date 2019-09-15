const nodemon = require('nodemon');
require('./dist/services/tunnel');
require('./dist/services/broker');

// if !process.env.ALOES_ID process.env.ALOES_ID = uuid
// if !process.env.ALOES_KEY process.env.ALOES_KEY = uuid

process.env.CLUSTER_MODE = false;

nodemon({
  script: './dist/index.js',
  ext: 'js json',
  watch: ['dist/*', '*.js', '.env'],
  ignore: ['src', 'dist/initial-data/*', 'deploy/', 'nodes_modules', 'public', 'docs'],
  // execMap: {
  //   //  js: './node_modules/@babel/node/bin/babel-node.js',
  //   js: '/home/ed/.nvm/versions/node/v10.10.0/bin/node',
  // },
});

nodemon
  .on('start', () => {
    console.log('App has started');
  })
  .on('quit', () => {
    console.log('App has quit');
    //   process.exit();
  })
  .on('restart', files => {
    console.log('App restarted due to: ', files);
  });
