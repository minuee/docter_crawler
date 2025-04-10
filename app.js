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
const CS = require(`${global.appRoot}/server/util/util.casting`);

const requestIp = require('request-ip');
const basicAuth = require('express-basic-auth');

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

      const options = {
        //customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: "Korea Medicare Crawler API",
      };

        this.app.use('/api-docs', basicAuth({
            challenge: true,
            users: {
                [process.env.SWAGGER_USER] : process.env.SWAGGER_PASSWORD
            },
          }),swaggerUi.serve, swaggerUi.setup(specs, options, { docExpansion: 'none' }));
    }

    getRouting() {

      /* this.app.get('/', (res, req) => {
      req.sendFile(path.join(__dirname, '/public/index.html'));
      }) */
      //this.app.use(require("./route/index"));

      this.app.use('/logout', (req, res) => {
          res.status(401).send('Logged out')
        });

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

      /* 경기서북부부권 */
      this.app.use('/v1/c/cmcism.or.kr', require(`${global.appRoot}/services/crawling_cmcism.or.kr/route`)); //카톨릭대 인천 성모병원
      this.app.use('/v1/c/schmc.ac.kr', require(`${global.appRoot}/services/crawling_schmc.ac.kr/route`)); //순천향대학교부속부천병원
      this.app.use('/v1/c/gilhospital.com', require(`${global.appRoot}/services/crawling_gilhospital.com/route`)); //가천대길병원
      this.app.use('/v1/c/inha.com', require(`${global.appRoot}/services/crawling_inha.com/route`)); //인하대부속병원
      this.app.use('/v1/c/cmcvincent.or.kr', require(`${global.appRoot}/services/crawling_cmcvincent.or.kr/route`)); //카톨릭대 성빈센트병원
      this.app.use('/v1/c/ansan.kumc.or.kr', require(`${global.appRoot}/services/crawling_ansan.kumc.or.kr/route`)); //고려대학교 안산병원
      this.app.use('/v1/c/snubh.org', require(`${global.appRoot}/services/crawling_snubh.org/route`)); // 분당서울대병원
      this.app.use('/v1/c/hosp.ajoumc.or.kr', require(`${global.appRoot}/services/crawling_hosp.ajoumc.or.kr/route`)); // 아주대학교병원
      this.app.use('/v1/c/hallym.or.kr', require(`${global.appRoot}/services/crawling_hallym.or.kr/route`)); // 한림대학교

      /* 경상, 울산, 부산권 */
      this.app.use('/v1/c/knuh.kr', require(`${global.appRoot}/services/crawling_knuh.kr/route`)); //경북대학교병원 
      this.app.use('/v1/c/dongsan.dsmc.or.kr', require(`${global.appRoot}/services/crawling_dongsan.dsmc.or.kr/route`)); //경북대학교병원
      this.app.use('/v1/c/dcmc.co.kr', require(`${global.appRoot}/services/crawling_dcmc.co.kr/route`)); //대구카톨릭대병원 
      this.app.use('/v1/c/yumc.ac.kr', require(`${global.appRoot}/services/crawling_yumc.ac.kr/route`)); //영남대학교병원
      this.app.use('/v1/c/knuch.kr', require(`${global.appRoot}/services/crawling_knuch.kr/route`)); //칠곡경북대학교병원 
      this.app.use('/v1/c/kosinmed.or.kr', require(`${global.appRoot}/services/crawling_kosinmed.or.kr/route`)); //고신대학교복음병원 
      this.app.use('/v1/c/gnuh.co.kr', require(`${global.appRoot}/services/crawling_gnuh.co.kr/route`)); //경상국립대학교병원 
      this.app.use('/v1/c/smc.skku.edu', require(`${global.appRoot}/services/crawling_smc.skku.edu/route`)); //성균관대 삼성창원병원 
      this.app.use('/v1/c/damc.or.kr', require(`${global.appRoot}/services/crawling_damc.or.kr/route`)); //동아대학교병원  - 논문정보 없음
      this.app.use('/v1/c/pnuh.or.kr', require(`${global.appRoot}/services/crawling_pnuh.or.kr/route`)); //부산대학교병원 
      this.app.use('/v1/c/paik.ac.kr', require(`${global.appRoot}/services/crawling_paik.ac.kr/route`)); //인제대부산백병원 
      this.app.use('/v1/c/uuh.ulsan.kr', require(`${global.appRoot}/services/crawling_uuh.ulsan.kr/route`)); //울산대학교병원


      /* 기타 작업 */
      this.app.use('/v1/c/crawling_check', require(`${global.appRoot}/services/crawling_check/route`)); // 검증
      this.app.use('/v1/c/pubmed_crawling', require(`${global.appRoot}/services/crawling_pubmed/route`)); // 논문 수집  

    }   

    getRouting_old() {

      /* this.app.get('/', (res, req) => {
      req.sendFile(path.join(__dirname, '/public/index.html'));
      }) */
      //this.app.use(require("./route/index"));

      this.app.use('/logout', (req, res) => {
          res.status(401).send('Logged out')
        });

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
      this.app.use('/v1/c/cauhs.or.kr', require(`${global.appRoot}/services/crawling_cauhs.or.kr/route`));// 중앙대학교병원
      this.app.use('/v1/c/kuh.ac.kr', require(`${global.appRoot}/services/crawling_kuh.ac.kr/route`));// 건국대학교병원 - 일단보류
      this.app.use('/v1/c/med.khmc.or.kr', require(`${global.appRoot}/services/crawling_med.khmc.or.kr/route`));// 경희대학교병원
      this.app.use('/v1/c/open.go.kr', require(`${global.appRoot}/services/openAPI_data.go.kr/route`));
      this.app.use('/v1/c/amc.seoul.kr', require(`${global.appRoot}/services/crawling_amc.seoul.kr/route`)); //서울 아산병원 
      this.app.use('/v1/c/samsunghospital.com', require(`${global.appRoot}/services/crawling_samsunghospital.com/route`));//삼성서울병원
      this.app.use('/v1/c/severance.healthcare', require(`${global.appRoot}/services/crawling_severance.healthcare/route`));//연대 세브란스 병원
      this.app.use('/v1/c/snuh.org', require(`${global.appRoot}/services/crawling_snuh.org/route`));//서울대학교병원
      this.app.use('/v1/c/cmcseoul.or.kr', require(`${global.appRoot}/services/crawling_cmcseoul.or.kr/route`));//카톡릭대 서울성모병원
      this.app.use('/v1/c/kbsmc.co.kr', require(`${global.appRoot}/services/crawling_kbsmc.co.kr/route`));//강북 삼성병원
      this.app.use('/v1/c/anam.kumc.or.kr', require(`${global.appRoot}/services/crawling_anam.kumc.or.kr/route`));//고대 안암병원
      this.app.use('/v1/c/guro.kumc.or.kr', require(`${global.appRoot}/services/crawling_guro.kumc.or.kr/route`));//고대 구로병원
      this.app.use('/v1/c/seoul.eumc.ac.kr', require(`${global.appRoot}/services/crawling_seoul.eumc.ac.kr/route`));//이대서울병원
      this.app.use('/v1/c/mokdong.eumc.ac.kr', require(`${global.appRoot}/services/crawling_mokdong.eumc.ac.kr/route`));//이대 목동병원
      this.app.use('/v1/c/seoul.hyumc.com', require(`${global.appRoot}/services/crawling_seoul.hyumc.com/route`));//한양대학교뱡원
      this.app.use('/v1/c/gs.severance.healthcare', require(`${global.appRoot}/services/crawling_gs.severance.healthcare/route`));//연대 강남세브란스병원

      /* 인천 경기권 */
      this.app.use('/v1/c/cmcism.or.kr', require(`${global.appRoot}/services/crawling_cmcism.or.kr/route`)); //카톨릭대 인천 성모병원
      this.app.use('/v1/c/schmc.ac.kr', require(`${global.appRoot}/services/crawling_schmc.ac.kr/route`)); //순천향대학교부속부천병원
      this.app.use('/v1/c/gilhospital.com', require(`${global.appRoot}/services/crawling_gilhospital.com/route`)); //가천대길병원
      this.app.use('/v1/c/inha.com', require(`${global.appRoot}/services/crawling_inha.com/route`)); //인하대부속병원
      this.app.use('/v1/c/cmcvincent.or.kr', require(`${global.appRoot}/services/crawling_cmcvincent.or.kr/route`)); //카톨릭대 성빈센트병원
      this.app.use('/v1/c/ansan.kumc.or.kr', require(`${global.appRoot}/services/crawling_ansan.kumc.or.kr/route`)); //고려대학교 안산병원
      this.app.use('/v1/c/snubh.org', require(`${global.appRoot}/services/crawling_snubh.org/route`)); // 분당서울대병원
      this.app.use('/v1/c/hosp.ajoumc.or.kr', require(`${global.appRoot}/services/crawling_hosp.ajoumc.or.kr/route`)); // 아주대학교병원
      this.app.use('/v1/c/hallym.or.kr', require(`${global.appRoot}/services/crawling_hallym.or.kr/route`)); // 한림대학교

      /* 경상, 울산, 부산권 */
      this.app.use('/v1/c/knuh.kr', require(`${global.appRoot}/services/crawling_knuh.kr/route`)); //경북대학교병원


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