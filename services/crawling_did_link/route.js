const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_did_link/controller`);
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
const doctorCompare = require('./doctorCompare');
const router = asyncify(express.Router());

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;

/**
 * @swagger
 *  /v1/c/crawling_did_link/healthcheck:
 *    get:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [crawling_did_link-3차병원 DID작업]
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
 *  /v1/c/crawling_did_link/find-past:
 *    post:
 *      summary: "과거 이력 동일의사정보 찾기"
 *      description: "동일인의 과거정보를 찾는다"
 *      tags: [crawling_did_link-3차병원 DID작업]
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

router.post('/find-past', async function(req, res) {

  const HOSPITAL_ID = req.body.hid;
  if (CS.isEmpty(HOSPITAL_ID)) { 
    return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) 
  }
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_did_link/controler.xml`]);
  let totalDoctorCount = 0;
  const UpdateDcotorList = [];
  const NonUpdateDoctorList = [];
  try {
  
    const param = {
      search_hid : HOSPITAL_ID,
      search_data_version_id : DATA_VERSION_ID
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
        "controler",
        "select_new_doctor_list",
        param,
        format
    );
   
    const { DBError = null, RS = null } = await daoMysql.spCall(query);  
    const ret = await  functions.myBatisResult(DBError,RS);
    console.log('ret.data:', ret.data);
    
    for ( i = 0; i < ret?.data.length ; i++ ) {
      const summaryData = ret.data[i];
      totalDoctorCount++;
      console.log(`hid : ${summaryData?.hid},deptname : ${summaryData?.deptname},doctorname : ${summaryData?.doctorname}`)
      if ( summaryData != null ) {
        const param2 = {
          pass_rid_long : summaryData?.rid_long,
          search_doctorname : summaryData?.doctorname,
          search_deptname : summaryData?.deptname
        }; 
        const format2 = { language: "sql", indent: "  " };
        const query2 = mybatisMapper.getStatement(
            "controler",
            "select_new_doctor_samename_list",
            param2 ,
            format2
        );

        const { DBError = null, RS = null } = await daoMysql.spCall(query2);

        const ret2 = await  functions.myBatisResult(DBError,RS)
      
        const summaryData2 = ret2.data?.length > 0 ?  ret2.data : null; // 동명이인의 의사의 정보 배열값
        //console.log(`summaryData2 : ${summaryData2}`);
        if ( summaryData2 != null ) {

          if ( summaryData?.doctorname == "동재준" ) {
            const SP1 = await doctorCompare.findMatchingDoctor(summaryData,summaryData2);
            if (!CS.isEmpty(SP1)) {
              //console.log(`SP1result : ${SP1.result}, matchDoctor : ${SP1.matchDoctor}, score : ${SP1.score}`)
            }
          }
          // AI 분석을 위한 요청 파일 생성
          try {
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const fileName = `ai_analysis_request_${timestamp}_${summaryData.doctorname}.json`;
            const dirPath = path.join(__dirname, `data/${HOSPITAL_ID}`);
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
            const filePath = path.join(dirPath, fileName);

            const analysisData = {
              summaryData: summaryData,
              summaryData2: summaryData2
            };
            UpdateDcotorList++;
            fs.writeFileSync(filePath, JSON.stringify(analysisData, null, 2));
            console.log(`[AI 분석 요청 생성] 파일: ${fileName}`);

          } catch (e) {
            console.error(`[AI 분석 요청 파일 생성 실패] doctorname: ${summaryData.doctorname}, error: ${e.message}`);
          }

        } else {
          /* 동일한 이름의 의사가 없으므로 단계 패스 */
          console.log(`[신규 추정] 대상: ${summaryData.doctorname}(${summaryData.deptname} -> 시스템에 동명이인이 없습니다.`);
          try {
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const fileName = `ai_analysis_request_${timestamp}_${summaryData.doctorname}_notmatch.json`;
            const dirPath = path.join(__dirname, `data/${HOSPITAL_ID}`);
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
            const filePath = path.join(dirPath, fileName);

            fs.writeFileSync(filePath, JSON.stringify(summaryData, null, 2));
            console.log(`[AI 분석 요청 생성 - 매칭 대상 없음] 파일: ${fileName}`);

          } catch (e) {
            console.error(`[AI 분석 요청 파일 생성 실패] doctorname: ${summaryData.doctorname}, error: ${e.message}`);
          }
          NonUpdateDoctorList.push(summaryData);
        }
      }
      await CS.wait(3000);
    }
    console.log(`검색된 의사수 : ${totalDoctorCount}, 찾아낸 의사수 : ${_.size(UpdateDcotorList)}, 없는 의사수 : ${_.size(NonUpdateDoctorList)}`);
    return res.send({
      code: 200,
      success: true,
      message: `검색된 의사수 : ${totalDoctorCount}, 찾아낸 의사수 : ${_.size(UpdateDcotorList)}, 없는 의사수 : ${_.size(NonUpdateDoctorList)}`
    });
  } catch (error) {
    console.error('Error in  :', error.message);
    res.status(500).send('An error occurred during the get all hid process: ' + error.message);
  }
});


