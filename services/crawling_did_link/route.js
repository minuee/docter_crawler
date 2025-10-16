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
 *      summary: "1단계  조회"
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
    
    for ( i = 0; i < ret?.data.length ; i++ ) {
      const summaryData = ret.data[i];
      totalDoctorCount++;
      console.log(`hid : ${summaryData?.hid},deptname : ${summaryData?.deptname},doctorname : ${summaryData?.doctorname}`)
      if ( summaryData != null ) {
        const param2 = {
          pass_rid : summaryData?.rid,
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
        console.log(`summaryData2 : ${summaryData2}`);
        if ( summaryData2 != null ) {
          // AI 분석을 위한 요청 파일 생성
          try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `ai_analysis_request_${timestamp}_${summaryData.rid.toString('hex')}.json`;
            const dirPath = path.join(__dirname, 'data');
            const filePath = path.join(dirPath, fileName);

            const analysisData = {
              summaryData: summaryData,
              summaryData2: summaryData2
            };

            fs.writeFileSync(filePath, JSON.stringify(analysisData, null, 2));
            console.log(`[AI 분석 요청 생성] 파일: ${fileName}`);

          } catch (e) {
            console.error(`[AI 분석 요청 파일 생성 실패] rid: ${summaryData.rid}, error: ${e.message}`);
          }

        } else {
          /* 동일한 이름의 의사가 없으므로 단계 패스 */
          console.log(`[신규 추정] 대상: ${summaryData.doctorname}(${summaryData.deptname}, rid:${summaryData.rid}) -> 시스템에 동명이인이 없습니다.`);
          NonUpdateDoctorList.push(summaryData);
        }
      }
    }
    //console.log(`검색된 의사수 : ${totalDoctorCount}, 찾아낸 의사수 : ${_.size(UpdateDcotorList)}, 없는 의사수 : ${_.size(NonUpdateDoctorList)}`);
    return res.send({
      code: 200,
      success: true,
      //message: `검색된 의사수 : ${totalDoctorCount}, 찾아낸 의사수 : ${_.size(UpdateDcotorList)}, 없는 의사수 : ${_.size(NonUpdateDoctorList)}`
    });
  } catch (error) {
    console.error('Error in  :', error.message);
    res.status(500).send('An error occurred during the get all hid process: ' + error.message);
  }
});

module.exports = router;
