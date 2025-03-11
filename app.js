const bodyParser = require("body-parser");
const dotenv = require('dotenv');

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

const requestIp = require('request-ip');


//swagger setuup
const { swaggerUi, specs } = require('./lib/swagger');

class App {
  constructor() {
    this.app = express();
    this.setViewEngine();
    this.setMiddleWare();
    this.setSwagger();
    this.setStatic();
    this.setLocals();
    this.getRouting();
    this.errorHandler();
  }

  setMiddleWare() {
    // HTTP -> HTTPS Redirection
    /* this.app.use((req, res, next) => {
      if (req.secure) {
        next();
      } else {
        const to = `https://${req.hostname}${req.url}`;
        res.redirect(to);
      }
    }); */

    if (!process.env.NODE_ENV) {
        // console.log('> Can not be running without NODE_ENV');
        // process.exit(128);
        console.log('> run dotenv without NODE_ENV');
        dotenv.config();
      }

    /* this.app.use(requestIp.mw())
    this.app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal'])
    this.app.set("etag", false);
    this.app.use(express.urlencoded({limit: config.thisServer.contentsLimit, extended: false}));
    this.app.use(express.json({limit: config.thisServer.contentsLimit}));
    this.app.use(cors()); */
    /* this.app.use(helmet());
    this.app.use(helmet.dnsPrefetchControl());
    this.app.use(helmet.frameguard());
    this.app.use(helmet.hidePoweredBy());
    this.app.use(helmet.ieNoOpen());
    this.app.use(helmet.noSniff());
    this.app.use(helmet.xssFilter());
    this.app.use(helmet.expectCt());
    this.app.use(helmet.permittedCrossDomainPolicies());
    this.app.use(helmet.contentSecurityPolicy(config.cspOption));
     */
    
    let isProcessSIGINT = false;
    this.app.use((req, res, next) => {
        res.header("Access-Control-Allow-Methods","DELETE,PUT,POST,GET,OPTIONS");
        if (isProcessSIGINT) {
            res.set('Connection', 'close')
        }
        if (req.method.toLowerCase() == 'options'){
            res.sendStatus(200);
        }
        next();
    });

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
  

    if (process.send) {
            process.send('ready')
            console.log('> sent ready for PM2')
        }
    }

    setViewEngine() {
        this.app.set("view engine", "ejs");
        this.app.set("views", __dirname + "/public");
        this.app.engine("html", require("ejs").renderFile);
    }

    setStatic() {
        this.app.use("/public", express.static(__dirname + "/public"));
    }

    setLocals() {
        this.app.use((req, res, next) => {
        this.app.locals.isLogin = true;
        next();
        });
    }

    setSwagger() {
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    }

    getRouting() {

        /* this.app.get('/', (res, req) => {
        req.sendFile(path.join(__dirname, '/public/index.html'));
        }) */
        //this.app.use(require("./route/index"));

        this.app.use('/healthcheck', (req, res) => {
            return res.status(200).json({
            message: 'ok'
            })
        });
        
        this.app.use('/api/version', (req, res) => {
            return res.json({
            message: `${config.thisServer.apiVersion}`
            })
        });

        this.app.use('/v1/c/localtest', require(`${global.appRoot}/services/local_test/route`));
        this.app.use('/v1/c/cauhs.or.kr', require(`${global.appRoot}/services/crawling_cauhs.or.kr/route`));// 중앙대병원
        this.app.use('/v1/c/kuh.ac.kr', require(`${global.appRoot}/services/crawling_kuh.ac.kr/route`));// 건국대병원 - 일단보류
        this.app.use('/v1/c/med.khmc.or.kr', require(`${global.appRoot}/services/crawling_med.khmc.or.kr/route`));// 경희대병원
        this.app.use('/v1/c/open.go.kr', require(`${global.appRoot}/services/openAPI_data.go.kr/route`));
        this.app.use('/v1/c/amc.seoul.kr', require(`${global.appRoot}/services/crawling_amc.seoul.kr/route`)); //서울 아산병원 
        this.app.use('/v1/c/samsunghospital.com', require(`${global.appRoot}/services/crawling_samsunghospital.com/route`));//삼성서울병원
        this.app.use('/v1/c/severance.healthcare', require(`${global.appRoot}/services/crawling_severance.healthcare/route`));//세브란스병원
        this.app.use('/v1/c/snuh.org', require(`${global.appRoot}/services/crawling_snuh.org/route`));//서울대학교병원
        this.app.use('/v1/c/cmcseoul.or.kr', require(`${global.appRoot}/services/crawling_cmcseoul.or.kr/route`));//서울시립대학교병원
        this.app.use('/v1/c/kbsmc.co.kr', require(`${global.appRoot}/services/crawling_kbsmc.co.kr/route`));//경북대학교병원
        this.app.use('/v1/c/anam.kumc.or.kr', require(`${global.appRoot}/services/crawling_anam.kumc.or.kr/route`));//안산대학교병원
        this.app.use('/v1/c/guro.kumc.or.kr', require(`${global.appRoot}/services/crawling_guro.kumc.or.kr/route`));//구로대학교병원
        this.app.use('/v1/c/seoul.eumc.ac.kr', require(`${global.appRoot}/services/crawling_seoul.eumc.ac.kr/route`));//서울대학교병원
        this.app.use('/v1/c/mokdong.eumc.ac.kr', require(`${global.appRoot}/services/crawling_mokdong.eumc.ac.kr/route`));//목동대학교병원
        this.app.use('/v1/c/seoul.hyumc.com', require(`${global.appRoot}/services/crawling_seoul.hyumc.com/route`));//서울혜우병원
        this.app.use('/v1/c/gs.severance.healthcare', require(`${global.appRoot}/services/crawling_gs.severance.healthcare/route`));//서울세브란스병원

    }

    errorHandler() {
        this.app.use((req, res, _) => {
        res.status(404).render("404.html");
        });

        this.app.use((err, req, res, _) => {
        res.status(500).render("500.html");
        });
    }
}

module.exports = new App().app;