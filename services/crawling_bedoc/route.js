const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_bedoc/controller`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const TS = require(`${global.appRoot}/server/middleware/message.handler`);
const AUTH = require(`${global.appRoot}/server/middleware/auth.handler`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const mybatisMapper = require("mybatis-mapper");
const functions = require(`${global.appRoot}/server/util/function`);
const express = require('express');
const asyncify = require('express-asyncify');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const router = asyncify(express.Router());
const geminiParser = require('./gemini_parser');


/**
 * @swagger
 *  /v1/c/crawling_bedoc/healthcheck:
 *    get:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [crawling_bedoc-베닥의사 수집]
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

router.get('/healthcheck', async function(req, res) {    
  const result = true;
  if ( result ) { 
    res.send({
      'code': 200,
      'message': '접속테스트',
      'desc': 'success',
      'data' : null 
    });
  }else{
    res.send({
      'code': 200,
      'message': '접속테스트',
      'desc': 'failed',
      'data' : result
    });
  }
});

/**
 * @swagger
 *  /v1/c/crawling_bedoc/collect:
 *    get:
 *      summary: "의사별 수집하기"
 *      description: "정보 가져오기"
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 의사별 수집하기
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

router.get('/collect', async function(req, res) {   
  
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
  let list_target_cnt = 0;
  let list_success_cnt = 0;
  try {
    const param = {
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
        "controler",
        "select_bedoc_hospital",
        param,
        format
    );
    //console.log(`query : ${query}`)
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    
    const ret = await  functions.myBatisResult(DBError,RS)
    //console.log(`ret : ${JSON.stringify(ret.data[0])}`)
    for ( let i = 0; i < ret?.data.length ; i++ ) {
      const doctorData = ret.data?.length > 0 ?  ret.data[i] : null;
      //console.log(`summaryData : ${JSON.stringify(doctorData)}`)
      
      if ( doctorData != null ) {
        //사이트는 우선 공공데이터를 기준, 의사명과 진료과목이 있으면 AI가 수집을 진행하게 한다 
        const hospital_cid = doctorData?.hospital_cid;
        const yoyang_giho =  doctorData?.yoyang_giho;
        console.log(`summaryData : ${doctorData?.hospital_site}, ${doctorData?.bedoc_deptname}, ${doctorData?.bedoc_doctorname}`)
        if ( doctorData?.hospital_site && doctorData?.bedoc_deptname && doctorData?.bedoc_doctorname ) {
          const hospitalID = doctorData?.aiga_hid;
          if (hospitalID) {
            const dirPath = path.join(global.appRoot, 'services/crawling_bedoc/data', hospitalID);
            if (!fs.existsSync(dirPath)){
              fs.mkdirSync(dirPath, { recursive: true });
              console.log(`Created directory: ${dirPath}`);
            }
          }

          /**
           * 데이터 수집항목 
           * {
            "isExist": true, // 사이트가 정상적으로 파싱이 되고 진료과목과 의사이름이 있으면 true 아니면 false
            "doctorName": "강덕희",
            "department": "신장내과",
            "profileUrl": "https://seoul.eumc.ac.kr/doctor/basicInfo.do?dr_sid=1001797&dept_cd=IMN", // 사이트가 정상적으로 파싱이 되고 진료과목과 의사이름이 있으면 해당 상세 아니면 false
            "specialty": "만성신장병, 고혈압, 거품뇨, 혈뇨, 사구체신염, 고요산혈증, 통풍, 투석", // 진료분야 , 전문분야등으로 표시되어 있어 
            "education": [   
              {
                "date": null, 년월이 있으면 YYYY.MM등으로 표시 없으면 null
                "content": "의학박사, 이화여대 의과대학 의학과"
              },
            ],
            "experience": [
              {
                "date": null, 년월이 있으면 YYYY.MM등으로 표시 없으면 null
                "content": "의학박사, 이화여대 의과대학 의학과"
              }
            ]
            "thesis": [
              {
                "titlet": "Lee HH, Gweon TG, Kang SG,atory ..."
              }
            ]
            education 학력 , experience : 경력 
            학력 영역이 없으면 약력 또는 경력, 주요경력에서 아래와 같은 기준으로 정리 
            * '석사', '박사', '졸업' 등의 키워드가 포함된 내용은 '학력'으로, 그 외는 '경력'으로 구분하여 수집합니다.
            논문관련 내용도 있으면 수집한다 논문의 경우 논문 또는 연구업적,저서등으로 표시되어 있다.
          */
          // Call the dispatcher to handle the crawling for this doctor
          const dispatcher = require('./dispatcher');
          const crawlResult = await dispatcher.dispatchAndCrawl(doctorData);

          // crawlResult.data.isExist가 true인 경우에만 성공으로 간주
          if (crawlResult.success && crawlResult.data.isExist === true) {
            list_success_cnt++;
            const paramNull = {
              cid : hospital_cid,
              isOk : 1
            }; 
            const formatNull = { language: "sql", indent: "  " };
            const queryNull = mybatisMapper.getStatement(
                "controler",
                "hospital_site_is_null",
                paramNull,
                formatNull
            );
            const { DBError = null, RS = null } = await daoMysql.spCall(queryNull);
            const retNull = await  functions.myBatisResult(DBError,RS)
          }else{
            const paramNull = {
              cid : hospital_cid,
              isOk : 0
            }; 
            const formatNull = { language: "sql", indent: "  " };
            const queryNull = mybatisMapper.getStatement(
                "controler",
                "hospital_site_is_null",
                paramNull,
                formatNull
            );
            const { DBError = null, RS = null } = await daoMysql.spCall(queryNull);
            const retNull = await  functions.myBatisResult(DBError,RS)
          }
          list_target_cnt++;

          await CS.wait(2000); //2초씩 딜레이 한다.
        }else{
          const paramNull = {
            cid : hospital_cid,
            isOk : 0
          }; 
          const formatNull = { language: "sql", indent: "  " };
          const queryNull = mybatisMapper.getStatement(
              "controler",
              "hospital_site_is_null",
              paramNull,
              formatNull
          );
          const { DBError = null, RS = null } = await daoMysql.spCall(queryNull);
          const retNull = await  functions.myBatisResult(DBError,RS)
        }
      }
    }
    return res.send({
      code : 200,
      success: true,
      message: `대상 의사수 : ${list_target_cnt}, 수집 성공의수 : ${list_success_cnt}`
    });
  } catch (error) {
    console.error('에러 발생:', error.message);
    res.status(500).send('데이터 수집 중 오류 발생');
  }
});

/**
 * @swagger
 *  /v1/c/crawling_bedoc/fetch_html:
 *    get:
 *      summary: "새로운 병원의 HTML 프로필 수집"
 *      description: "아직 맞춤형 스크래퍼가 없는 병원의 의사 프로필 HTML을 수집하여 파일로 저장합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: HTML 프로필 수집 결과
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
 *                            { "code": 1000, "message": "HTML 수집 완료" }
 */
router.get('/fetch_html', async function(req, res) {   
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
  let html_fetch_target_cnt = 0;
  let html_fetch_success_cnt = 0;
  const processedHospitals = new Set(); // Keep track of hospitals (scraper exists or HTML fetched)

  try {
    const param = {}; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
        "controler",
        "select_bedoc_hospital",
        param,
        format
    );
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    
    const ret = await functions.myBatisResult(DBError,RS);

    const dispatcher = require('./dispatcher');

    for (let i = 0; i < ret?.data.length; i++) {
      const doctorData = ret.data[i];
      const hospitalID = doctorData?.aiga_hid;

      if (hospitalID && doctorData?.hospital_site && doctorData?.bedoc_deptname && doctorData?.bedoc_doctorname) {
        
        if (processedHospitals.has(hospitalID)) {
            continue; 
        }

        const scraperPath = path.join(global.appRoot, 'services/crawling_bedoc/data', hospitalID, 'scraper.js');
        
        if (fs.existsSync(scraperPath)) {
            processedHospitals.add(hospitalID);
            console.log(`[INFO] Scraper already exists for ${hospitalID}. Skipping.`);
            continue;
        }

        // No scraper exists, and we haven't processed this hospital yet.
        // Fetch HTML for this one doctor.
        console.log(`[INFO] Fetching HTML for ${doctorData?.bedoc_doctorname} (${hospitalID}) as a sample for this hospital.`);
        const crawlResult = await dispatcher.dispatchAndCrawl(doctorData); 

        if (crawlResult.success && crawlResult.data.isExist !== false) {
            html_fetch_success_cnt++;
        }
        html_fetch_target_cnt++;
        
        // Mark this hospital as processed so we don't fetch another doctor from it.
        processedHospitals.add(hospitalID); 
        
        await CS.wait(2000); 
        
      } else {
        // 필수 정보가 없는 경우, is_site_ok를 0으로 업데이트 (기존 로직 유지)
        const paramNull = { cid : doctorData?.hospital_cid }; 
        const formatNull = { language: "sql", indent: "  " };
        const queryNull = mybatisMapper.getStatement(
            "controler",
            "hospital_site_is_null",
            paramNull,
            formatNull
        );
        await daoMysql.spCall(queryNull);
      }
    }

    return res.send({
      code : 200,
      success: true,
      message: `대상 병원수 : ${html_fetch_target_cnt}, HTML 수집 성공수 : ${html_fetch_success_cnt}`
    });

  } catch (error) {
    console.error('에러 발생:', error.message);
    res.status(500).send('HTML 수집 중 오류 발생');
  }
});

/**
 * @swagger
 *  /v1/c/crawling_bedoc/collect2:
 *    get:
 *      summary: "의사별 수집하기 (Gemini)"
 *      description: "Gemini를 사용하여 정보를 파싱합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 의사별 수집하기 (Gemini)
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
router.get('/collect2', async function(req, res) {

  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
  let list_target_cnt = 0;
  let list_success_cnt = 0;
  const results = []; // for detailed logging

  try {
    const param = {
    };
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
        "controler",
        "select_bedoc_hospital",
        param,
        format
    );
    const { DBError = null, RS = null } = await daoMysql.spCall(query);

    const ret = await  functions.myBatisResult(DBError,RS)

    for ( let i = 0; i < ret?.data.length ; i++ ) {
      const doctorData = ret.data?.length > 0 ?  ret.data[i] : null;

      if ( doctorData != null && doctorData?.hospital_site && doctorData?.bedoc_deptname && doctorData?.bedoc_doctorname ) {
          list_target_cnt++;
          const crawlResult = await geminiParser.parseWithGemini(doctorData);

          if (crawlResult.success) {
            list_success_cnt++;
            results.push({ doctor: doctorData.bedoc_doctorname, hospital: doctorData.hospital_name, status: 'On-Site Parse Success' });
          } else {
            results.push({ doctor: doctorData.bedoc_doctorname, hospital: doctorData.hospital_name, status: 'On-Site Parse Failed (Task Created)', reason: crawlResult.data.error });
          }

          await CS.wait(1000); // 1-second delay
      }
    }
    return res.send({
      code : 200,
      success: true,
      message: `Phase 1 (On-Site Parsing) Complete. Success: ${list_success_cnt} / ${list_target_cnt}`,
      results: results
    });
  } catch (error) {
    console.error('Error in /collect2 route:', error.message);
    res.status(500).send('An error occurred during the collection process: ' + error.message);
  }
});

module.exports = router;