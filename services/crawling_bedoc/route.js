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
const playwrightParser = require('./playwright_parser');
const naverSearch = require('./naver_search');


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

/**
 * @swagger
 *  /v1/c/crawling_bedoc/collect3:
 *    get:
 *      summary: "의사별 수집하기 (Playwright)"
 *      description: "Playwright를 사용하여 정보를 파싱합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 의사별 수집하기 (Playwright)
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
router.get('/collect3', async function(req, res) {

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

      if ( doctorData != null && doctorData?.hospital_site && doctorData?.bedoc_deptname && doctorData?.bedoc_doctorname && doctorData?.hospital_addr ) {
          list_target_cnt++;
          const crawlResult = await playwrightParser.parseWithPlaywright(doctorData);

          if (crawlResult && crawlResult.success) {
            list_success_cnt++;
            results.push({ doctor: doctorData.bedoc_doctorname, hospital: doctorData.hospital_name, status: 'On-Site Parse Success (Playwright)' });
          } else {
            // Safely access error message
            const errorMessage = (crawlResult && crawlResult.error) ? crawlResult.error : 'Unknown error during Playwright parsing';
            results.push({ doctor: doctorData.bedoc_doctorname, hospital: doctorData.hospital_name, status: 'On-Site Parse Failed (Playwright)', reason: errorMessage });
          }

          await CS.wait(1000); // 1-second delay
      }
    }
    return res.send({
      code : 200,
      success: true,
      message: `Phase 1 (On-Site Parsing with Playwright) Complete. Success: ${list_success_cnt} / ${list_target_cnt}`,
      results: results
    });
  } catch (error) {
    console.error('Error in /collect3 route:', error.message);
    res.status(500).send('An error occurred during the collection process: ' + error.message);
  }
});

/**
 * @swagger
 *  /v1/c/crawling_bedoc/save:
 *    get:
 *      summary: "수집된 의사 데이터를 DB에 저장"
 *      description: "services/crawling_bedoc/data/ 폴더의 JSON 파일들을 읽어 DB에 저장합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 저장 결과
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    message:u000a                      type: string
 */
router.get('/save', async function(req, res) {
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
  let saved_count = 0;
  const errors = [];
  let emptyDoctors = [];
  try {
    const dataDir = path.join(global.appRoot, 'services/crawling_bedoc/data');
    const dataDoneDir = path.join(global.appRoot, 'services/crawling_bedoc/saved_data');
    const hospitalDirs = fs.readdirSync(dataDir, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    for (const hospitalID of hospitalDirs) {
      const doctorFiles = fs.readdirSync(path.join(dataDir, hospitalID)).filter(file => file.endsWith('.json') && !file.endsWith('_saved.json'));

      for (const fileName of doctorFiles) {
        const filePath = path.join(dataDir, hospitalID, fileName);
        let doctorData = null; // Declare doctorData here
        let doctorName = 'Unknown Doctor'; // Declare and initialize
        let hospitalName = 'Unknown Hospital'; // Declare and initialize

        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          doctorData = JSON.parse(fileContent); // Assign to the outer-scoped variable

          if (!doctorData || CS.isEmpty(doctorData?.doctorDetailUrl) || CS.isEmpty(doctorData?.bedoc_doctorname) || doctorData?.isSearchType == "html_failed" ) { // Handle cases where JSON.parse returns null/undefined
            emptyDoctors.push(doctorData)
            throw new Error('Parsed doctorData is null or undefined.');
          }

          doctorName = doctorData.bedoc_doctorname || 'Unknown Doctor';
          hospitalName = doctorData.hospital_name || 'Unknown Hospital';

          const saveResult = await crawlingCtrl.saveDoctorDataToDb(doctorData);
          if (saveResult.success) {
            const saveBedocResult = await crawlingCtrl.saveDoctorDataToBedocTable(doctorData,hospitalID);
            console.log(`saveResult.success: ${saveResult.success}`)
            saved_count++;
            
          } else {
            errors.push(`Doctor ${doctorName} from ${hospitalName}: ${saveResult.error}`);
          }
        } catch (fileError) {
          console.error(`[SAVE] Error processing file ${filePath}: ${fileError.message}`);
          errors.push(`File ${filePath} (Doctor: ${doctorName}, Hospital: ${hospitalName}): ${fileError.message}`);
        }
        // Rename the file to mark as saved
        const newFilePath = path.join(dataDir, hospitalID, fileName.replace('.json', '_saved.json'));
        fs.renameSync(filePath, newFilePath);
        console.log(`Renamed ${fileName} to ${fileName.replace('.json', '_saved.json')}`);
        await CS.wait(1000); //의사 1명당 1초씩 텀은 준다
      }
    }
    console.log(`Saved ${saved_count} doctor records. Errors: ${errors.length}, Empty Doctors: ${emptyDoctors.length}`)
    return res.send({
      code: 200,
      success: true,
      message: `Saved ${saved_count} doctor records. Errors: ${errors.length}, Empty Doctors: ${emptyDoctors.length}`,
      errors: errors
    });
  } catch (error) {
    console.error('Error in /save route:', error.message);
    res.status(500).send('An error occurred during the save process: ' + error.message);
  }
});


