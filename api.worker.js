const dotenv = require('dotenv');
if (!process.env.NODE_ENV) {
  // console.log('> Can not be running without NODE_ENV');
  // process.exit(128);
  console.log('> run dotenv without NODE_ENV');
  dotenv.config();
}
const path = require('path');
global.appRoot = path.resolve(__dirname);
const express = require('express');
const HTTP = require('http');
const glob = require('glob');
const hpp = require('hpp');
const cors = require('cors');
const helmet = require('helmet');
const moment = require('moment-timezone');
const rateLimit = require('express-rate-limit');
const config = require(`${global.appRoot}/server/config/configuration`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const errorHandler = require(`${global.appRoot}/server/middleware/error.handler`);
const app = express();
const requestIp = require('request-ip');
app.use(requestIp.mw())
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])
app.set("etag", false);
app.use(express.urlencoded({limit: config.thisServer.contentsLimit, extended: false}));
app.use(express.json({limit: config.thisServer.contentsLimit}));
app.use(cors());
app.use(helmet());
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
// app.use(helmet.hsts()); //Strict-Transport-Security(nginx위임)
app.use(helmet.expectCt());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.contentSecurityPolicy(config.cspOption));
// app.use(hpp());
let isProcessSIGINT = false;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Methods","DELETE,PUT,POST,GET,OPTIONS");
  if (isProcessSIGINT) {
    res.set('Connection', 'close')
  }
  if (req.method.toLowerCase() == 'options'){
    res.sendStatus(200);
  }
  next();
});
const listeningServer = HTTP.createServer(app)
listeningServer.listen(config.thisServer.port, err => {
  if(err) throw err
  //process.env.NODE_ENV === 'development' ? console.log(process.env) : {}
  console.log(`> API Worker is running on : ${config.thisServer.port} `);
  console.log(`> UTC : ${moment.utc(new Date().toISOString()).format()}`);
  console.log(`> KST : ${moment.utc(new Date().toISOString()).tz("Asia/Seoul").format()}`);
  console.log(`> Worker setting is ${process.env.NODE_ENV} Mode`);



  if (process.send) {
    process.send('ready')
    console.log('> sent ready for PM2')
  }
});
app.use('/healthcheck', (req, res) => {
  return res.status(200).json({
    message: 'ok'
  })
});

app.use('/api/version', (req, res) => {
  return res.json({
    message: `${config.thisServer.apiVersion}`
  })
});


app.use('/v1/c/cauhs.or.kr', require(`${global.appRoot}/services/crawling_cauhs.or.kr/route`));// 중앙대병원
app.use('/v1/c/kuh.ac.kr', require(`${global.appRoot}/services/crawling_kuh.ac.kr/route`));// 건국대병원 - 일단보류
app.use('/v1/c/med.khmc.or.kr', require(`${global.appRoot}/services/crawling_med.khmc.or.kr/route`));// 경희대병원
app.use('/v1/c/open.go.kr', require(`${global.appRoot}/services/openAPI_data.go.kr/route`));
app.use('/v1/c/amc.seoul.kr', require(`${global.appRoot}/services/crawling_amc.seoul.kr/route`));
app.use('/v1/c/samsunghospital.com', require(`${global.appRoot}/services/crawling_samsunghospital.com/route`));
app.use('/v1/c/severance.healthcare', require(`${global.appRoot}/services/crawling_severance.healthcare/route`));
app.use('/v1/c/snuh.org', require(`${global.appRoot}/services/crawling_snuh.org/route`));
app.use('/v1/c/cmcseoul.or.kr', require(`${global.appRoot}/services/crawling_cmcseoul.or.kr/route`));
app.use('/v1/c/kbsmc.co.kr', require(`${global.appRoot}/services/crawling_kbsmc.co.kr/route`));
app.use('/v1/c/anam.kumc.or.kr', require(`${global.appRoot}/services/crawling_anam.kumc.or.kr/route`));
app.use('/v1/c/guro.kumc.or.kr', require(`${global.appRoot}/services/crawling_guro.kumc.or.kr/route`));
app.use('/v1/c/seoul.eumc.ac.kr', require(`${global.appRoot}/services/crawling_seoul.eumc.ac.kr/route`));
app.use('/v1/c/mokdong.eumc.ac.kr', require(`${global.appRoot}/services/crawling_mokdong.eumc.ac.kr/route`));
app.use('/v1/c/seoul.hyumc.com', require(`${global.appRoot}/services/crawling_seoul.hyumc.com/route`));
app.use('/v1/c/gs.severance.healthcare', require(`${global.appRoot}/services/crawling_gs.severance.healthcare/route`));

app.use('*', (req, res, next) => {
  const err = 'not found';
  next(err, req, res, next);
});
app.use(errorHandler);

