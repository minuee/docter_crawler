const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_severance.healthcare/controller`);
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
 *  /v1/c/severance.healthcare/healthcheck:
 *    post:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [severance.healthcare-연대세브란스병원]
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

  const HOSPITAL_ID = 'H01KR-11000008';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  return res.send({
    'code': 200,
    'message': '연대세브란스병원 접속테스트',
    'desc': 'success',
    'data' : req.body?.hid ? req.body.hid : null   
  });
    
});


/**
 * @swagger
 *  /v1/c/severance.healthcare/step01:
 *    post:
 *      summary: "1단계  조회"
 *      description: "연대세브란스병원 정보를 가져와야 한다  "
 *      tags: [severance.healthcare-연대세브란스병원]
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
  
  const HOSPITAL_ID = 'H01KR-11000008';
  const HOSPITAL_NAME = '연대세브란스병원';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }
  const data = [];
  const P1 = await crawlingCtrl.crwalingProcess01();
  console.log(_.size(P1.data))
  if (P1.error) return res.json(TS.fail(P1.error));
  if (CS.isEmpty(P1.data)) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(5000);
    console.log(`loop ${i} link : ${P1.data[i].link}, deptName : ${P1.data[i].deptName}`);

    const SP1 = await crawlingCtrl.crwalingProcess02(P1.data[i].link);
   
    if (!CS.isEmpty(SP1.data)) {
      for (let j = 0; j < _.size(SP1.data); j++) {
        console.log(`doctorName : ${SP1.data[j].doctorName}, deptName : ${P1.data[i].deptName}, url : ${SP1.data[j].url}`)
        //if ( SP1.data[j].doctorName == '강희택' && P1.data[i].deptName == "가정의학과") {
          data.push({
            hid: HOSPITAL_ID,
            deptName: P1.data[i].deptName,
            doctorName: SP1.data[j].doctorName,
            url: SP1.data[j].url
          })
          await CS.wait(200);
          const SP0 = await crawlingCtrl.get_rid_encrypt(SP1.data[j].doctorName, SP1.data[j].url);
          if (SP0.error) {
            console.log("SP0 DB fail.");
            return res.json(TS.fail("SP0 DB fail."));
          }
          const tempRid = SP0.data[0].rid_encrypt;


          const SP2 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, HOSPITAL_ID, P1.data[i].deptName, SP1.data[j].doctorName, SP1.data[j].url, SP1.data[j].profileUrl,HOSPITAL_NAME);
          if (SP2.error) console.log("DB upsert fail.");
        //}
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
 *  /v1/c/severance.healthcare/step02:
 *    post:
 *      summary: "2단계  조회"
 *      description: "연대세브란스병원 정보를 가져와야 한다  "
 *      tags: [severance.healthcare-연대세브란스병원]
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
  const HOSPITAL_ID = 'H01KR-11000008';
  const HOSPITAL_NAME = '연대세브란스병원';
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
  const data = [];
  for (let i = 0; i < loopSize; i++) {
   
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].doctor_url);
    const doctorName = P1.data[i].doctorname;
    const deptName = P1.data[i].deptname;
    const refUrl = P1.data[i].doctor_url;
    const profileimgurl = P1.data[i].profileimgurl;
    if (!doctorName || !refUrl) {
      break;
    }
    await CS.wait(300);
    const SP2 = await crawlingCtrl.get_rid_encrypt(doctorName, refUrl);
    if (SP2.error) {
      console.log("SP2 DB fail.");
      return res.json(TS.fail("SP2 DB fail."));
    }
    const tempRid = SP2.data[0].rid_encrypt;
    if (CS.isEmpty(tempRid)) break;

    // DB upsert
    await CS.wait(300);
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, HOSPITAL_ID, deptName, doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(300);
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, HOSPITAL_ID, doctorName, JSON.stringify(SP1.data.biography));
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }
    data.push({doctorName,deptName,refUrl})
    await CS.wait(5000);
  }
  console.log(`대상 의사수 : ${_.size(P1.data)}, 작업된 의사수 : ${_.size(data)}`);
  return res.send({
    code : 200,
    success: true,
    message: `대상 의사수 : ${_.size(P1.data)}, 작업된 의사수 : ${_.size(data)}`
  });
});


/**
 * @swagger
 *  /v1/c/severance.healthcare/treatise:
 *    post:
 *      summary: "3단계  조회"
 *      description: "연대세브란스병원 정보를 가져와야 한다  "
 *      tags: [severance.healthcare-연대세브란스병원]
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
  const HOSPITAL_ID = 'H01KR-11000008';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }
  // db transaction
  const P1 = await crawlingCtrl.getCrawlingDoctorLink(HOSPITAL_ID);
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  let tempCount = 0

  for (let i = 0; i < loopSize; i++) {
    await CS.wait(1000);
    const SP1 = await crawlingCtrl.crwalingGetTreatiseLink(P1.data[i].doctor_url);
    if (SP1.data) {
      const tempRid = P1.data[i].rid;
      if (!CS.isEmpty(tempRid)) {
        await CS.wait(300);
        // delete old traetise
        console.log(`tempCount: ${tempCount} - treatiseUrl: ${SP1.data}`)
        const SP2 = await crawlingCtrl.getTreatiseLinkTotalCount(SP1.data);
        console.log(`SP2.data (total cnt)======================================,${SP2.data}`)
        let treatiseTotalcount = 0
        let treatiseTotalPage = 0
        let pageSize = 50
        let page = 1
        let offset = 0
        if (SP2.data) {
          treatiseTotalcount = SP2.data
          treatiseTotalPage = Math.ceil((treatiseTotalcount / pageSize))

          for (let index = 0; index < treatiseTotalPage; index++) {
            await CS.wait(1000);
            const tUrl = `${SP1.data}&type=1&page=${index + 1}&offset=${pageSize * (index)}`;
            const IP = await crawlingCtrl.getTreatiseDetail(tUrl);
            const TSize = _.size(IP.data)
            console.log(`TSize: ${TSize}`)
            if (TSize) {
              for (let index2 = 0; index2 < TSize; index2++) {
                const element = IP.data[index2];
                await CS.wait(2000);
                if (element) {
                  if (element.url) {
                    tempCount = tempCount + 1
                    const TS = await crawlingCtrl.setTreatiseDetail(element.url)
                    if (TS.error) {
                      console.log(`TS.error : ${TS.error}`)
                    } else {
                      const element = TS.data;
                      console.log(`TS.element : ${element}`)
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
                        doctorName: P1.data[i].doctorname,
                        authorName: element.authorName,
                        subjectClassification: element.subjectClassification,
                        publicationLocation: element.publicationLocation
                      }
                      await CS.wait(300);
                      const SP6 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
                      if (SP6.error) {
                        console.log(`SP6 DB fail.`);
                        console.log(`Error on ${SP1.data.doctorName}`)
                        // return res.json(TS.fail("SP5 DB fail."));
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  let result = tempCount
  return res.json(TS.success(result));
});

