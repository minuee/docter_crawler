const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_guro.kumc.or.kr/controller`);
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
 *  /v1/c/guro.kumc.or.kr/healthcheck:
 *    post:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [guro.kumc.or.kr-고려대구로병원]
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

  const HOSPITAL_ID = 'H01KR-11000007';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  return res.send({
    'code': 200,
    'message': '고려대구로병원 접속테스트',
    'desc': 'success',
    'data' : req.body?.hid ? req.body.hid : null   
  });
    
});


/**
 * @swagger
 *  /v1/c/guro.kumc.or.kr/step01:
 *    post:
 *      summary: "1단계  조회"
 *      description: "강북삼성병원 정보를 가져와야 한다  "
 *      tags: [guro.kumc.or.kr-고려대구로병원]
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
  const HOSPITAL_ID = 'H01KR-11000007';
  const HOSPITAL_NAME = '고려대구로병원';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }
  // validation parameter
  let procCount = 0
  const data = [];
  const SP1 = await crawlingCtrl.crwalingProcess01()
  if (SP1) {
    console.log(`SP1.data`, SP1.data)
  }
  const loopingData = SP1.data
  let doctorCount = 0;
  for (let index = 0; index < _.size(loopingData); index++) {
    await CS.wait(4000);
    const element = loopingData[index];
    procCount = procCount + 1
    if (element.link) {
      const SP2 = await crawlingCtrl.crwalingProcess02(element.link)
      if (SP2.data) {
        console.log(`SP2.data >> `, SP2.data)
        for (let index2 = 0; index2 < _.size(SP2.data); index2++) {
          const element2 = SP2.data[index2];
          console.log(`doctorName : ${element2.doctorName}, deptName : ${element2.deptName}`)
          // rid 만들기
          await CS.wait(300);
          if ( element2.doctorName !== '일반의'  && element2.doctorName == '최윤선' && element2.deptName == '가정의학과'  ) {
             const SP3 = await crawlingCtrl.get_rid_encrypt(element2.doctorName, element2.link);
            if (SP3.error) {
              console.log("SP3 DB fail.");
              return res.json(TS.fail("SP3 DB fail."));
            }
            const tempRid = SP3.data[0].rid_encrypt;
            if(tempRid){
              doctorCount++;
              await CS.wait(300);
              const SP4 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, HOSPITAL_ID, element2.deptName, element2.doctorName, element2.link,element2.profileUrl, HOSPITAL_NAME )
              if(SP4.data){
                console.log(`입력완료`)
              }else{
                console.log(`입력실패`)
              }
            }else{
              console.log(`tempRid`, `가 없습니다.`)
            }
          }
        }
      }
    }
  }

  crawlingCtrl.closeBrowser();

  let result = procCount
  return res.json(TS.success({deptCount: result, doctorCount}));
});



/**
 * @swagger
 *  /v1/c/guro.kumc.or.kr/step02:
 *    post:
 *      summary: "2단계  조회"
 *      description: "강북삼성병원 정보를 가져와야 한다  "
 *      tags: [guro.kumc.or.kr-고려대구로병원]
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
  const HOSPITAL_ID = 'H01KR-11000007';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }
  const P1 = await crawlingCtrl.getCrawlingDoctorLink(HOSPITAL_ID);
  let totalCount = 0
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  console.log(`loopSize: `, loopSize)

  if( loopSize > 0 ) {
    crawlingCtrl.openBrowser();
  }

  for (let i = 0; i < loopSize; i++) {
    const item = P1.data[i]
    // rid, hid, deptname, doctorname, createdate, accessdate, count, isuse, url
    await CS.wait(4000);
    const SP1 = await crawlingCtrl.crwalingProcess03(item.doctor_url);
    const doctorName = P1.data[i].doctorname;
    const deptName = P1.data[i].deptname;
    const refUrl = P1.data[i].doctor_url;
    const profileimgurl = P1.data[i].profileimgurl;
    if (doctorName && refUrl) {
      console.log(`here`)
      totalCount = totalCount + 1

      /* await CS.wait(300);
      const SP2 = await crawlingCtrl.get_rid_encrypt(doctorName, refUrl);
      if (SP2.error) {
        console.log("SP2 DB fail.");
        return res.json(TS.fail("SP2 DB fail."));
      }
  
      const tempRid = SP2.data[0].rid_encrypt
      await CS.wait(300);
      const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, HOSPITAL_ID, deptName, doctorName, SP1.data.basic.specialty, SP1.data.basic.profileImgUrl);
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
            doctorName: doctorname,
            authorName: null,
            subjectClassification: null,
            publicationLocation:null
          }
          await CS.wait(300);
          const SP5 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
          if (SP5.error) {
            console.log(`SP5 DB fail.`);
            console.log(`Error on ${doctorname}`)
          }
        }
      } */
    }
  }

  crawlingCtrl.closeBrowser();
  
  let result = totalCount
  return res.json(TS.success(result));
});