/**
 * @swagger
 *  /v1/c/crawling_did_link/update-notexist:
 *    post:
 *      summary: "제거대상의 관련 정보를 업데이트"
 *      description: "제거대상의 관련 정보를 업데이트한다"
 *      tags: [crawling_did_link-3차병원 DID작업]
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

router.post('/update-notexist', async function(req, res) {

  const HOSPITAL_ID = req.body.hid;
  if (CS.isEmpty(HOSPITAL_ID)) { 
    return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) 
  }
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_did_link/controler.xml`]);
  let totalDoctorCount = 0;
  let UpdateDcotorList = [];
  let NonUpdateDoctorList = [];
  try {
  
    const param = {
      search_hid : HOSPITAL_ID,
      search_data_version_id : DATA_VERSION_ID
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
        "controler",
        "select_notexist_doctor_list",
        param,
        format
    );
   
    const { DBError = null, RS = null } = await daoMysql.spCall(query);  
    const ret = await  functions.myBatisResult(DBError,RS);

    for ( i = 0; i < ret?.data.length ; i++ ) {
      const summaryData = ret.data[i];
      totalDoctorCount++;
      console.log(`hid : ${summaryData?.hid},deptname : ${summaryData?.deptname},doctorname : ${summaryData?.doctorname}`)
      if ( summaryData != null ) {
        const param2 = {
          search_rid : summaryData?.rid,
          search_rid_long : summaryData?.rid_long
        }; 
        const format2 = { language: "sql", indent: "  " };
        const query2 = mybatisMapper.getStatement(
            "controler",
            "update_notexist_doctor_list",
            param2 ,
            format2
        );

        const { DBError = null, RS = null } = await daoMysql.spCall(query2);

        const ret2 = await  functions.myBatisResult(DBError,RS)
        if ( ret2?.success) {
          UpdateDcotorList.push(summaryData);
        }else{
          NonUpdateDoctorList.push(summaryData);
        }
        
      }
    }
    console.log(`검색된 의사수 : ${totalDoctorCount}, 찾아낸 의사수 : ${_.size(UpdateDcotorList)}, 없는 의사수 : ${_.size(NonUpdateDoctorList)}`);
    return res.send({
      code: 200,
      success: true,
      message: `검색된 의사수 : ${totalDoctorCount}, 찾아낸 의사수 : ${_.size(UpdateDcotorList)}, 없는 의사수 : ${_.size(NonUpdateDoctorList)}`
    });
  } catch (error) {
    console.error('Error in  :', error.message);
    res.status(500).send('An error occurred during the get all hid process: ' + error.message);
  }
});



/**
 * @swagger
 *  /v1/c/crawling_did_link/save-notmatch:
 *    get:
 *      summary: "not match 의사 신규 doctor ID 부여"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [crawling_did_link-3차병원 DID작업]
 *      responses:
 *        "200":
 *          description: not match 의사 신규 doctor ID 부여
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

router.get('/save-notmatch', async function(req, res) {
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_did_link/controler.xml`]);
  const dataDir = path.join(__dirname, 'data');
  let processedFiles = 0;
  let updatedDoctors = 0;
  let failedDoctors = [];

  try {
    const hospitalDirs = fs.readdirSync(dataDir);

    for (const hospitalDir of hospitalDirs) {
      const hospitalPath = path.join(dataDir, hospitalDir);
      if (fs.statSync(hospitalPath).isDirectory()) {
        const files = fs.readdirSync(hospitalPath);

        for (const file of files) {
          if (file.endsWith('_notmatch.json')) {
            processedFiles++;
            const filePath = path.join(hospitalPath, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const doctorData = JSON.parse(fileContent);
            let doctorId = null;
            let step = '';

            try {
              console.log(`\n[Processing File]: ${file}`);
              if (doctorData && doctorData.rid_long) {
                step = 'select_doctor_id';
                // 1. rid_long으로 doctor_id가 있는지 확인
                const selectParam = { search_rid_long: doctorData.rid_long };
                const format = { language: "sql", indent: "  " };
                const selectQuery = mybatisMapper.getStatement("controler", "select_doctor_id_by_rid_long", selectParam, format);
                
                console.log(` -> [Step 1: SELECT] Executing for ${doctorData.doctorname}...`);
                const { DBError: selectDBError, RS: selectRS } = await daoMysql.spCall(selectQuery);
                console.log(` -> [Step 1: SELECT] Done.`);
                const selectRet = await functions.myBatisResult(selectDBError, selectRS);

                if (selectRet.success && selectRet.data.length > 0) {
                  doctorId = selectRet.data[0].doctor_id;
                  console.log(`    - Doctor ID found: ${doctorId}`);
                } else {
                  step = 'insert_new_doctor';
                  // 2. 없으면 doctor 테이블에 새로 INSERT
                  const insertParam = {
                    search_data_version_id : DATA_VERSION_ID,
                    search_rid_long: doctorData.rid_long,
                    search_doctorname: doctorData.doctorname
                  };
                  const insertQuery = mybatisMapper.getStatement("controler", "insert_new_doctor", insertParam, format);
                  
                  console.log(` -> [Step 2: INSERT] Executing for ${doctorData.doctorname}...`);
                  const { DBError: insertDBError, RS: insertRS } = await daoMysql.spCall(insertQuery);
                  console.log(` -> [Step 2: INSERT] Done.`);
                  const insertRet = await functions.myBatisResult(insertDBError, insertRS);

                  if (insertRet.success && insertRet.data.insertId) {
                    doctorId = insertRet.data.insertId;
                    console.log(`    - New Doctor ID created: ${doctorId}`);
                  } else {
                    throw new Error('Failed to insert new doctor or get insertId.');
                  }
                }

                if (doctorId) {
                  step = 'update_doctor_basic_did';
                  // 3. doctor_basic 테이블에 doctor_id 업데이트
                  const updateDidParam = { doctor_id: doctorId, search_rid_long: doctorData.rid_long };
                  const updateDidQuery = mybatisMapper.getStatement("controler", "update_doctor_basic_did", updateDidParam, format);

                  console.log(` -> [Step 3: UPDATE] Executing for ${doctorData.doctorname}...`);
                  const { DBError: updateDidDBError, RS: updateDidRS } = await daoMysql.spCall(updateDidQuery);
                  console.log(` -> [Step 3: UPDATE] Done.`);
                  const updateDidRet = await functions.myBatisResult(updateDidDBError, updateDidRS);

                  if (updateDidRet.success) {
                    console.log(`    - Successfully updated doctor_basic.`);
                    // 모든 DB 작업 성공 시 파일 이동
                    updatedDoctors++;
                    const completeDir = path.join(__dirname, 'completedata', hospitalDir);
                    if (!fs.existsSync(completeDir)) {
                      fs.mkdirSync(completeDir, { recursive: true });
                    }
                    const newFilePath = path.join(completeDir, file);
                    fs.renameSync(filePath, newFilePath);
                    console.log(`    - File moved to completedata.`);
                  } else {
                    throw new Error('Failed to update doctor_basic_did.');
                  }
                } else {
                  throw new Error('Failed to get doctor_id.');
                }
              }
            } catch (e) {
              console.error(`[ERROR] Failed processing file ${file}.`);
              failedDoctors.push({ name: doctorData.doctorname, rid_long: doctorData.rid_long, reason: `Error at step: ${step} - ${e.message}` });
            }
          }
        }
      }
    }

    return res.send({
      code: 200,
      success: true,
      message: `Total processed files: ${processedFiles}, Updated doctors: ${updatedDoctors}, Failed doctors: ${failedDoctors.length}`,
      failed_doctors: failedDoctors
    });

  } catch (error) {
    console.error('Error in /save-notmatch:', error.message);
    res.status(500).send('An error occurred during the save-notmatch process: ' + error.message);
  }
});


/**
 * @swagger
 *  /v1/c/crawling_did_link/save-match:
 *    post:
 *      summary: "match된 의사 데이터베이스에 저장"
 *      description: "AI가 동일인물로 판단한 의사의 과거 이력을 DB에 연결하고 저장합니다."
 *      tags: [crawling_did_link-3차병원 DID작업]
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
 *          description: 작업 성공
 */
