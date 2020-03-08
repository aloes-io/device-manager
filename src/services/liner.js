/* eslint-disable no-underscore-dangle */
import stream from 'stream';

const liner = new stream.Transform({ objectMode: true });
// https://strongloop.com/strongblog/practical-examples-of-the-new-node-js-streams-api/
// example
// const source = fs.createReadStream('./access_log')
// source.pipe(liner)
// liner.on('readable', () => {
//      var line = ""
//      while (null !== (line = liner.read())) {
//           // do something with line
//      }
// })

liner._transform = function(chunk, encoding, done) {
  let data = chunk.toString();
  if (this._lastLineData) data = this._lastLineData + data;

  const lines = data.split('\n');
  this._lastLineData = lines.splice(lines.length - 1, 1)[0];

  lines.forEach(this.push.bind(this));
  done();
};

liner._flush = function(done) {
  if (this._lastLineData) this.push(this._lastLineData);
  this._lastLineData = null;
  done();
};

export default liner;
