const CS = require('../util/util.casting');
const _ = require("lodash");
module.exports = {
  success: (data) => {
      if(data) delete data.returnCode
      return { code: 'SUCCESS', data: data } 
  },
  fail: (error) => { 
    const EM = _.get(error, 'message', null)
    const EC = _.get(error, 'code', null)
    return { code: EC? EC : 'FAIL', message: EM? EM : null}
  }, 
}