router.post('/save-match', async function(req, res) {
  mybatisMapper.createMapper([`${global.appRoot}/services/crawling_did_link/controler.xml`]);
  const HOSPITAL_ID = req.body.hid;
  if (CS.isEmpty(HOSPITAL_ID)) { 
    return res.json(TS.fail({ code: 'DATA_NULL', message: 'hid is required' })) 
  }

  const dataDir = path.join(__dirname, 'data', HOSPITAL_ID);
  if (!fs.existsSync(dataDir)) {
    return res.status(404).send(`Directory not found for hid: ${HOSPITAL_ID}`);
  }

  let processedFiles = 0;
  let updatedDoctors = 0;
  let failedDoctors = [];

  try {
    const files = fs.readdirSync(dataDir);

    for (const file of files) {
      if (file.endsWith('_notmatch.json')) {
        continue; // _notmatch 파일은 건너뜁니다.
      }

      processedFiles++;
      const filePath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const doctorData = JSON.parse(fileContent);

      // isResult.result가 'match'인 경우에만 처리
      if (doctorData.isResult && doctorData.isResult.result === 'match') {
        try {
          const newDoctorInfo = doctorData.summaryData;
          const oldDoctorInfo = doctorData.isResult.userInfo;

          const params = {
            search_rid_long: newDoctorInfo.rid_long, // 새 의사 정보
            target_rid_long: oldDoctorInfo.rid_long  // 과거 이력 정보
          };

          console.log(`[Processing Match]: ${newDoctorInfo.doctorname}`);
          console.log(`  -> New Record (search_rid_long): ${params.search_rid_long}`);
          console.log(`  -> Old Record (target_rid_long): ${params.target_rid_long}`);
          
          // TODO: 여기에 3단계 DB 업데이트 로직 구현
          // 1. target rid의 doctor_id를 가져온다 이때 없으면 이는 신규로 만들어서 이전 save-notmatch에서 신규 생성 프로세스를 진행해야 한다 있으면 target_doctor_id 변수에 할당
          // 2. target의 데이터베이스 정보를 업데이트 한다 
          //   2.1 doctor_basic is_active = 0 으로 바꿔줘야 한다.
          // 3. search의 데이터베이스 정보를 업데이트 한다
          //   3.1 doctor_basic테이블의 prev_id컬럼에 target의 rid_long, doctor_id를 위 todo 1번에가 가져온 값을 update
          //   3.2 doctor 테이블, 위의 todo 1번의 doctor_id에 해당하는 rid_long을 search의 rid_long으로 업데이트한다 
          // 3. update_new_doctor_for_patientreviewtable 
          console.log('  -> (Placeholder) Executing 3-step database updates...');

          // DB 작업이 성공했다고 가정
          const dbSuccess = true; 
          if (dbSuccess) {
            updatedDoctors++;
            const completeDir = path.join(__dirname, 'completedata', HOSPITAL_ID);
            if (!fs.existsSync(completeDir)) {
              fs.mkdirSync(completeDir, { recursive: true });
            }
            const newFilePath = path.join(completeDir, file);
            fs.renameSync(filePath, newFilePath);
            console.log(`  -> File moved to completedata.`);
          }

        } catch (e) {
          failedDoctors.push({ name: (doctorData.summaryData.doctorname || file), reason: e.message });
        }
      }
    }

    return res.send({
      code: 200,
      success: true,
      message: `Total files checked: ${processedFiles}, Matched doctors processed: ${updatedDoctors}, Failures: ${failedDoctors.length}`,
      failed_doctors: failedDoctors
    });

  } catch (error) {
    console.error('Error in /save-match:', error.message);
    res.status(500).send('An error occurred during the save-match process: ' + error.message);
  }
});

module.exports = router;
