const serializeInner = require('serialize-error');

const defaults = {
  blacklist: 'password|token',
  level: 3
};

// serialize error:
const serializeError = (obj, opts) => {
  // prettyify wreck response errors here:
  if (obj.data && (obj.data.isResponseError || obj.data.res)) {
    const res = obj.data.res;
    const payload = res.payload;
    const clonedObj = {
      message: `Response Error: ${res.statusCode}  ${res.statusMessage}`,
      statusCode: res.statusCode,
    };
    // wreck won't include a payload if there was a json parse error:
    if (payload) {
      clonedObj.payload = payload;
    }
    return clonedObj;
  }
  // otherwise it's a normal error:
  return serializeInner(obj);
};

const serialize = (originalObj, opts, level = 0) => {
  const options = Object.assign({}, defaults, opts);

  if (typeof originalObj === 'function') {
    return `Function ${originalObj.name}`;
  }

  if (originalObj === null || typeof originalObj !== 'object') {
    return originalObj;
  }

  if (level > options.level) {
    return '...';
  }
  //if obj is an error, turn it into a pretty object because Errors aren't json.stringifiable
  if (originalObj instanceof Error) {
    return serializeError(originalObj);
  }
  // if originalObj is a buffer, return the length of the buffer instead of the contents:
  if (originalObj instanceof Buffer) {
    return {
      type: 'Buffer',
      length: originalObj.length
    };
  }

  if (Array.isArray(originalObj)) {
    const serializedArray = originalObj.map(item => {
      const result = serialize(item, options, 1);
      return result;
    });

    return serializedArray;
  }
  // serialize-object does not modify the original object:
  const clonedObj = Object.assign({}, originalObj);
  if (typeof clonedObj === 'object') {
    // obscure any blacklisted tags:
    const blacklistRegEx = new RegExp(options.blacklist, 'i'); // blacklist is case insensitive
    Object.keys(clonedObj).forEach(key => {
      clonedObj[key] = serialize(clonedObj[key], opts, (level + 1));
      if (key.match && key.match(blacklistRegEx) !== null) {
        clonedObj[key] = 'xxxxxx';
      }
    });
  }
  return clonedObj;
};

module.exports = serialize;