/**
 * @swagger
 *  /v1/c/crawling_bedoc/save:
 *    get:
 *      summary: "수집된 의사 데이터를 DB에 저장"
 *      description: "services/crawling_bedoc/data/ 폴더의 JSON 파일들을 읽어 DB에 저장합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 저장 결과
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    message:u000a                      type: string
 */
router.get('/bedoc-save', async function(req, res) {
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
  let saved_count = 0;
  const errors = [];
  let emptyDoctors = [];
  try {
    const dataDir = path.join(global.appRoot, 'services/crawling_bedoc/final_data');
    const hospitalDirs = fs.readdirSync(dataDir, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    for (const hospitalID of hospitalDirs) {
      const doctorFiles = fs.readdirSync(path.join(dataDir, hospitalID)).filter(file => file.endsWith('.json') && !file.endsWith('_saved.json'));

      for (const fileName of doctorFiles) {
        const filePath = path.join(dataDir, hospitalID, fileName);
        let doctorData = null; // Declare doctorData here
        let doctorName = 'Unknown Doctor'; // Declare and initialize
        let hospitalName = 'Unknown Hospital'; // Declare and initialize

        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          doctorData = JSON.parse(fileContent); // Assign to the outer-scoped variable

          if (!doctorData || CS.isEmpty(doctorData?.saveDoctorDetailUrl) || CS.isEmpty(doctorData?.bedoc_doctorname) || !doctorData?.isExist ) { // Handle cases where JSON.parse returns null/undefined
            emptyDoctors.push(doctorData)
            throw new Error('Parsed doctorData is null or undefined.');
          }

          doctorName = doctorData.bedoc_doctorname || 'Unknown Doctor';
          hospitalName = doctorData.hospital_name || 'Unknown Hospital';

          const saveResult = await crawlingCtrl.saveDoctorDataToDb(doctorData);
          if (saveResult.success) {
            const saveBedocResult = await crawlingCtrl.saveDoctorDataToBedocTable(doctorData,hospitalID);
            console.log(`saveResult.success: ${saveResult.success}`)
            saved_count++;
            
          } else {
            errors.push(`Doctor ${doctorName} from ${hospitalName}: ${saveResult.error}`);
          }
        } catch (fileError) {
          console.error(`[SAVE] Error processing file ${filePath}: ${fileError.message}`);
          errors.push(`File ${filePath} (Doctor: ${doctorName}, Hospital: ${hospitalName}): ${fileError.message}`);
        }
        // Rename the file to mark as saved
        const newFilePath = path.join(dataDir, hospitalID, fileName.replace('_saved2.json', '_final_saved.json'));
        fs.renameSync(filePath, newFilePath);
        console.log(`Renamed ${fileName} to ${fileName.replace('_saved2.json', '_final_saved.json')}`);
        await CS.wait(1000); //의사 1명당 1초씩 텀은 준다
      }
    }
    console.log(`Saved ${saved_count} doctor records. Errors: ${errors.length}, Empty Doctors: ${emptyDoctors.length}`)
    return res.send({
      code: 200,
      success: true,
      message: `Saved ${saved_count} doctor records. Errors: ${errors.length}, Empty Doctors: ${emptyDoctors.length}`,
      errors: errors
    });
  } catch (error) {
    console.error('Error in /save route:', error.message);
    res.status(500).send('An error occurred during the save process: ' + error.message);
  }
});

