const bodyParser = require("body-parser");
const dotenv = require('dotenv');

const path = require('path');
global.appRoot = path.resolve(__dirname);
const express = require('express');
const config = require(`${global.appRoot}/server/config/configuration`);

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
  
    if (!process.env.NODE_ENV) {
      console.log('> run dotenv without NODE_ENV');
      dotenv.config();
    }
    
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
      customSiteTitle: "Korea Medicare Crawler API",
    };

    this.app.use('/api-docs', basicAuth({
      challenge: true,
      users: { [process.env.SWAGGER_USER] : process.env.SWAGGER_PASSWORD },
    }),swaggerUi.serve, swaggerUi.setup(specs, options, { docExpansion: 'none' }));
  }

  getRouting() {

    this.app.use('/logout', (req, res) => {
      res.status(401).send('Logged out');
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

    /* 서울권 */ 
    this.app.use('/v1/c/kbsmc.co.kr', require(`${global.appRoot}/services/crawling_kbsmc.co.kr/route`)); //강북삼성병원
    this.app.use('/v1/c/kuh.ac.kr', require(`${global.appRoot}/services/crawling_kuh.ac.kr/route`)); //건국대학교병원
    this.app.use('/v1/c/med.khmc.or.kr', require(`${global.appRoot}/services/crawling_med.khmc.or.kr/route`)); //경희대학교병원
    this.app.use('/v1/c/guro.kumc.or.kr', require(`${global.appRoot}/services/crawling_guro.kumc.or.kr/route`)); //고려대구로병원 
    this.app.use('/v1/c/samsunghospital.com', require(`${global.appRoot}/services/crawling_samsunghospital.com/route`)); //삼성서울병원
    this.app.use('/v1/c/snuh.org', require(`${global.appRoot}/services/crawling_snuh.org/route`)); //서울대학교병원
    this.app.use('/v1/c/gs.severance.healthcare', require(`${global.appRoot}/services/crawling_gs.severance.healthcare/route`)); //연대강남세브란스병원
    this.app.use('/v1/c/severance.healthcare', require(`${global.appRoot}/services/crawling_severance.healthcare/route`)); //연대세브란스병원
    this.app.use('/v1/c/mokdong.eumc.ac.kr', require(`${global.appRoot}/services/crawling_mokdong.eumc.ac.kr/route`)); //이대목동병원
    this.app.use('/v1/c/amc.seoul.kr', require(`${global.appRoot}/services/crawling_amc.seoul.kr/route`)); //서울아산병원 
    this.app.use('/v1/c/cauhs.or.kr', require(`${global.appRoot}/services/crawling_cauhs.or.kr/route`)); //중앙대학교병원
    this.app.use('/v1/c/anam.kumc.or.kr', require(`${global.appRoot}/services/crawling_anam.kumc.or.kr/route`)); //고대안암병원
    this.app.use('/v1/c/cmcseoul.or.kr', require(`${global.appRoot}/services/crawling_cmcseoul.or.kr/route`)); //카톨릭대서울성모병원 
    this.app.use('/v1/c/seoul.hyumc.com', require(`${global.appRoot}/services/crawling_seoul.hyumc.com/route`)); //한양대학교병원

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
    this.app.use('/v1/c/dongsan.dsmc.or.kr', require(`${global.appRoot}/services/crawling_dongsan.dsmc.or.kr/route`)); //계명대학교동산병원
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
    this.app.use('/v1/c/pnuyh.or.kr', require(`${global.appRoot}/services/crawling_pnuyh.or.kr/route`)); //양산부산대학교병원 

    /* 충청, 강원, 전라권 */
    this.app.use('/v1/c/cbnuh.or.kr', require(`${global.appRoot}/services/crawling_cbnuh.or.kr/route`)); //충북대학교병원
    this.app.use('/v1/c/dkuh.co.kr', require(`${global.appRoot}/services/crawling_dkuh.co.kr/route`)); //단국대학교병원
    this.app.use('/v1/c/cnuh.co.kr', require(`${global.appRoot}/services/crawling_cnuh.co.kr/route`)); //충남대학교병원
    this.app.use('/v1/c/kyuh.ac.kr', require(`${global.appRoot}/services/crawling_kyuh.ac.kr/route`)); //건양대학교병원
    this.app.use('/v1/c/gnah.co.kr', require(`${global.appRoot}/services/crawling_gnah.co.kr/route`)); //강릉아산병원
    this.app.use('/v1/c/ywmc.or.kr', require(`${global.appRoot}/services/crawling_ywmc.or.kr/route`)); //연대원주 세브란스병원
    this.app.use('/v1/c/wkuh.org', require(`${global.appRoot}/services/crawling_wkuh.org/route`)); //원광대학교병원
    this.app.use('/v1/c/jbuh.co.kr', require(`${global.appRoot}/services/crawling_jbuh.co.kr/route`)); //전북대학교병원
    this.app.use('/v1/c/cnuh.com', require(`${global.appRoot}/services/crawling_cnuh.com/route`)); //전남대학교병원
    this.app.use('/v1/c/chosun.ac.kr', require(`${global.appRoot}/services/crawling_chosun.ac.kr/route`)); //조선대학교병원
    this.app.use('/v1/c/cnuhh.com', require(`${global.appRoot}/services/crawling_cnuhh.com/route`)); //화순전남대학교병원

    /* 기타 작업 */
    this.app.use('/v1/c/crawling_check', require(`${global.appRoot}/services/crawling_check/route`)); // 검증
    this.app.use('/v1/c/pubmed_crawling', require(`${global.appRoot}/services/crawling_pubmed/route`)); // 논문 수집  

    // this.app.use('/v1/c/pubmed_firstauthor', require(`${global.appRoot}/services/pubmed_firstauthor/route`)); // 제1저자 처 
    this.app.use('/v1/c/open.go.kr', require(`${global.appRoot}/services/openAPI_data.go.kr/route`)); // 공공데이터

    this.app.use('/v1/c/crawling_bedoc', require(`${global.appRoot}/services/crawling_bedoc/route`)); // 베닥병원 수집

    this.app.use('/v1/c/crawling_did_link', require(`${global.appRoot}/services/crawling_did_link/route`)); // 3차병원 DID 작업

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