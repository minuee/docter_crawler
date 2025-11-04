
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_dongsan.dsmc.or.kr/controller`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const TS = require(`${global.appRoot}/server/middleware/message.handler`);
const AUTH = require(`${global.appRoot}/server/middleware/auth.handler`);
const express = require('express');
const asyncify = require('express-asyncify');
const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);
const router = asyncify(express.Router());
module.exports = router;

router.post('/healthcheck', async function(req, res) {   
  const HOSPITAL_ID = 'H01KR-47000002';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  return res.send({
    'code': 200,
    'message': '계명대 동산병원 접속테스트',
    'desc': 'success',
    'data' : req.body?.hid ? req.body.hid : null   
  });
    
});

/**
 * @swagger
 *  /v1/c/dongsan.dsmc.or.kr/healthcheck:
 *    post:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [dongsan.dsmc.or.kr-계명대 동산병원]
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

  const HOSPITAL_ID = 'H01KR-47000002';
  const HOSPITAL_NAME = '계명대학교동산병원';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }
  

  const data = [];
  const r_url = `https://dongsan.dsmc.or.kr:49870/content/02depart/01_01.php`;
  const P1 = await crawlingCtrl.crwalingProcess01(r_url);
  ///console.log("ddddd__Ddddx",_.size(P1?.data));
  
  if (P1.error) return res.json(TS.fail(P1.error));
  if (functions.isEmpty(P1.data)) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }

  // _.size(P1.data);
  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(500);
    console.log(`loop ${i} link : ${P1.data[i].link}, deptName : ${P1.data[i].deptName}`);
    const SP1 = await crawlingCtrl.crwalingProcess02(P1.data[i].link, P1.data[i].deptName);
   
    if (!functions.isEmpty(SP1.data)) {
      for (let i = 0; i < _.size(SP1.data); i++) {
        //if ( SP1.data[i].deptName == "가정의학과" && SP1.data[i].doctorName == "김대현") {
          data.push({
            hid: HOSPITAL_ID,
            deptName: SP1.data[i].deptName,
            doctorName: SP1.data[i].doctorName,
            url: SP1.data[i].url
          })
          await CS.wait(200);
          const SP0 = await crawlingCtrl.get_rid_encrypt(SP1.data[i].doctorName, SP1.data[i].url);
          //console.log("SP0",SP0.data);
          if (SP0.error) {
            console.log("SP0 DB fail.");
            return res.json(TS.fail("SP0 DB fail."));
          }
          const tempRid = SP0.data[0].rid_encrypt;

          const SP2 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, HOSPITAL_ID, SP1.data[i].deptName, SP1.data[i].doctorName, SP1.data[i].url,  SP1.data[i].profileUrl,HOSPITAL_NAME);
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
 *  /v1/c/dongsan.dsmc.or.kr/step01:
 *    post:
 *      summary: "1단계  조회"
 *      description: "계명대 동산병원 정보를 가져와야 한다  "
 *      tags: [dongsan.dsmc.or.kr-계명대 동산병원]
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
  
  const HOSPITAL_ID = 'H01KR-47000002';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }
  
  const P1 = await crawlingCtrl.getCrawlingDoctorLink(HOSPITAL_ID);
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)
  
  try{
    const data = [];
    for (let i = 0; i < doctorLinkTotal ; i++) {
      await CS.wait(10000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것

      const doctorRid = P1.data[i].rid;
      const doctorName = P1.data[i].doctorname;
      const deptName = P1.data[i].deptname;
      const refUrl = P1.data[i].doctor_url;
      const profileimgurl = P1.data[i].profileimgurl;
      
        if (doctorName && refUrl && refUrl.indexOf("http") !== -1) {
          let SP1_book = null;
          const SP1 = await crawlingCtrl.crwalingProcess03(refUrl);
          await CS.wait(300);
          //저서는 따로 진행
          try{
            const refUrl_book = refUrl.replace('doctor_view.php','doctor_view03.php')
            SP1_book = await crawlingCtrl.crwalingProcess03_book(refUrl_book, SP1.data);
            await CS.wait(300);
          }catch(error){
            console.log(`doctor_view03 : ${error}`);
          }
          
          try{
            //언론는 따로 진행
            const refUrl_press = refUrl.replace('doctor_view.php','doctor_view06.php')
            const SP1_press = await crawlingCtrl.crwalingProcess03_press(refUrl_press, SP1_book?.data);
            if ( SP1_press?.data?.length > 0 ) {
              const pressData = SP1_press.data;
              pressData.forEach(dtElement => {
                const dtText = dtElement[1] ? dtElement[1].trim() : '';
                const dtDateText = dtElement[4] ? dtElement[4].trim() : '';
                if ( !functions.isEmpty(dtText) ) {
                  const etc = {
                    targetDate : dtDateText,
                    type: "언론",
                    text: dtText,
                    url: '',
                    issuer:''
                  };
                  SP1_book.data.biography.push(etc);
                }
              })
            }
          }catch(error){
            console.log(`doctor_view06 : ${error}`);
          }
          //console.log(`dtText 33SP1_press.data333: ${JSON.stringify(SP1_book.data.biography)}`)
          //언론는 따로 진행
          let specialtyNew = null;
          let biographyNew = null;
          try{
            const refUrl_press2 = refUrl.replace('doctor_view.php','doctor_view08.php')
            const SP1_press2 = await crawlingCtrl.crwalingProcess03_press2(refUrl_press2, SP1_book?.data);
            specialtyNew = SP1_press2.data.specialty ? SP1_press2.data.specialty : null;
            biographyNew = SP1_press2.data.biography ? JSON.stringify(SP1_press2.data.biography) : null;
          }catch(error){
            console.log(`doctor_view08 : ${error}`);
          }
          const tempRid = doctorRid;
          //console.log(`check data: ${SP1_press2.data.biography} ${refUrl} ${deptName} ${tempRid}`);
          if (CS.isEmpty(tempRid)) break;
          await CS.wait(300);
          
          const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, HOSPITAL_ID, deptName, doctorName, specialtyNew, profileimgurl);
          if (SP3.error) {
            console.log("SP3 DB fail.");
            return res.json(TS.fail("SP3 DB fail."));
          }
          await CS.wait(300);
    
          const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, HOSPITAL_ID, doctorName, biographyNew);
          if (SP4.error) {
            console.log("SP4 DB fail.");
            return res.json(TS.fail("SP4 DB fail."));
          }

          data.push({
            hid: HOSPITAL_ID,
            deptName,
            doctorName,
            url: refUrl
          })
        }
      
    }
    console.log(`대상 의사수 : ${_.size(P1.data)}, 작업된 의사수 : ${_.size(data)}`);

    return res.send({
      code : 200,
      success: true,
      message: `대상 의사수 : ${_.size(P1.data)}, 작업된 의사수 : ${_.size(data)}`
    });
  }catch(error) {
    console.log(error);
    return res.send({
      code : 200,
      success: false,
      message: `error : ${error}`
    });
  }
});


