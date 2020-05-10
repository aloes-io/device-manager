const nodemon = require('nodemon');
require('../dist/services/tunnel');
require('../dist/services/broker');

// if (!process.env.ALOES_ID) process.env.ALOES_ID = uuid
// if (!process.env.ALOES_KEY) process.env.ALOES_KEY = uuid

nodemon({
  script: './dist/index.js',
  ext: 'js json',
  watch: ['dist/*', '*.js', '.env'],
  ignore: ['src', 'dist/initial-data/*', 'deploy/', 'nodes_modules', 'public', 'docs'],
});

nodemon
  .on('start', () => {
    console.log('App has started');
  })
  .on('quit', () => {
    console.log('App has quit');
  })
  .on('restart', (files) => {
    console.log('App restarted due to: ', files);
  });