/**
 * @swagger
 *  /v1/c/crawling_bedoc/get-allhid:
 *    get:
 *      summary: "HID전체 조회를 위한 api"
 *      description: "HID전체 조회"
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 저장 결과
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    message:u000a                      type: string
 */

router.get('/get-allhid', async function(req, res) {
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
  const hospitalHIDList = [];
  try {
  
    const param = {
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
        "controler",
        "find_all_hospital_hid",
        param,
        format
    );
   
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    
    const ret = await  functions.myBatisResult(DBError,RS)

    // Save the data to a file
    const outputPath = path.join(global.appRoot, 'services/crawling_bedoc', 'hospital_list.json');
    fs.writeFileSync(outputPath, JSON.stringify(ret?.data, null, 2));
    console.log(`Hospital data saved to ${outputPath}`);

    console.log(`query : ${JSON.stringify(ret?.data[0])}`)
    return res.send({
      code: 200,
      success: true,
      message: `ok, and data saved to file`,
      data: ret?.data[0]
    });
  } catch (error) {
    console.error('Error in /get-allhid route:', error.message);
    res.status(500).send('An error occurred during the get all hid process: ' + error.message);
  }
});



/**
 * @swagger
 *  /v1/c/crawling_bedoc/find-detailurl:
 *    get:
 *      summary: "의사상세주소를 찾는 api"
 *      description: "HID전체 조회"
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 저장 결과
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    message:u000a                      type: string
 */

router.get('/find-detailurl', async function(req, res) {
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
  const results = [];
  try {
    const param = {};
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement("controler", "select_bedoc_hospital_detaill", param, format);
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    if (DBError) { throw new Error(DBError.message); }
    const ret = await functions.myBatisResult(DBError, RS);

    for (const doctorData of ret.data) {
      const { hid, doctorname, deptname, baseName } = doctorData;
      
      const dirPath = path.join(global.appRoot, 'services/crawling_bedoc/data', hid);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const jsonFilePath = path.join(dirPath, `${doctorname}.json`);
      fs.writeFileSync(jsonFilePath, JSON.stringify(doctorData, null, 2));

      if (baseName) {
        const searchQuery = `"${deptname}" "${doctorname}"`;

        try {
          const { htmlContent, linksData } = await naverSearch.getNaverHtmlAndLinks(searchQuery); // 1페이지 검색 (기본값)

          if (htmlContent) {
            const htmlFilePath = path.join(dirPath, `${doctorname}.html`);
            fs.writeFileSync(htmlFilePath, htmlContent);

            const linksFilePath = path.join(dirPath, `${doctorname}_links.json`);
            fs.writeFileSync(linksFilePath, JSON.stringify(linksData, null, 2));

            results.push({ doctor: doctorname, hid, status: 'html_and_links_saved', html_path: htmlFilePath, links_path: linksFilePath });
          } else {
            results.push({ doctor: doctorname, hid, status: 'html_fetch_failed', error: 'Failed to get HTML from Naver search.' });
          }
        } catch (e) {
          results.push({ doctor: doctorname, hid, status: 'html_fetch_error', error: e.message });
        }
      } else {
        results.push({ doctor: doctorname, hid, status: 'failed', error: 'Missing hospital name (baseName).' });
      }
      await CS.wait(1000);
    }

    return res.send({ code: 200, success: true, results: results });
  } catch (error) {
    console.error('Error in /find-detailurl route:', error.message);
    res.status(500).send('An error occurred during the find detail URL process: ' + error.message);
  }
});


