const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_samsunghospital.com/controller`);
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
 *  /v1/c/samsunghospital.com/healthcheck:
 *    post:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [samsunghospital.com-삼성서울병원]
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

  const HOSPITAL_ID = 'H01KR-11000005';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  return res.send({
    'code': 200,
    'message': '삼성서울병원 접속테스트',
    'desc': 'success',
    'data' : req.body?.hid ? req.body.hid : null   
  });
    
});


/**
 * @swagger
 *  /v1/c/samsunghospital.com/step01:
 *    post:
 *      summary: "1단계  조회"
 *      description: "삼성서울병원 정보를 가져와야 한다  "
 *      tags: [samsunghospital.com-삼성서울병원]
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
  const HOSPITAL_ID = 'H01KR-11000005';
  const HOSPITAL_NAME = '삼성서울병원';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  const data = [];
  const P0 = await crawlingCtrl.setTimeStamp();
  let fakeTimestamp = P0.data
  console.log(fakeTimestamp);
  fakeTimestamp = (new Date(fakeTimestamp + 1)).getTime();
  console.log(fakeTimestamp);
  fakeTimestamp = (new Date(fakeTimestamp + 1)).getTime();
  console.log(fakeTimestamp);
  fakeTimestamp = (new Date(fakeTimestamp + 1)).getTime();
  console.log(fakeTimestamp);

  const P1 = await crawlingCtrl.crwalingProcess01(fakeTimestamp);
  console.log(`links count : ${_.size(P1.data)}`)



  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(5000);
    fakeTimestamp = (new Date(fakeTimestamp + 1)).getTime();
    const SP1 = await crawlingCtrl.crwalingProcess02(`http://www.samsunghospital.com/home/reservation/doctorInfoList.do?cPage=1&SW=&SUB_DEPT_YN=A&DP_CODE=${P1.data[i].value}&DP_TYPE=O&FLAG=Y&_=${fakeTimestamp}`);
    console.log(`http://www.samsunghospital.com/home/reservation/doctorInfoList.do?cPage=1&SW=&SUB_DEPT_YN=A&DP_CODE=${P1.data[i].value}&DP_TYPE=O&FLAG=Y&_=${fakeTimestamp}`);
    if (!CS.isEmpty(SP1.data)) {
      for (let j = 0; j < _.size(SP1.data); j++) {
        data.push({
          hid: HOSPITAL_ID,
          deptName: SP1.data[j].deptName,
          doctorName: SP1.data[j].doctorName,
          url: SP1.data[j].url
        })
        console.log(`doctorName : ${SP1.data[j].doctorName}, ,deptName : ${SP1.data[j].deptName},url : ${SP1.data[j].url},profileUrl : ${SP1.data[j].profileUrl}`)
        await CS.wait(300);
        if ( SP1.data[j].doctorName == '송윤미' && SP1.data[j].deptName == '가정의학과' ) {
          const SP2 = await crawlingCtrl.get_rid_encrypt(SP1.data[j].doctorName, SP1.data[j].url);
          if (SP2.error) {
            console.log("SP2 DB fail.");
            return res.json(TS.fail("SP2 DB fail."));
          }
          const tempRid = SP2.data[0].rid_encrypt
          await CS.wait(300);
          const SP3 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, HOSPITAL_ID, SP1.data[j].deptName, SP1.data[j].doctorName, SP1.data[j].url, SP1.data[j].profileUrl,HOSPITAL_NAME);
          if (SP3.error) console.log("SP3 DB upsert fail.");;
        }
      }
    }
  }
  let result = data
  return res.json(TS.success(result));
});


/**
 * @swagger
 *  /v1/c/samsunghospital.com/step02:
 *    post:
 *      summary: "2단계  조회"
 *      description: "삼성서울병원 정보를 가져와야 한다  "
 *      tags: [samsunghospital.com-삼성서울병원]
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
  const HOSPITAL_ID = 'H01KR-11000005';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }
  // db transaction
  const P1 = await crawlingCtrl.getCrawlingDoctorLink(HOSPITAL_ID);
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)
  const loopSize = _.size(P1.data);
  // const loopSize = 1;
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(10000);
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].doctor_url);
    const doctorName = P1.data[i].doctorname;
    const deptName = P1.data[i].deptname;
    const refUrl = P1.data[i].doctor_url;
    const profileimgurl = P1.data[i].profileimgurl;
    if (!doctorName || !refUrl) {
      break;
    }
    await CS.wait(300);
    /* const SP2 = await crawlingCtrl.get_rid_encrypt(doctorName, refUrl);
    if (SP2.error) {
      console.log("SP2 DB fail.");
      return res.json(TS.fail("SP2 DB fail."));
    }
    const tempRid = SP2.data[0].rid_encrypt
    if (CS.isEmpty(tempRid)) break;
    await CS.wait(300);
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, HOSPITAL_ID, deptName, doctorName, SP1.data.specialty, profileimgurl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(300);
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, HOSPITAL_ID, SP1.data.doctorName, JSON.stringify(SP1.data.biography));
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }

    if (_.size(SP1.data.treatise) > 0) {
      const resData = SP1.data.treatise
      console.log(`resData:${resData}`)
      for (let index = 0; index < _.size(resData); index++) {
        const element = resData[index];
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
          doctorName: SP1.data.doctorName,
          authorName: element.authorName,
          subjectClassification: element.subjectClassification,
          publicationLocation: element.publicationLocation
        }
        await CS.wait(300);
        const SP5 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
        if (SP5.error) {
          console.log(`SP5 DB fail.`);
          console.log(`Error on ${SP1.data.doctorName}`)
        }
      }

    } */
  }
  let result = P1.data
  return res.json(TS.success(result));
});

