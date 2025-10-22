
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
  const HOSPITAL_NAME = '전북대학교병원';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  const data = [];
  const r_url = `https://www.jbuh.co.kr/prog/mdcl/main/sub01_01_01/list.do`;
  //const r_url = `https://www.jbuh.co.kr/cuh/main/sub03/sub01_1.jsp`;
  const P1 = await crawlingCtrl.crwalingProcess01(r_url);
  //https://www.jbuh.co.kr/cuh/main/dept/dept_doctor.jsp?docNo=96701
  //https://www.jbuh.co.kr/cuh/main/dept/dept_doctor.jsp?docNo=96701
  //https://www.jbuh.co.kr/prog/mdclStf/main/sub01_01/view.do?mdclCd=GSHT1&mdclStfEmplNo=96701
  //https://www.jbuh.co.kr/prog/mdclStf/main/sub01_01/view.do?mdclCd=GSHT1&mdclStfEmplNo=96701
  if (P1.error) return res.json(TS.fail(P1.error));
  if (functions.isEmpty(P1.data)) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }

  // _.size(P1.data);
  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(500);
    console.log(`P1.data[i].link: ${P1.data[i].link},P1.data[i].deptName: ${P1.data[i].deptName}`)
    const SP1 = await crawlingCtrl.crwalingProcess02(P1.data[i].link, P1.data[i].deptName);
    console.log("SP1 size",_.size(SP1?.data));
  
    if (!CS.isEmpty(SP1.data)) {
      for (let j = 0; j < _.size(SP1.data); j++) {
        const element = SP1.data[j];
        
        const u = new URL(element.url);
        const params = u.searchParams;

        const mdclCd = params.get("mdclCd");               // "GSHT1"
        const mdclStfEmplNo = params.get("mdclStfEmplNo"); // "96701"
        const originalUrl = element.url;
        const convert_url = element.url.replace(
          `prog/mdclStf/main/sub01_01/view.do?mdclCd=${mdclCd}&mdclStfEmplNo=${mdclStfEmplNo}`,
          `cuh/main/dept/dept_doctor.jsp?docNo=${mdclStfEmplNo}`,
        )//https://www.jbuh.co.kr/prog/mdclStf/main/sub01_01/view.do?mdclCd=GSHT2&mdclStfEmplNo=96701
        console.log(`originalUrl: ${originalUrl}, convert_url: ${convert_url}`)
        console.log(`element...:${JSON.stringify(element)}`)
        console.log(`hid: ${HOSPITAL_ID}, deptName: ${element.deptName}, doctorName: ${element.doctorName}`)
        if ( element.deptName == "간담췌·이식혈관외과(혈관이식외과)" && element.doctorName == "유희철") {
          data.push({
            hid: HOSPITAL_ID,
            deptName: P1.data[i].deptName,
            doctorName: element.doctorName,
            url: element.url
          })
          console.log(`hid: ${HOSPITAL_ID}, deptName: ${P1.data[i].deptName}, doctorName: ${element.doctorName}, url: ${element.url}`)
          await CS.wait(200);
          const SP0 = await crawlingCtrl.get_rid_encrypt(element.doctorName, convert_url);
          if (SP0.error) {
            console.log("SP0 DB fail.");
            return res.json(TS.fail("SP0 DB fail."));
          }
          const tempRid = SP0.data[0].rid_encrypt

          const SP2 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, HOSPITAL_ID, P1.data[i].deptName, element.doctorName, convert_url, element.profileUrl,HOSPITAL_NAME,originalUrl);
          if (SP2.error) console.log("DB upsert fail.");;
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



router.post('/step02', async function(req, res, next) {  

  const HOSPITAL_ID = 'H01KR-45000002';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  const P1 = await crawlingCtrl.getCrawlingDoctorLink(HOSPITAL_ID);
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)
  const data = [];
  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것

    const doctorName = P1.data[i].doctorname;
    const deptName = P1.data[i].deptname;
    const refUrl = P1.data[i].new_doctor_url;
    const profileimgurl = P1.data[i].profileimgurl;
    if (doctorName && refUrl) {
      const SP1 = await crawlingCtrl.crwalingProcess03(refUrl);
      await CS.wait(300);
      /* const SP2 = await crawlingCtrl.get_rid_encrypt(doctorName, refUrl);
      if (SP2.error) {
        console.log("SP2 DB fail.");
        return res.json(TS.fail("SP2 DB fail."));
      }
      const tempRid = SP2.data[0].rid_encrypt
      //console.log(`check data: ${doctorName} ${refUrl} ${deptName} ${tempRid}`);
      if (CS.isEmpty(tempRid)) break;
      await CS.wait(300);
      const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, HOSPITAL_ID, deptName, doctorName, SP1.data.specialty, profileimgurl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }
      await CS.wait(300);
 
      const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, HOSPITAL_ID, doctorName, JSON.stringify(SP1.data.biography));
      if (SP4.error) {
        console.log("SP4 DB fail.");
        return res.json(TS.fail("SP4 DB fail."));
      } */
      data.push({
        hid: HOSPITAL_ID,
        deptName,
        doctorName,
        url: refUrl
      })
    }
  }
  let result = _.size(P1.data);
  return res.send({
    code : 200,
    success: true,
    message: `대상 의사수 : ${_.size(P1.data)}, 작업된 의사수 : ${_.size(data)}`
  })
  
});


/**
 * @swagger
 *  /v1/c/jbuh.co.kr/step02:
 *    post:
 *      summary: "2단계  조회"
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

  

  const P1 = await crawlingCtrl.getCrawlingDoctorLink(HOSPITAL_ID);
  console.log(`total sie: ${_.size(P1.data)}`)
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  // const loopSize = 1;
  let article = 0;
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const doctorName = P1.data[i].doctorname;
    const deptName = P1.data[i].deptname;
    const refUrl = P1.data[i].new_doctor_url
    const SP1 = await crawlingCtrl.crwalingtreatise(refUrl)
    /* if (_.size(SP1.data.biography) > 0) {
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
          doctorName: doctorName,
          authorName: null,
          subjectClassification: null,
          publicationLocation: null
        }
        const SP6 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
        if (SP6.error) {
          console.log(`SP6 DB fail.`);
          console.log(`Error on ${P1.data[i].doctorName}`)
        }
        article++;
      }
    } */
  }
  let result = null
  
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
