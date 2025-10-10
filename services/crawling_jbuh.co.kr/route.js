
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_jbuh.co.kr/controller`);
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
  const HOSPITAL_ID = 'H01KR-45000002';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  return res.send({
    'code': 200,
    'message': '전북대학교병원원 접속테스트',
    'desc': 'success',
    'data' : req.body?.hid ? req.body.hid : null   
  });
    
});

/**
 * @swagger
 *  /v1/c/jbuh.co.kr/healthcheck:
 *    post:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [jbuh.co.kr - 전북대학교병원원]
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


router.post('/step01', async function(req, res, next) {  

  const HOSPITAL_ID = 'H01KR-45000002';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  const data = [];
  const r_url = `https://www.jbuh.co.kr/cuh/main/sub03/sub01_1.jsp`;
  const SP1 = await crawlingCtrl.crwalingProcess01(r_url);
 
  if (SP1.error) return res.json(TS.fail(SP1.error));
  if (functions.isEmpty(SP1.data)) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }

  // _.size(P1.data);
  for (let i = 0; i < _.size(SP1.data); i++) {
    await CS.wait(500);
    console.log(`loop ${i} link : ${SP1.data[i].url}, deptName : ${SP1.data[i].deptName}`);
    /* if (!functions.isEmpty(SP1.data[i].doctorName)) {
      
      await CS.wait(200);
      const SP0 = await crawlingCtrl.get_rid_encrypt(SP1.data[i].doctorName, SP1.data[i].url);
      //console.log("SP0",SP0.data);
      if (SP0.error) {
        console.log("SP0 DB fail.");
        return res.json(TS.fail("SP0 DB fail."));
      }
      const tempRid = SP0.data[0].rid_encrypt;

      const SP2 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, HOSPITAL_ID, SP1.data[i].deptName, SP1.data[i].doctorName, SP1.data[i].url,SP1.data[i].profile_url);
      if (SP2.error) console.log("DB upsert fail.");;

      await CS.wait(300);
      const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, HOSPITAL_ID, SP1.data[i].deptName, SP1.data[i].doctorName, SP1.data[i].specialty,  SP1.data[i].profile_url);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }
      await CS.wait(300);

      const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, HOSPITAL_ID, SP1.data[i].doctorName, JSON.stringify(SP1.data[i].biography));
      if (SP4.error) {
        console.log("SP4 DB fail.");
        return res.json(TS.fail("SP4 DB fail."));
      }
      data.push({
        hid: HOSPITAL_ID,
        deptName: SP1.data[i].deptName,
        doctorName: SP1.data[i].doctorName,
        url: SP1.data[i].url,
        profile_url :  SP1.data[i].profile_url
      })
    } */
  }

  console.log(`검색된 진료과목수 : ${_.size(P1.data)}, 검색된 의사수 : ${_.size(data)}`);
  return res.send({
    code : 200,
    success: true,
    message: `검색된 진료과목수 : ${_.size(P1.data)}, 검색된 의사수 : ${_.size(data)}`
  });
});


/**
 * @swagger
 *  /v1/c/jbuh.co.kr/step01:
 *    post:
 *      summary: "1단계  조회"
 *      description: "전북대학교병원원 정보를 가져와야 한다  "
 *      tags: [jbuh.co.kr - 전북대학교병원원]
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



router.post('/treatise', async (req, res, next) => {

  const HOSPITAL_ID = 'H01KR-45000002';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  

  const data = [];
  const r_url = `https://www.jbuh.co.kr/cuh/main/sub03/sub01_1.jsp`;
  const SP1 = await crawlingCtrl.crwalingProcess01(r_url);
 
  if (SP1.error) return res.json(TS.fail(SP1.error));
  if (functions.isEmpty(SP1.data)) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }

  // _.size(P1.data);
  let article = 0;
  for (let i = 0; i < _.size(SP1.data); i++) {
    await CS.wait(500);
   
    if (!functions.isEmpty(SP1.data[i]?.doctorName)) {
      
      try{
        await CS.wait(200);
        const SP0 = await crawlingCtrl.get_rid_encrypt(SP1.data[i].doctorName, SP1.data[i].url);
        //console.log("SP0",SP0.data);
        if (SP0.error) {
          console.log("SP0 DB fail.");
          return res.json(TS.fail("SP0 DB fail."));
        }
        const tempRid = SP0.data[0].rid_encrypt;
        console.log("tempRid",tempRid, _.size(SP1.data[i].paper));
        
        if (_.size(SP1.data[i].paper) > 0) {
          await CS.wait(300);
          for (let index = 0; index < _.size(SP1.data[i].paper); index++) {
            const element = SP1.data[i].paper[index];
            const iD = {
              rid: tempRid,
              title: element.title,
              doi: null,
              journalName: functions.isEmpty(element.journalName) ? '' : element.journalName,
              authorRule: null,
              publicationDate: functions.isEmpty(element.publicationDate) ? '' : element.publicationDate,
              url: null,
              abstract: null,
              keywords: null,
              impactFactor: null,
              totalCitations: null,
              referencesThesis: null,
              doctorName: SP1.data[i].doctorName,
              authorName: null,
              subjectClassification: null,
              publicationLocation: null
            }
            const SP6 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
            if (SP6.error) {
              console.log(`SP6 DB fail.`);
              console.log(`Error on ${SP1.data[i].doctorName}`)
            }
            article++;
            data.push({
              hid: HOSPITAL_ID,
              deptName: SP1.data[i].deptName,
              doctorName: SP1.data[i].doctorName
            })
          }
        }
      } catch (error) {
        console.log(`Error on ${SP1.data[i].doctorName}`)
      }
    }
  }

  console.log(`대상 의사수 : ${_.size(P1.data)}, 작업된 의사수 : ${_.size(data)}`);
  return res.send({
    code : 200,
    success: true,
    message: `대상 의사수 : ${_.size(P1.data)}, 수집된 논문수 : ${article}`
  });

});


/**
 * @swagger
 *  /v1/c/jbuh.co.kr/treatise:
 *    post:
 *      summary: "논문 조회"
 *      description: "전북대학교병원원 정보를 가져와야 한다  "
 *      tags: [jbuh.co.kr - 전북대학교병원원]
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
 *                            { "code": 1000, "message": "작업성공" }
 * 
 */
