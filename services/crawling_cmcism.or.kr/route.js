
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_cmcism.or.kr/controller`);
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
const functions = require(`${global.appRoot}/server/util/function`);
const router = asyncify(express.Router());
module.exports = router;



router.post('/healthcheck', async function(req, res) {   
  
  console.log('req.body', typeof req.body);
  console.log('req.body22', req.body);

  const HOSPITAL_ID = req.body.hid;
  console.log('req.HOSPITAL_ID', HOSPITAL_ID);

    if ( HOSPITAL_ID !== "H01KR-41000001" ) { 
      res.send({
        code : 200,
        success: false,
        message: "잘못된 병원코드입니다. 정확한 코드를 입력해주세요!"
      });
    }else{
      res.send({
        'code': 200,
        'message': '인천성모병원 접속테스트',
        'desc': 'success',
        'data' : HOSPITAL_ID 
      });
    }
    
});

/**
 * @swagger
 *  /v1/c/cmcism.or.kr/healthcheck:
 *    post:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [cmcism.or.kr-인천성모병원]
 *      produces:
 *      parameters:
 *        - name: "hid"
 *          in: "body"
 *          description: "input hospitalId"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              hid:
 *                type: string
 *                description: "input hospitalId"
 * 
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


router.post('/step01', async function(req, res) {  

  const HOSPITAL_ID = req.body.hid;
  console.log('req.HOSPITAL_ID', HOSPITAL_ID);
  if ( functions.isEmpty(HOSPITAL_ID) ) { 
    res.send({
      code : 200,
      success: false,
      message: "병원코드를 입력해주세요!"
    });
  }

  if ( HOSPITAL_ID !== "H01KR-41000001" ) { 
    res.send({
      code : 200,
      success: false,
      message: "잘못된 병원코드입니다. 정확한 코드를 입력해주세요!"
    });
  }

  const data = [];
  const r_url = `https://www.cmcism.or.kr/treatment/treatment_list`;
  const P1 = await crawlingCtrl.crwalingProcess01(r_url);
  console.log("ddddd__Ddddx")
  /* if (P1.error) return res.json(TS.fail(P1.error));
  if (CS.isEmpty(P1.data)) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(500);
    const SP1 = await crawlingCtrl.crwalingProcess02(P1.data[i].link);
    if (!CS.isEmpty(SP1.data)) {
      for (let i = 0; i < _.size(SP1.data); i++) {
        data.push({
          hid: HOSPITAL_ID,
          deptName: SP1.data[i].deptName,
          doctorName: SP1.data[i].doctorName,
          url: SP1.data[i].url
        })
        await CS.wait(200);
        const SP0 = await crawlingCtrl.get_rid_encrypt(SP1.data[i].doctorName, SP1.data[i].url);
        if (SP0.error) {
          console.log("SP0 DB fail.");
          return res.json(TS.fail("SP0 DB fail."));
        }
        const tempRid = SP0.data[0].rid_encrypt


        const SP2 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, HOSPITAL_ID, SP1.data[i].deptName, SP1.data[i].doctorName, SP1.data[i].url);
        if (SP2.error) console.log("DB upsert fail.");;
      }
    } else {
      console.log(`loop ${i} result is null.`);
    }
  } */

  let result = null;//data
  return res.json(TS.success(result));
});


/**
 * @swagger
 *  /v1/c/cmcism.or.kr/step01:
 *    post:
 *      summary: "1단계  조회"
 *      description: "인천성모병원 정보를 가져와야 한다  "
 *      tags: [cmcism.or.kr-인천성모병원]
 *      produces:
 *      parameters:
 *        - name: "hid"
 *          in: "body"
 *          description: "input hospitalId"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              hid:
 *                type: string
 *                description: "input hospitalId"
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
 *                            { "code": 1000, "message": "작업성공" }
 * 
 */



router.post('/step02', async (req, res, next) => {
  const ip = req.clientIp;

  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000001');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].url);
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
      const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000001', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }
      await CS.wait(300);
      // console.log(SP1.data.biography)
      const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000001', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
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
 *  /v1/c/kbsmc.co.kr/step02:
 *    post:
 *      summary: "2단계  조회"
 *      description: "강북삼성병원 정보를 가져와야 한다  "
 *      tags: [kbsmc.co.kr-강북삼성병원]
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



router.post('/step03', async (req, res, next) => {
  const ip = req.clientIp;
  const P1 = await crawlingCtrl.get_crawling_doctor_mssing_link('H01KR-11000001');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
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
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000001', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(200);
    // console.log(SP1.data.biography)
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000001', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
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
 *  /v1/c/kbsmc.co.kr/step03:
 *    post:
 *      summary: "3단계  조회"
 *      description: "강북삼성병원 정보를 가져와야 한다  "
 *      tags: [kbsmc.co.kr-강북삼성병원]
 *      produces:
 *      parameters:
 *        - name: "clientIp"
 *          in: "query"
 *          description: "input clientIp"
 *          required: true
 *          type: "string"
 
 *      responses:
 *        "200":
 *          description: step03
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



router.post('/treatise', async (req, res, next) => {
  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000001');
  console.log(`total sie: ${_.size(P1.data)}`)
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  // const loopSize = 1;
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingtreatise(P1.data[i].url)
    if (_.size(SP1.data.biography) > 0) {
      await CS.wait(300);
      const tempRid = P1.data[i].rid
      if (CS.isEmpty(tempRid)) break;
      for (let index = 0; index < _.size(SP1.data.biography); index++) {
        const element = SP1.data.biography[index];
        const iD = {
          rid: tempRid,
          title: element.title,
          doi: null,
          journalName: null,
          authorRule: null,
          publicationDate: null,
          url: null,
          abstract: null,
          keywords: null,
          impactFactor: null,
          totalCitations: null,
          referencesThesis: null,
          doctorName: SP1.data.doctorName,
          authorName: null,
          subjectClassification: null,
          publicationLocation: null
        }
        const SP6 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
        if (SP6.error) {
          console.log(`SP6 DB fail.`);
          console.log(`Error on ${P1.data[i].doctorName}`)
        }
      }
    }
  }
  let result = null
  return res.json(TS.success(result));

});


/**
 * @swagger
 *  /v1/c/kbsmc.co.kr/treatise:
 *    post:
 *      summary: "논문 조회"
 *      description: "강북삼성병원 정보를 가져와야 한다  "
 *      tags: [kbsmc.co.kr-강북삼성병원]
 *      produces:
 *      parameters:
 *        - name: "clientIp"
 *          in: "query"
 *          description: "input clientIp"
 *          required: true
 *          type: "string"
 
 *      responses:
 *        "200":
 *          description: treatise
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
 *  /v1/c/kbsmc.co.kr/info:
 *    get:
 *      summary: "정보 조회(사용안하는 거 같음)"
 *      description: "강북삼성병원 정보를 가져와야 한다  "
 *      tags: [kbsmc.co.kr-강북삼성병원]
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