/**
 * @swagger
 *  /v1/c/crawling_bedoc/save-detailurl:
 *    get:
 *      summary: "수집된 의사 데이터를 DB에 저장"
 *      description: "services/crawling_bedoc/data/ 폴더의 JSON 파일들을 읽어 DB에 저장합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 저장 결과
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    message:u000a                      type: string
 */
router.get('/save-detailurl', async function(req, res) {
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
  let saved_count = 0;
  const errors = [];
  const updateFailures = []; // To log specific update failures
  let skipped_count = 0;
  try {
    const dataDir = path.join(global.appRoot, 'services/crawling_bedoc/data');
    const hospitalDirs = fs.readdirSync(dataDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const hospitalID of hospitalDirs) {
      const doctorFiles = fs.readdirSync(path.join(dataDir, hospitalID))
        .filter(file => file.endsWith('.json')  && !file.endsWith('_links.json'));

      for (const fileName of doctorFiles) {
        const filePath = path.join(dataDir, hospitalID, fileName);
        let doctorData = null; 

        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          doctorData = JSON.parse(fileContent);

          // Validation check
          if (!doctorData || CS.isEmpty(doctorData.foundProfileUrl) || doctorData.foundProfileUrl === 'notFound' || CS.isEmpty(doctorData.hid) || CS.isEmpty(doctorData.findHospitalName)) {
            skipped_count++;
            const newFilePath = path.join(dataDir, hospitalID, fileName.replace('.json', '_saved.json'));
            fs.renameSync(filePath, newFilePath);
            // console.log(`Skipped and renamed invalid file: ${fileName}`);
            continue; 
          }

          const saveResult = await crawlingCtrl.saveDoctorDetailToBedocTable(doctorData, hospitalID);
          if (saveResult.success) {
            saved_count++;
            const newFilePath = path.join(dataDir, hospitalID, fileName.replace('.json', '_saved.json'));
            fs.renameSync(filePath, newFilePath);
            // console.log(`Successfully processed and renamed ${fileName}`);
          } else {
            // This is where we log the update failure
            const failureLog = {
                doctor: doctorData?.doctorname || 'Unknown',
                hospital: doctorData?.baseName || 'Unknown',
                rid_long: doctorData?.rid_long,
                error: saveResult.error
            };
            updateFailures.push(failureLog);
            errors.push(`Update failed for ${failureLog.doctor}: ${failureLog.error}`);
            console.error(`[SAVE-DB] Update failed for file ${filePath}: ${saveResult.error}`);
          }
        } catch (fileError) {
          const errorMessage = `File ${filePath}: ${fileError.message}`;
          console.error(`[SAVE-FILE] Error processing ${errorMessage}`);
          errors.push(errorMessage);
        }
        await CS.wait(100); 
      }
    }
    console.log(`Saved ${saved_count} doctor records. Errors: ${errors.length}, Skipped: ${skipped_count}, Update Failures: ${updateFailures.length}`)
    return res.send({
      code: 200,
      success: true,
      message: `Saved ${saved_count} doctor records. Errors: ${errors.length}, Skipped: ${skipped_count}, Update Failures: ${updateFailures.length}`,
      errors: errors,
      updateFailures: updateFailures // Add this to the response
    });
  } catch (error) {
    console.error('Critical error in /save-detailurl route:', error.message);
    res.status(500).send('A critical error occurred during the save process: ' + error.message);
  }
});



/**
 * @swagger
 *  /v1/c/crawling_bedoc/parsing-final:
 *    get:
 *      summary: "최종 수집된 의사 데이터 파싱 및 수정"
 *      description: "특정 디렉토리의 의사 JSON 파일들을 순차적으로 읽어 지시된 내용으로 수정합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 처리 결과
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    message:
 *                      type: string
 */