/**
 * @swagger
 *  /v1/c/dongsan.dsmc.or.kr/step02:
 *    post:
 *      summary: "2단계  조회"
 *      description: "계명대 동산병원 정보를 가져와야 한다  "
 *      tags: [dongsan.dsmc.or.kr-계명대 동산병원]
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
  const HOSPITAL_ID = 'H01KR-47000002';
  const ret = await functions.checkHospitalId(HOSPITAL_ID, req, res);
  if ( ret.success === false ) {
    return res.send(ret);
  }

  const P1 = await crawlingCtrl.getCrawlingDoctorLink(HOSPITAL_ID);
  console.log(`total sie: ${_.size(P1.data)}`)
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  //const loopSize = 10;
  let article = 0;
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const doctorName = P1.data[i].doctorname;
    const deptName = P1.data[i].deptname;
    const refUrl = P1.data[i].doctor_url;
    const refUrl_treatise= refUrl.replace('doctor_view.php','doctor_view02.php')
    try{
      const SP1 = await crawlingCtrl.crwalingtreatise(refUrl_treatise)
      if (_.size(SP1.data.biography) > 0) {
        //console.log(`total sie: ${JSON.stringify(SP1.data.biography)}`)
        await CS.wait(300);
        const tempRid = P1.data[i].rid
        if (CS.isEmpty(tempRid)) break;
        for (let index = 0; index < _.size(SP1.data.biography); index++) {
          const element = SP1.data.biography[index];
          const iD = {
            rid: tempRid,
            title: element.title,
            doi: null,
            journalName: functions.isEmpty(element.journalName) ? '' : element.journalName,
            authorRule: null,
            publicationDate:  functions.isEmpty(element.publicationDate) ? '' : element.publicationDate,
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
      }
    }catch(error){
      console.log(`treatise : ${error}`);
    }
  }
  return res.send({
    code : 200,
    success: true,
    message: `대상 의사수 : ${_.size(P1.data)}, 수집된 논문수 : ${article}`
  });

});


/**
 * @swagger
 *  /v1/c/dongsan.dsmc.or.kr/treatise:
 *    post:
 *      summary: "논문 조회"
 *      description: "계명대 동산병원 정보를 가져와야 한다  "
 *      tags: [dongsan.dsmc.or.kr-계명대 동산병원]
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
