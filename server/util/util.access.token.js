const config = require(`${global.appRoot}/server/config/configuration`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const jwt = require('jsonwebtoken');
const _ = require('lodash');

module.exports = {
  verify: async (accessToken) => {
    let result = null, error = null
    try {
      result = jwt.verify(accessToken, config.thisServer.jwtSecret, config.thisServer.jwtOption);
      // console.log(accessToken)
    } catch (err) {
      const jwtError = _.get(err, 'message', null)
      switch (jwtError) {
        case null:
          error = null
          break;
        case 'jwt expired':
          error = RM.ACCESS_TOKEN_EXPIRED
          break;
        case 'invalid token':
          error = RM.ACCESS_TOKEN_INVALID
          break;
        case 'invalid signature':
          error = RM.ACCESS_TOKEN_INVALID
          break;
        case 'invalid exp value':
          error = RM.ACCESS_TOKEN_INVALID
          break;
        case 'invalid nbf value':
          error = RM.ACCESS_TOKEN_INVALID
          break;
        default:
          error = RM.ACCESS_TOKEN_INVALID
          break;
      }
    } finally {
      // console.log(error)
      return { error: error, data: result };
    }
  }
}