router.get('/parsing-final', async function(req, res) {
  let processed_count = 0;
  const errors = [];
  // NOTE: 작업할 파일이 있는 디렉토리를 지정해야 합니다. 우선 'final_data'로 설정합니다.
  const targetDir = path.join(global.appRoot, 'services/crawling_bedoc/final_data'); 

  try {
    if (!fs.existsSync(targetDir)) {
      return res.status(404).send({
        code: 404,
        success: false,
        message: `Directory not found: ${targetDir}`
      });
    }

    const allDoctorFiles = fs.readdirSync(targetDir)
      .filter(file => file.endsWith('.json') && !file.endsWith('_saved.json') && !file.endsWith('_saved2.json') && !file.endsWith('_failed.json'));
    const filesToProcess = allDoctorFiles.slice(0, 10); // 한 번에 10개 파일만 선택

    console.log(`[PARSING-FINAL] Found ${allDoctorFiles.length} total files. Will process a batch of ${filesToProcess.length}.`);

    for (const fileName of filesToProcess) {
      const filePath = path.join(targetDir, fileName);
      try {
        console.log(`[PARSING-FINAL] --- Processing file: ${fileName} ---`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let doctorData = JSON.parse(fileContent);

        // isFinalComplete가 true이면 파일을 건너뛴다.
        if (doctorData.isFinalComplete === true) {
          console.log(`[PARSING-FINAL] Skipping already completed file: ${fileName}`);
          continue;
        }

        // =================================================================
        // 1. 필요한 모든 키가 있는지 확인하고 로직 실행
        const baseUrl = doctorData.doctorDetailUrl || doctorData.hospital_site;
        const doctorNameValue = doctorData.bedoc_doctorname || doctorData.doctorName;
        const deptNameValue = doctorData.bedoc_deptname || doctorData.department;

        // 2. 모든 필수 데이터가 있는 경우에만 전체 수정 작업을 진행
        if (baseUrl && doctorNameValue && deptNameValue) {
            // 2-1. saveDoctorDetailUrl 값 생성
            const doctorName = encodeURIComponent(doctorNameValue);
            const deptName = encodeURIComponent(deptNameValue);
            const queryString = `doctorName=${doctorName}&depthName=${deptName}`;
            const separator = baseUrl.includes('?') ? '&' : '?';
            const newUrl = `${baseUrl}${separator}${queryString}`;

            // 2-2. 필드 순서 조정을 위해 객체를 새로 생성
            const newData = {};
            let newFieldsAdded = false;
            for (const key in doctorData) {
                newData[key] = doctorData[key];
                if (key === 'isExist') {
                    newData.isFinalComplete = true;
                    newData.isSaveToDatabase = false;
                    newData.saveDoctorDetailUrl = newUrl; // isSaveToDatabase 바로 뒤에 추가
                    newFieldsAdded = true;
                }
            }
            // isExist 키가 없는 경우, 마지막에 새 필드들을 추가
            if (!newFieldsAdded) {
                newData.isFinalComplete = true;
                newData.isSaveToDatabase = false;
                newData.saveDoctorDetailUrl = newUrl;
            }
            doctorData = newData;

            // 2-3. 수정된 내용을 파일에 쓰고, 파일명 변경
            fs.writeFileSync(filePath, JSON.stringify(doctorData, null, 2), 'utf-8');
            const newFilePath = filePath.replace('.json', '_saved.json');
            fs.renameSync(filePath, newFilePath);

            processed_count++;
            console.log(`[PARSING-FINAL] Successfully processed and renamed ${fileName}`);

        } else {
            // 필수 데이터가 없어 처리하지 않고 _failed.json으로 이름 변경
            const newFilePath = filePath.replace('.json', '_failed.json');
            fs.renameSync(filePath, newFilePath);
            errors.push(`File ${fileName} was renamed to _failed.json due to missing data.`);
            console.log(`[PARSING-FINAL] Skipped and renamed to ${fileName.replace('.json', '_failed.json')} due to missing data.`);
        }
        // =================================================================


      } catch (fileError) {
        const errorMessage = `File ${fileName}: ${fileError.message}`;
        console.error(`[PARSING-FINAL] CRITICAL ERROR processing ${errorMessage}`);
        errors.push(errorMessage);
      }
    }

    return res.send({
      code: 200,
      success: true,
      message: `Batch complete. Processed ${processed_count} doctor records. Errors: ${errors.length}`,
      errors: errors
    });
  } catch (error) {
    console.error('Critical error in /parsing-final route:', error.message);
    res.status(500).send('A critical error occurred during the parsing process: ' + error.message);
  }
});


/**
 * @swagger
 *  /v1/c/crawling_bedoc/refactor-thesis:
 *    get:
 *      summary: "논문 필드 포맷 일괄 수정"
 *      description: "final_data 디렉토리의 모든 JSON 파일들을 순회하며, 논문 필드의 포맷을 가이드에 맞게 문자열 배열로 수정합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 처리 결과
 */
router.get('/refactor-thesis', async function(req, res) {
  let checked_count = 0;
  let refactored_count = 0;
  const errors = [];
  const targetDir = path.join(global.appRoot, 'services/crawling_bedoc/final_data');

  try {
    if (!fs.existsSync(targetDir)) {
      return res.status(404).send({ code: 404, success: false, message: `Directory not found: ${targetDir}` });
    }

    const allFiles = fs.readdirSync(targetDir).filter(file => file.endsWith('.json'));

    for (const fileName of allFiles) {
      const filePath = path.join(targetDir, fileName);
      checked_count++;
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let doctorData = JSON.parse(fileContent);

        // 논문 필드가 있고, 배열이며, 내용이 있는지, 그리고 첫 항목이 객체인지 확인
        if (doctorData.논문 && Array.isArray(doctorData.논문) && doctorData.논문.length > 0 && typeof doctorData.논문[0] === 'object' && doctorData.논문[0] !== null) {
          
          // 포맷이 객체 배열인 경우, 문자열 배열로 변환
          if (doctorData.논문[0].content) {
            doctorData.논문 = doctorData.논문.map(item => item.content);
            fs.writeFileSync(filePath, JSON.stringify(doctorData, null, 2), 'utf-8');
            refactored_count++;
            console.log(`[REFACTOR-THESIS] Refactored and saved: ${fileName}`);
          } else {
            console.log(`[REFACTOR-THESIS] Skipping file with object array but no 'content' key: ${fileName}`);
          }
        } else {
          console.log(`[REFACTOR-THESIS] Skipping file with correct or no thesis data: ${fileName}`);
        }
      } catch (fileError) {
        const errorMessage = `File ${fileName}: ${fileError.message}`;
        console.error(`[REFACTOR-THESIS] Error processing file: ${errorMessage}`);
        errors.push(errorMessage);
      }
    }

    return res.send({
      code: 200,
      success: true,
      message: `Checked ${checked_count} files. Refactored ${refactored_count} files.`,
      errors: errors
    });
  } catch (error) {
    console.error('Critical error in /refactor-thesis route:', error.message);
    res.status(500).send('A critical error occurred during the refactoring process: ' + error.message);
  }
});

