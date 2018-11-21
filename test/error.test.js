const test = require('tap').test;
const serialize = require('../');
const wreck = require('wreck');
const Hapi = require('hapi');

test('handle errors', t => {
  try {
    const r = {};
    console.log(r.does.not.exist);
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

test('handle wreck errors', async t => {
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

test('can use the blacklist regex to filter out sensitive info', t => {
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

test('handle Buffer', t => {
  const message = serialize(Buffer.from('hi there', 'utf8'));
  t.match(message, {
    type: 'Buffer',
    length: 8
  });
  t.end();
});

test('handle wreck json errors', async t => {
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

test('handle nested things', t => {
  const r = {
    err: new Error('some error'),
    buffer: Buffer.from('hi there', 'utf8'),
    names: {
      spader: '2'
    }
  };
  const message = serialize(r, { blacklist: 'spader' } );
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
