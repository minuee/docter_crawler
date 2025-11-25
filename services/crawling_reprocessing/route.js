
const crawlingCtrl = require(`${global.appRoot}/services/crawling_pubmed/controller`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const TS = require(`${global.appRoot}/server/middleware/message.handler`);
const express = require('express');
const asyncify = require('express-asyncify');
const crypto = require('crypto');
const _ = require('lodash');
const router = asyncify(express.Router());
const functions = require(`${global.appRoot}/server/util/function`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const mybatisMapper = require("mybatis-mapper");
const fs = require('fs');
const path = require('path');
module.exports = router;

const TMP_PASSWORD = "1234";
const DATA_VERSION_ID = process.env.DATA_VERSION_ID ?  parseInt(process.env.DATA_VERSION_ID) : 2;
console.log("DATA_VERSION_ID", DATA_VERSION_ID)


/**
 * @swagger
 *  /v1/c/crawling_reporcessing/make-resume:
 *    post:
 *      summary: "병원데이터 후가공 - 경력분리"
 *      description: "수집된 의사 경력을 경력/학력/기타로 분리 "
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "data_version_id, hid는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - data_version_id
 *             - hid
 *           properties:
 *             data_version_id:
 *               type: string
 *             hid:
 *               type: string
 *      responses:
 *        "200":
 *          description: 병원데이터 후가공 
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


router.post('/make-resume', async (req, res, next) => {
 
  const data_version_id = req.body.data_version_id;
  const hid = req.body.hid;

  console.log(`data_version_id : ${data_version_id}, hid : ${hid}`)

  let totalCount = 0;
  let processCount = 0;
  let processNullCount = 0;
  let processFailCount =0;
  const successData = [];
  const failData = [];
  const nullData = [];
  // 유사 type 그룹
  const typeValueGroups = [
    ['학력', '학력사항'], //학력 education
    ['경력', '경력 및 연수', '연수', '교육 및 연구경력'], // 경력 career
    ['수상','수상내역', '수상', '수상경력'], // 그외 etc
    ['학술','학술활동',  '기타 학술 관련 경력'],// 그외 etc
    ['언론','TV/방송',  '언론보도', '언론기사'],// 그외 etc
    ['저서', '집필저서','저서/논문','논문/저서'],// 그외 etc
    ['학회','학회활동'],// 그외 etc
    ['논문','논문저서','논문/저서','논문'],// 그외 etc
    ['연구','연구분야'],// 그외 etc
    ['참고','참고사항'],// 그외 etc
    ['진료', '진료분야'],// 그외 etc
  ]

  // 유사 키 그룹
  const keyGroups = [
    ['type', 'title'],
    ['action','text', 'description'],
    ['url', 'url'],
    ['period','startYear',  'staYear', 'endYear', 'targetDate', 'TargetDate','date', 'startDate', 'endDate' ],
  ]
  const keyDescription = {
    "type" : "분류",  // 필수값으로 위의 typeValueGroups 이걸 참고 
    "targetDate" : "일자", // 이 key는 일괄 date로 변경
    "date" : "일자",
    "text" : "내용", //
    "title" : "내용", // 내용과 동일한 key로 일괄 text로 변경
    "url" : "사이트주소",
    "issuer"  : "발행처"

  }
  try{
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);

    const param = {
      search_rid_long : null,//'1FB50436AB3F03B126FBE3C89166EA1638A34E0CA7FA1EE0D89451A4AD25DB2A96B7C94DFD500E99FE3F793374EC418D138594572CA3B50B5712D9F91A90D9ABB4F67A5695BD5EEF417CEDA64AF3EC03',
      search_version_id : data_version_id,
      search_hid : hid
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
      "sql",
      "select_doctor_career_data",
      param,
      format
    );
    //console.log(`query : ${query}`)
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    //console.log(`RS : ${RS}`)
    totalCount = _.size(RS);
    console.log(`totalCount : ${totalCount}`)
    let SP0 = null;
    const P1 = {
      data : RS
    };
    for (let i = 0; i < totalCount; i++) {
      const rid_long = P1.data[i].rid_long;
      const doctorName = P1.data[i].doctorname;
      const jsondata = P1.data[i].jsondata;
      console.log(`target ${i}번째 doctorName > ${doctorName}`)

      
      if(!functions.isEmpty(jsondata) && jsondata != '[]' ) {

        // jsondata의 값을 읽어서 배열화하고 순회
        const historyList = JSON.parse(jsondata);
        let educationList = [];
        let careerList = [];
        let etcList = [];

        for (let j = 0; j < historyList.length; j++) {
          const eachCareerObject = historyList[j]
          if ( eachCareerObject?.type == undefined ) { // type 키값이 없으면 스킵처리 
            continue;
          }
          
          //여기서 json데이터를 분리작업한다  목표 경력(career), 학력(education), 기타(etc)         
          // 1. Determine the category
          const rawType = eachCareerObject.type;
          let category = 'etc'; // Default category
          if (typeValueGroups[0].includes(rawType)) {
            category = 'education';
          } else if (typeValueGroups[1].includes(rawType)) {
            category = 'career';
          }
          
          // 사용자가 요청한 로직 : type가 경력인데 text의 내용중에 졸업, 학사, 박사, 석사 이런 문구가 있으면 이건 학력으로 옮겨야 되거든
          /* if (category === 'career') {
            const educationKeywords = ['졸업', '학사', '박사', '석사'];
            const textContent = eachCareerObject.text || eachCareerObject.title || '';
            if (educationKeywords.some(keyword => textContent.includes(keyword))) {
              console.log(`career to education > ${doctorName}, textContent : ${textContent}`)
              category = 'education';
              eachCareerObject.type = '학력';
            }
          } */

          // 2. Normalize the object keys based on comments
          const normalizedObject = {};
          for (const key in eachCareerObject) {
            const value = eachCareerObject[key];
            let newKey = key; // 기본적으로 원래 키를 사용

            // keyGroups에서 일치하는 키를 찾아 첫 번째 키로 변경
            for (const group of keyGroups) {
              if (group.includes(key)) {
                newKey = group[0];
                break;
              }
            }
            normalizedObject[newKey] = value;
          }

          // 3. Standardize the 'type' value itself to the representative value
          for (const group of typeValueGroups) {
            if (group.includes(normalizedObject.type)) {
              normalizedObject.type = group[0]; // Set to the first item in the group
              break;
            }
          }
          
          // 4. Push the normalized object to the correct list
          switch (category) {
            case 'education':
              educationList.push(normalizedObject);
              break;
            case 'career':
              careerList.push(normalizedObject);
              break;
            case 'etc':
            default:
              etcList.push(normalizedObject);
              break;
          }        
        }

        let educations_str = educationList;//JSON.stringify(educationList);
        let careers_str = careerList;//JSON.stringify(careerList);
        let etcs_str = etcList;//JSON.stringify(etcList);
        const param2 = {
          educations_str,
          careers_str,
          etcs_str,
          target_rid_long : rid_long
        }; 
        const format2 = { language: "sql", indent: "  " };
        const update_query = mybatisMapper.getStatement(
          "sql",
          "update_doctor_career_updatedate",
          param2,
          format2
        );

        const { DBError: updateCareerDBError, RS: updateCareerRS } = await daoMysql.spCall(update_query);
        const updateCareerRet = await functions.myBatisResult(updateCareerDBError, updateCareerRS);
        if (updateCareerRet.success) {
          console.log(`sucess doctorName > ${doctorName}`)
          processCount++;
          successData.push({
            hid,
            data_version_id,
            doctorName,
            rid_long
          })
        } else {
          console.log(`fail doctorName > ${doctorName}`)
          processFailCount++;
          failData.push({
            hid,
            data_version_id,
            doctorName,
            rid_long
          })
        }
      }else{
        console.log(`null doctorName > ${doctorName}`)
        processNullCount++;
        nullData.push({
          hid,
          data_version_id,
          doctorName,
          rid_long
        })
      }
      await CS.wait(1000); // 1초 딜레이 시킨다 
    } // for loop end

    const outputDir = path.join(__dirname, 'completedata');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `list_${hid}.json`);
    const outputData = {
      successData,
      failData,
      nullData
    };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log(`processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`)
    return res.send({
      code: 200,
      success: true,
      message:`processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`
    });
  }catch(e){
    console.error(`error 1111: ${e}`)
    return res.json(TS.fail("논문 수집 DB fail."));
  }
});


 
/**
 * @swagger
 *  /v1/c/crawling_reporcessing/make-revert:
 *    post:
 *      summary: "병원데이터 후가공 - 경력합치기"
 *      description: "이미 수집된 의사의  경력/학력/기타를 하나의 jsondata로 merge"
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "rid는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - rid
 *           properties:
 *             rid:
 *               type: string
 *      responses:
 *        "200":
 *          description: 병원데이터 후가공 
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


router.post('/make-revert', async (req, res, next) => {
  const { rid } = req.body;

  if (!rid) {
    return res.status(400).json(TS.fail('rid_long is required in the request body.'));
  }

  try {
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);

    // 1. Select the data
    const selectParam = { search_rid_long: rid };
    const selectQuery = mybatisMapper.getStatement("sql", "select_doctor_revert_career_data", selectParam, { language: "sql", indent: "  " });
    const { DBError: selectDBError, RS: selectRS } = await daoMysql.spCall(selectQuery);

    if (selectDBError || !selectRS || selectRS.length === 0) {
      console.error(`Error selecting data for rid_long: ${rid}`, selectDBError);
      return res.status(404).json(TS.fail('Failed to fetch doctor career data or no data found.'));
    }

    const doctorData = selectRS[0];

    // 2. Merge the data from text columns
    const educationList = JSON.parse(doctorData.education || '[]');
    const careerList = JSON.parse(doctorData.career || '[]');
    const etcList = JSON.parse(doctorData.etc || '[]');
    const mergedList = [...educationList, ...careerList, ...etcList];

    // 3. Update the jsondata column
    const updateParam = {
      jsondata_str: mergedList, // Pass the array object directly, matching the SQL parameter name
      target_rid_long: rid
    };
    const updateQuery = mybatisMapper.getStatement("sql", "update_doctor_revert_career_updatedate", updateParam, { language: "sql", indent: "  " });
    const { DBError: updateDBError, RS: updateRS } = await daoMysql.spCall(updateQuery);
    const updateRet = await functions.myBatisResult(updateDBError, updateRS);

    if (updateRet.success) {
      return res.json(TS.success({ message: `Successfully reverted jsondata for rid_long: ${rid}` }));
    } else {
      console.error(`Error updating data for rid_long: ${rid}`, updateDBError);
      return res.status(500).json(TS.fail('Failed to update doctor career data.'));
    }

  } catch (e) {
    console.error(`Error in /make-revert: ${e}`);
    return res.status(500).json(TS.fail("An unexpected error occurred during the revert process."));
  }
});