/**
 * @swagger
 *  /v1/c/crawling_bedoc/refactor-books:
 *    get:
 *      summary: "저서 필드 포맷 일괄 수정"
 *      description: "final_data 디렉토리의 모든 JSON 파일들을 순회하며, 저서 필드의 포맷을 { date, content } 객체 배열로 수정합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 처리 결과
 */
router.get('/refactor-books', async function(req, res) {
  let checked_count = 0;
  let refactored_count = 0;
  const errors = [];
  const targetDir = path.join(global.appRoot, 'services/crawling_bedoc/final_data');

  try {
    if (!fs.existsSync(targetDir)) {
      return res.status(404).send({ code: 404, success: false, message: `Directory not found: ${targetDir}` });
    }

    const allFiles = fs.readdirSync(targetDir).filter(file => file.endsWith('_saved.json') && !file.endsWith('_saved2.json'));
    const filesToProcess = allFiles.slice(0, 10); // 한 번에 10개 파일만 선택

    console.log(`[REFACTOR-BOOKS] Found ${allFiles.length} total files. Will process a batch of ${filesToProcess.length}.`);

    for (const fileName of filesToProcess) {
      const filePath = path.join(targetDir, fileName);
      checked_count++;
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let doctorData = JSON.parse(fileContent);
        let needsRefactor = false;

        // '저서' 필드가 있고, 배열이며, 내용이 있는지 확인
        if (doctorData.저서 && Array.isArray(doctorData.저서) && doctorData.저서.length > 0) {
          const firstItem = doctorData.저서[0];

          if (typeof firstItem === 'string') {
            // Case 1: 문자열 배열 -> [{ date: null, content: string }]
            doctorData.저서 = doctorData.저서.map(item => ({ date: null, content: item }));
            needsRefactor = true;
            console.log(`[REFACTOR-BOOKS] Refactoring string array in: ${fileName}`);
          } else if (typeof firstItem === 'object' && firstItem !== null) {
            // Case 2: 객체 배열
            if (!firstItem.hasOwnProperty('content')) {
              // Case 2a: targetDate, text 키를 가진 다른 포맷의 객체
              if (firstItem.hasOwnProperty('text')) {
                doctorData.저서 = doctorData.저서.map(item => {
                  const newBook = {
                    date: item.targetDate || null,
                    content: item.text || ''
                  };
                  if (item.url) {
                    newBook.url = item.url;
                  }
                  if (item.issuer) {
                    newBook.issuer = item.issuer;
                  }else if (item.publisher) {
                    newBook.issuer = item.publisher;
                  }
                  return newBook;
                });
                needsRefactor = true;
                console.log(`[REFACTOR-BOOKS] Refactoring object array from 'text' property in: ${fileName}`);
              } else {
                console.log(`[REFACTOR-BOOKS] Skipping object array with unknown format in: ${fileName}`);
              }
            } else {
              // Case 2b: 이미 올바른 포맷 { content: ... }
              console.log(`[REFACTOR-BOOKS] Skipping file with correct format: ${fileName}`);
            }
          }
        } else {
          // '저서' 필드가 없거나 비어있음
          console.log(`[REFACTOR-BOOKS] Skipping file with no '저서' data: ${fileName}`);
        }

        //if (needsRefactor) {
          fs.writeFileSync(filePath, JSON.stringify(doctorData, null, 2), 'utf-8');
          const newFilePath = filePath.replace('_saved.json', '_saved2.json');
          fs.renameSync(filePath, newFilePath);
          refactored_count++;
          console.log(`[REFACTOR-BOOKS] Successfully refactored and renamed ${fileName}`);
        //}
      } catch (fileError) {
        const errorMessage = `File ${fileName}: ${fileError.message}`;
        console.error(`[REFACTOR-BOOKS] Error processing file: ${errorMessage}`);
        errors.push(errorMessage);
      }
    }

    return res.send({
      code: 200,
      success: true,
      message: `Batch complete. Checked ${checked_count} files. Refactored ${refactored_count} files.`,
      errors: errors
    });
  } catch (error) {
    console.error('Critical error in /refactor-books route:', error.message);
    res.status(500).send('A critical error occurred during the refactoring process: ' + error.message);
  }
});


