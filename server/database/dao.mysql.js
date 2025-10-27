const config = require('../config/configuration.js');
const mysql = require('mysql2/promise');
const moment = require('moment-timezone');
const poolPromise = mysql.createPool(config.database.mysql);

module.exports = {

  spCall: async (spName, ...info) => {
    let error=null, result, fields;
    let DBconn
    let DBError = null;
    const pool = poolPromise;
    //console.log(`process.env.MYSQL_HOST :${process.env.MYSQL_HOST}`)
    //console.log(`process.env.MYSQL_DATABASE :${process.env.MYSQL_DATABASE}`)
    //console.log(`process.env.MYSQL_USER :${process.env.MYSQL_USER}`)
    try {
        DBconn = await pool.getConnection();
        //console.log(`> Pool connection : ${DBconn}`);
        //console.log(`> LCL : ${moment.utc(new Date().toISOString()).tz("Asia/Seoul").format()}`);
        //console.time(`> Query ${spName} ${info} executetime : `); 
        try {
          [result,fields] = await DBconn.query(spName, info) || null;
          DBconn.release();
        } catch (err) {
          console.error(`> err on query ${spName}: ${err}`)
          error = {code: (err.code || 100), name: err.name, message: (err.message || `Unexpacted SP CALL`)}
          return {DBError: err, RS: result}
        }
    } catch (err) {
        console.dir(err);
        console.error(`> err on connection ${spName}: ${err}`)
        error = {code: (err.code || 100), name: err.name, message: (err.message || `Unexpacted DB Connection`)}
        DBconn.rollback(() => {
        })
    } finally {
        //console.timeEnd(`> Query ${spName} ${info} executetime : `);
        //console.log(`> Pool release`);
        return {DBError: error, RS: result}
    }
  }


}
