const tap = require('tap');
const serialize = require('../');
const wreck = require('wreck');
const Hapi = require('hapi');

tap.test('handle errors', t => {
  try {
    const r = {};
    const math = r.does.not.exist; // eslint-disable-line
  } catch (e) {
    const message = serialize(e);
    t.match(message, {
      name: 'TypeError',
      message: 'Cannot read property \'not\' of undefined'
    });
    t.ok(message.stack);
  }
  t.end();
});

tap.test('handle wreck errors', async t => {
  const server = new Hapi.Server({ port: 8080 });
  await server.start();
  try {
    await wreck.get('http://localhost:8080/', {});
  } catch (e) {
    const message = serialize(e);
    t.match(message, {
      message: 'Response Error: 404  Not Found',
      statusCode: 404,
      payload: null
    });
  }
  await server.stop();
  t.end();
});

tap.test('can use the blacklist regex to filter out sensitive info', t => {
  const serialized = serialize({
    james: '1',
    spader: '2'
  }, {
    blacklist: 'spader',
  });
  t.match(serialized.james, '1');
  t.match(serialized.spader, 'xxxxxx');
  t.end();
});

tap.test('blacklist will not change the original message object', t => {
  const messageObject = {
    james: '1',
    spader: 'something secret',
    subPlot: {
      whodoneit: 'guesswho',
      spader: 'moar secrets'
    }
  };
  serialize(messageObject, {
    blacklist: 'spader'
  });
  t.equal(messageObject.spader, 'something secret');
  t.equal(messageObject.subPlot.spader, 'moar secrets');
  t.end();
});

tap.test('handle Buffer', t => {
  const message = serialize(Buffer.from('hi there', 'utf8'));
  t.match(message, {
    type: 'Buffer',
    length: 8
  });
  t.end();
});

tap.test('handle wreck json errors', async t => {
  const server = new Hapi.Server({ port: 8080 });
  server.route({
    path: '/',
    method: 'GET',
    handler(req, h) {
      return 'totally not json';
    }
  });
  await server.start();
  try {
    await wreck.get('http://localhost:8080/', {
      json: 'force'
    });
  } catch (e) {
    const message = serialize(e);
    t.match(message, {
      message: 'Response Error: 200  OK',
      statusCode: 200
    });
  }
  await server.stop();
  t.end();
});

tap.test('handle nested things', t => {
  const r = {
    err: new Error('some error'),
    buffer: Buffer.from('hi there', 'utf8'),
    names: {
      spader: '2'
    }
  };
  const message = serialize(r, { blacklist: 'spader' });
  t.match(message, {
    err: {
      name: 'Error',
      message: 'some error'
    },
    buffer: {
      type: 'Buffer',
      length: 8
    },
    names: {
      spader: 'xxxxxx'
    }
  });
  t.ok(r.err.stack);
  t.end();
});

tap.test('handle max levels', t => {
  const r = {
    err: new Error('some error'),
    names: {
      spader: '2'
    },
    one: {
      two: {
        three: {
          four: 'Too many',
          five: {
            messsage: 'all gone'
          }
        },
        threeB: 'Would still be here'
      }
    }
  };
  const message = serialize(r, { blacklist: 'spader' });
  t.match(message, {
    err: {
      name: 'Error',
      message: 'some error'
    },
    names: {
      spader: 'xxxxxx'
    },
    one: {
      two: {
        three: {
          four: 'Too many',
          five: '...'
        },
        threeB: 'Would still be here'
      }
    }
  });
  t.ok(r.err.stack);
  t.end();
});


tap.only('wont fail on null element', t => {
  const r = {
    err: new Error('some error'),
    buffer: Buffer.from('hi there', 'utf8'),
    names: {
      spader: '2',
      nothing: null
    }
  };
  const message = serialize(r, { blacklist: 'spader' });
  t.match(message, {
    err: {
      name: 'Error',
      message: 'some error'
    },
    buffer: {
      type: 'Buffer',
      length: 8
    },
    names: {
      spader: 'xxxxxx',
      nothing: null
    }
  });
  t.ok(r.err.stack);
  t.end();
});

tap.only('wont fail on numbers', t => {
  const r = {
    numbers: {
      one: 1,
      two: 2
    },
    names: {
      spader: '2',
      nothing: null
    }
  };
  const message = serialize(r, { blacklist: 'spader' });
  t.match(message, {
    numbers: {
      one: 1,
      two: 2
    },
    names: {
      spader: 'xxxxxx',
      nothing: null
    }
  });
  t.end();
});


tap.test('return strings without changing them', t => {
  const message = serialize('this is just a message', {});
  t.equal(message, 'this is just a message');
  t.end();
});
