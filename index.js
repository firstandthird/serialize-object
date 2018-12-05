const serializeInner = require('serialize-error');

const defaults = {
  blacklist: 'password|token'
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

const serialize = (originalObj, opts, top=true) => {
  if (typeof originalObj === 'string') {
    return originalObj;
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
    }
  }
  // serialize-object does not modify the original object:
  const clonedObj = top ? Object.assign({}, originalObj) : originalObj;
  const options = Object.assign({}, defaults, opts);
  if (typeof clonedObj === 'object') {
    // obscure any blacklisted tags:
    const blacklistRegEx = new RegExp(options.blacklist, 'i'); // blacklist is case insensitive
    Object.keys(clonedObj).forEach(key => {
      clonedObj[key] = serialize(clonedObj[key], opts, false);
      if (key.match && key.match(blacklistRegEx) !== null) {
        clonedObj[key] = 'xxxxxx';
      }
    });
  }
  return clonedObj;
};

module.exports = serialize;
