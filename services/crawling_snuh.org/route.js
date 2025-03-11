
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_snuh.org/controller`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const TS = require(`${global.appRoot}/server/middleware/message.handler`);
const AUTH = require(`${global.appRoot}/server/middleware/auth.handler`);
const uploadProfileImage = require(`${global.appRoot}/server/middleware/s3.handler`);
const express = require('express');
const asyncify = require('express-asyncify');
const moment = require('moment-timezone');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const _ = require('lodash');
const router = asyncify(express.Router());
module.exports = router;


router.get('/healthcheck', async function(req, res) {    
  const result = true;
  if ( result ) { 
    res.send({
      'code': 200,
      'message': '서울대학교병원 접속테스트',
      'desc': 'success',
      'data' : null 
    });
  }else{
    res.send({
      'code': 200,
      'message': '서울대학교병원 접속테스트',
      'desc': 'failed',
      'data' : result
    });
  }
});

/**
 * @swagger
 *  /v1/c/snuh.org/healthcheck:
 *    get:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [snuh.org-서울대학교병원]
 *      responses:
 *        "200":
 *          description: 접속 테스트
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    users:
 *                      type: object
 *                      example:    
 *                            { "code": 1000, "message": "접속성공" }
 */



router.post('/step01', async (req, res, next) => {
  const ip = req.clientIp;

  const data = [];
  const P1 = await crawlingCtrl.crwalingProcess01();
  console.log(`P1 links count : ${_.size(P1.data)}`)


  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000);
    const SP1 = await crawlingCtrl.crwalingProcess02(P1.data[i]);
    console.log(`Iteration ${P1.data[i]}: Paging size ${SP1.data}`);

    const pageIndex = SP1.data

    if (pageIndex) {
      for (let ii = 0; ii < pageIndex; ii++) {
        await CS.wait(300);
        console.log(`crwalingProcess03 >> ${P1.data[i]}, ${ii + 1} Page`)
        const SP2 = await crawlingCtrl.crwalingProcess03(P1.data[i], ii + 1);
        console.log(`doctor item count : ${_.size(SP2.data)}`)
        await CS.wait(10000);
        for (let iii = 0; iii < _.size(SP2.data); iii++) {
          await CS.wait(300);
          const SP3 = await crawlingCtrl.get_rid_encrypt(SP2.data[iii].doctorName, SP2.data[iii].url);
          console.log(`loop ${[ii]}-${[iii]}: ${SP2.data[iii].deptName} : ${SP2.data[iii].doctorName}`)
          if (SP3.error) {
            console.log("SP3 DB fail.");
            return res.json(TS.fail("SP3 DB fail."));
          }
          const tempRid = SP3.data[0].rid_encrypt
          await CS.wait(300);
          const SP4 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, 'H01KR-11000006', SP2.data[iii].deptName, SP2.data[iii].doctorName, SP2.data[iii].url);
          if (SP4.error) console.log("SP4 DB upsert fail.");
        }
      }
    }
  }
  let result = P1.data
  return res.json(TS.success(result));
});


/**
 * @swagger
 *  /v1/c/snuh.org/step01:
 *    post:
 *      summary: "1단계  조회"
 *      description: "서울대학교병원 정보를 가져와야 한다  "
 *      tags: [snuh.org-서울대학교병원]
 *      produces:
 *      parameters:
 *        - name: "clientIp"
 *          in: "query"
 *          description: "input clientIp"
 *          required: true
 *          type: "string"
 
 *      responses:
 *        "200":
 *          description: step01
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    users:
 *                      type: object
 *                      example:    
 *                            { "code": 1000, "message": "접속성공" }
 * 
 */


router.post('/step02', async (req, res, next) => {
  const ip = req.clientIp;


  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000006');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)
  const loopSize = _.size(P1.data);

  for (let i = 0; i < loopSize; i++) {
    await CS.wait(10000);
    const SP1 = await crawlingCtrl.crwalingProcess04(P1.data[i].url);
    const doctorname = SP1.data.doctorName ? SP1.data.doctorName : null
    const refUrl = P1.data[i].url ? P1.data[i].url : null
    if (doctorname && refUrl) {

      await CS.wait(300);
      const SP2 = await crawlingCtrl.get_rid_encrypt(doctorname, refUrl);
      if (SP2.error) {
        console.log("SP2 DB fail.");
        return res.json(TS.fail("SP2 DB fail."));
      }
      const tempRid = SP2.data[0].rid_encrypt
      if (CS.isEmpty(tempRid)) break;


      await CS.wait(300);
      const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000006', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }
      await CS.wait(300);
      const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000006', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
      if (SP4.error) {
        console.log("SP4 DB fail.");
        return res.json(TS.fail("SP4 DB fail."));
      }


    }



  }
  let result = P1.data
  return res.json(TS.success(result));
});


/**
 * @swagger
 *  /v1/c/snuh.org/step02:
 *    post:
 *      summary: "2단계  조회"
 *      description: "서울대학교병원 정보를 가져와야 한다  "
 *      tags: [snuh.org-서울대학교병원]
 *      produces:
 *      parameters:
 *        - name: "clientIp"
 *          in: "query"
 *          description: "input clientIp"
 *          required: true
 *          type: "string"
 
 *      responses:
 *        "200":
 *          description: step02
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    users:
 *                      type: object
 *                      example:    
 *                            { "code": 1000, "message": "접속성공" }
 * 
 */


router.post('/hospital/step03', async (req, res, next) => {
  const ip = req.clientIp;


  const P1 = await crawlingCtrl.get_crawling_doctor_mssing_link('H01KR-11000006');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000);
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].url);

    const doctorname = SP1.data.doctorName ? SP1.data.doctorName : null
    const refUrl = P1.data[i].url ? P1.data[i].url : null
    if (!doctorname || !refUrl) {
      break;
    }
    await CS.wait(300);
    const SP2 = await crawlingCtrl.get_rid_encrypt(doctorname, refUrl);
    if (SP2.error) {
      console.log("SP2 DB fail.");
      return res.json(TS.fail("SP2 DB fail."));
    }
    const tempRid = SP2.data[0].rid_encrypt
    if (CS.isEmpty(tempRid)) break;
    await CS.wait(300);
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000006', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(300);
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000006', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }
  }

  let result = P1.data
  return res.json(TS.success(result));
});



/**
 * @swagger
 *  /v1/c/snuh.org/hospital/step03:
 *    post:
 *      summary: "3단계 병원 조회"
 *      description: "서울대학교병원 정보를 가져와야 한다  "
 *      tags: [snuh.org-서울대학교병원]
 *      produces:
 *      parameters:
 *        - name: "clientIp"
 *          in: "query"
 *          description: "input clientIp"
 *          required: true
 *          type: "string"
 
 *      responses:
 *        "200":
 *          description: hospital step03
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    users:
 *                      type: object
 *                      example:    
 *                            { "code": 1000, "message": "접속성공" }
 * 
 */


router.get('/info', AUTH.validation, async (req, res, next) => {
  const ip = req.clientIp;
  return res.json(TS.success(req.auth));
});


/**
 * @swagger
 *  /v1/c/snuh.org/info:
 *    get:
 *      summary: "정보 조회(사용안하는 거 같음)"
 *      description: "서울대학교병원 정보를 가져와야 한다  "
 *      tags: [snuh.org-서울대학교병원]
 *      responses:
 *        "200":
 *          description: info
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    users:
 *                      type: object
 *                      example:    
 *                            { "code": 1000, "message": "접속성공" }
 * 
 */
