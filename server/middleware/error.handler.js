module.exports = errorHandler;
const CS = require('../util/util.casting');
function errorHandler(error, req, res, next) {
  switch (true) {
    case typeof error === 'string':
      const is404 = error.toLowerCase().endsWith('not found');
      const sCode = is404 ? 404 : 400;
      return res.status(sCode).json(
        (CS.isEmpty(error.message))? { code: !CS.isEmpty(error.code)? error.code : 'FAIL'} : { code: !CS.isEmpty(error.code)? error.code : 'FAIL', message: error.message}
      );

    case error.name === 'ValidationError':
      return res.status(400).json((CS.isEmpty(error.message))? { code: !CS.isEmpty(error.code)? error.code : 'FAIL'} : { code: !CS.isEmpty(error.code)? error.code : 'FAIL', message: error.message});
    case error.name === 'ReferenceError':
      return res.status(400).json((CS.isEmpty(error.message))? { code: !CS.isEmpty(error.code)? error.code : 'FAIL'} : { code: !CS.isEmpty(error.code)? error.code : 'FAIL', message: error.message});
    default:
      console.log(`> ERROR name: ${error.name} message: ${error.message}`)
      return res.status(500).json((CS.isEmpty(error.message))? { code: !CS.isEmpty(error.code)? error.code : 'FAIL'} : { code: !CS.isEmpty(error.code)? error.code : 'FAIL', message: error.message});
  }
}
