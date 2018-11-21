const serializeInner = require('serialize-error');

const defaults = {
  blacklist: 'password|token'
};

const serialize = (obj, opts) => {
  const options = Object.assign({}, defaults, opts);
  // if obj is a buffer, return the length of the buffer instead of the contents:
  if (obj instanceof Buffer) {
    return {
      type: 'Buffer',
      length: obj.length
    }
  }
  //if obj is an error, turn it into a pretty object because Errors aren't json.stringifiable
  if (obj instanceof Error) {
    // prettyify wreck response errors here:
    if (obj.data && (obj.data.isResponseError || obj.data.res)) {
      const res = obj.data.res;
      const payload = res.payload;
      obj = {
        message: `Response Error: ${res.statusCode}  ${res.statusMessage}`,
        statusCode: res.statusCode,
      };
      // wreck won't include a payload if there was a json parse error:
      if (payload) {
        obj.payload = payload;
      }
      return obj;
    }
    // otherwise it's a normal error:
    return serializeInner(obj);
  }
  if (typeof obj === 'object') {
    // obscure any blacklisted tags:
    const blacklistRegEx = new RegExp(options.blacklist, 'i'); // blacklist is case insensitive
    Object.keys(obj).forEach(key => {
      if (key.match && key.match(blacklistRegEx) !== null) {
        obj[key] = 'xxxxxx';
      }
      if (obj[key] instanceof Error) {
        obj[key] = serialize(obj[key], options);
      }
    });
  }
  return obj;
};

module.exports = serialize;