/**
 * @swagger
 *  /v1/c/crawling_bedoc/update-hid:
 *    get:
 *      summary: "aiga_hid 필드 일괄 업데이트"
 *      description: "saved_final_data 폴더를 참조하여 final_data 폴더의 aiga_hid 값을 bedoc_id 기준으로 업데이트합니다."
 *      tags: [crawling_bedoc-베닥의사 수집]
 *      responses:
 *        "200":
 *          description: 데이터 처리 결과
 */
router.get('/update-hid', async function(req, res) {
  let updated_count = 0;
  let checked_count = 0;
  const not_found_errors = [];
  const general_errors = [];

  try {
    // --- Phase 1: Build Lookup Map ---
    console.log('[UPDATE-HID] Starting Phase 1: Building lookup map...');
    const bedocIdToHidMap = {};
    const referenceRootDir = path.join(global.appRoot, 'services/crawling_bedoc/saved_final_data');

    if (!fs.existsSync(referenceRootDir)) {
      return res.status(404).send({ code: 404, success: false, message: `Reference directory not found: ${referenceRootDir}` });
    }

    const hospitalDirs = fs.readdirSync(referenceRootDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const hospitalHid of hospitalDirs) {
      const doctorDir = path.join(referenceRootDir, hospitalHid);
      const doctorFiles = fs.readdirSync(doctorDir).filter(file => file.endsWith('.json'));
      for (const doctorFile of doctorFiles) {
        try {
          const filePath = path.join(doctorDir, doctorFile);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const referenceData = JSON.parse(fileContent);
          if (referenceData.bedoc_id) {
            bedocIdToHidMap[referenceData.bedoc_id] = hospitalHid;
          }
        } catch (mapError) {
            console.error(`[UPDATE-HID] Error building map from ${doctorFile}: ${mapError.message}`);
        }
      }
    }
    console.log(`[UPDATE-HID] Phase 1 Complete: Map created with ${Object.keys(bedocIdToHidMap).length} entries.`);

    // --- Phase 2: Update Final Files ---
    console.log('[UPDATE-HID] Starting Phase 2: Updating final files...');
    const targetDir = path.join(global.appRoot, 'services/crawling_bedoc/final_data');
    if (!fs.existsSync(targetDir)) {
        return res.status(404).send({ code: 404, success: false, message: `Target directory not found: ${targetDir}` });
    }
    const filesToUpdate = fs.readdirSync(targetDir).filter(file => file.endsWith('.json'));

    for (const fileName of filesToUpdate) {
      const filePath = path.join(targetDir, fileName);
      checked_count++;
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let doctorData = JSON.parse(fileContent);

        if (doctorData.bedoc_id) {
          const newHid = bedocIdToHidMap[doctorData.bedoc_id];
          if (newHid) {
            if (doctorData.aiga_hid !== newHid) {
              doctorData.aiga_hid = newHid;
              fs.writeFileSync(filePath, JSON.stringify(doctorData, null, 2), 'utf-8');
              updated_count++;
              console.log(`[UPDATE-HID] Updated HID for ${fileName} to ${newHid}`);
            } else {
              // console.log(`[UPDATE-HID] HID for ${fileName} is already correct. Skipping.`);
            }
          } else {
            not_found_errors.push(`bedoc_id '${doctorData.bedoc_id}' in file ${fileName} not found in reference data.`);
          }
        } else {
          not_found_errors.push(`File ${fileName} is missing bedoc_id.`);
        }
      } catch (updateError) {
        general_errors.push(`Failed to process ${fileName}: ${updateError.message}`);
      }
    }

    return res.send({
      code: 200,
      success: true,
      message: `Checked ${checked_count} files. Updated ${updated_count} files.`,
      lookup_map_size: Object.keys(bedocIdToHidMap).length,
      not_found_count: not_found_errors.length,
      error_count: general_errors.length,
      not_found_details: not_found_errors,
      errors: general_errors
    });

  } catch (error) {
    console.error('Critical error in /update-hid route:', error.message);
    res.status(500).send('A critical error occurred during the update process: ' + error.message);
  }
});

module.exports = router;
