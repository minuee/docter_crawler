const JWTaccessToken = require(`${global.appRoot}/server/util/util.access.token`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const TS = require(`${global.appRoot}/server/middleware/message.handler`);
const _ = require('lodash');

module.exports = {
  validation: async (req, res, next) => {
      const accessToken = req.headers['access_token'];
      // console.log(`accessToken: ${accessToken}`)
      if (!accessToken) return res.json(TS.fail(RM.ACCESS_TOKEN_EMPTY));
      const { error, data } = await JWTaccessToken.verify(accessToken);
      // console.log(`error: ${error}`)
      if(error) return res.json(TS.fail(error));
      const aid = _.get(data, 'aid', null)
      if(!aid) return res.json(TS.fail(RM.ACCESS_TOKEN_INVALID));
      req.auth = data
    next();
  }
}
