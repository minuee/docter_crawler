const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_cauhs.or.kr/controller`);
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


/**
 * @swagger
 *  /v1/c/cauhs.or.kr/healthcheck:
 *    post:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [cauhs.or.kr-중앙대학교병원]
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

router.post('/healthcheck', async (req, res, next) => {

  const HOSPITAL_ID = 'H01KR-11000011';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  return res.send({
    'code': 200,
    'message': '중앙대학교병원 접속테스트',
    'desc': 'success',
    'data' : req.body?.hid ? req.body.hid : null   
  });
    
});


/**
 * @swagger
 *  /v1/c/cauhs.or.kr/step01:
 *    post:
 *      summary: "1단계  조회"
 *      description: "중앙대학교병원 정보를 가져와야 한다  "
 *      tags: [cauhs.or.kr-중앙대학교병원]
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


router.post('/step01', async (req, res, next) => {

  const HOSPITAL_ID = 'H01KR-11000011';
  const HOSPITAL_NAME = '중앙대학교병원';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }
  // validation parameter
  const data = [];
  const P1 = await crawlingCtrl.crwalingProcess01();
  console.log(_.size(P1.data))
  if (P1.error) return res.json(TS.fail(P1.error));
  if (CS.isEmpty(P1.data)) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(500);
    console.log(`loop ${i} link : ${P1.data[i].link}, deptName : ${P1.data[i].deptName}`);

    const SP1 = await crawlingCtrl.crwalingProcess02(P1.data[i].link);
   
    if (!CS.isEmpty(SP1.data)) {
      for (let j = 0; j < _.size(SP1.data); j++) {
        console.log(`doctorName : ${SP1.data[j].doctorName}, deptName : ${SP1.data[j].deptName}`)
        if ( SP1.data[j].doctorName == '김광준' && SP1.data[j].deptName == '산부인과' ) {
          data.push({
            hid: HOSPITAL_ID,
            deptName: SP1.data[j].deptName,
            doctorName: SP1.data[j].doctorName,
            url: SP1.data[j].url
          })
          await CS.wait(200);
          const SP0 = await crawlingCtrl.get_rid_encrypt(SP1.data[j].doctorName, SP1.data[j].url);
          if (SP0.error) {
            console.log("SP0 DB fail.");
            return res.json(TS.fail("SP0 DB fail."));
          }
          const tempRid = SP0.data[0].rid_encrypt


          const SP2 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, HOSPITAL_ID, SP1.data[j].deptName, SP1.data[j].doctorName, SP1.data[j].url, SP1.data[j].profileUrl,HOSPITAL_NAME);
          if (SP2.error) console.log("DB upsert fail.");
        }
      }
    } else {
      console.log(`loop ${i} result is null.`);
    }
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
 *  /v1/c/cauhs.or.kr/step02:
 *    post:
 *      summary: "2단계  조회"
 *      description: "중앙대학교병원 정보를 가져와야 한다  "
 *      tags: [cauhs.or.kr-중앙대학교병원]
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
  const HOSPITAL_ID = 'H01KR-11000011';
  const HOSPITAL_NAME = '중앙대학교병원';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  const P1 = await crawlingCtrl.getCrawlingDoctorLink(HOSPITAL_ID);
  let data = [];
  let totalCount = 0
  // https://www.kuh.ac.kr/doctor/basicInfo.do?dr_sid=20100170&dept_cd=000397
  // console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  console.log(`loopSize: `, loopSize)
  for (let i = 0; i < loopSize; i++) {
    const item = P1.data[i]
    // rid, hid, deptname, doctorname, createdate, accessdate, count, isuse, url
    await CS.wait(3000);
    const SP1 = await crawlingCtrl.crwalingProcess03(item.doctor_url);

    const doctorName = P1.data[i].doctorname;
    const deptName = P1.data[i].deptname;
    const refUrl = P1.data[i].doctor_url;
    const profileimgurl = P1.data[i].profileimgurl;
    if (doctorName && refUrl) {
      console.log(`here`)
      totalCount = totalCount + 1
      //  console.log(`SP1.data >>> `, SP1.data)

      await CS.wait(300);
      const SP2 = await crawlingCtrl.get_rid_encrypt(doctorName, refUrl);
      if (SP2.error) {
        console.log("SP2 DB fail.");
        return res.json(TS.fail("SP2 DB fail."));
      }
  
      const tempRid = SP2.data[0].rid_encrypt

      await CS.wait(300);
      const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid,HOSPITAL_ID, deptName, doctorName, SP1.data.basic.specialty, profileimgurl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }

      await CS.wait(300);
      const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, HOSPITAL_ID, doctorName, JSON.stringify(SP1.data.detail));
      if (SP4.error) {
        console.log("SP4 DB fail.");
        return res.json(TS.fail("SP4 DB fail."));
      }

      const treastise = SP1.data.treatise
      if(_.size(treastise) > 0){
        for (let index = 0; index < _.size(treastise); index++) {
          const element = treastise[index];
          const iD = {
            rid: tempRid,
            title: element.title,
            doi: element.doi,
            journalName: element.journalName,
            authorRule: element.authorRule,
            publicationDate: element.publicationDate,
            url: element.url,
            abstract: element.abstract,
            keywords: element.keywords,
            impactFactor: element.impactFactor,
            totalCitations: element.totalCitations,
            referencesThesis: element.referencesThesis,
            doctorName: doctorName,
            authorName: element.authorName,
            subjectClassification: element.subjectClassification,
            publicationLocation: element.publicationLocation
          }
          await CS.wait(300);
          const SP5 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
          if (SP5.error) {
            console.log(`SP5 DB fail.`);
            console.log(`Error on ${doctorName}`)
          }
        }
      }
      data.push({doctorName,deptName,refUrl})
    }
  }
  console.log(`대상 의사수 : ${_.size(P1.data)}, 작업된 의사수 : ${_.size(data)}`);
  return res.send({
    code : 200,
    success: true,
    message: `대상 의사수 : ${_.size(P1.data)}, 작업된 의사수 : ${_.size(data)}`
  });
});

