const nodemon = require('nodemon');

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
  // .on('quit', () => {
  //   console.log('App has quit');
  //   process.exit();
  // })
  .on('restart', files => {
    console.log('App restarted due to: ', files);
  });
