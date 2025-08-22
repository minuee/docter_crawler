const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/openAPI_data.go.kr/controller`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const TS = require(`${global.appRoot}/server/middleware/message.handler`);
const AUTH = require(`${global.appRoot}/server/middleware/auth.handler`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const mybatisMapper = require("mybatis-mapper");
const functions = require(`${global.appRoot}/server/util/function`);
const express = require('express');
const asyncify = require('express-asyncify');
const moment = require('moment-timezone');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx'); 
const _ = require('lodash');
const path = require('path');
const router = asyncify(express.Router());
const xml2js = require('xml2js');
const parser = new xml2js.Parser({ explicitArray: false });
/**
 * @swagger
 *  /v1/c/open.go.kr/healthcheck:
 *    get:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [OpenAPI_data.go.kr-공공정보]
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
 *  /v1/c/open.go.kr/hospital:
 *    get:
 *      summary: "병원리스트 조회"
 *      description: "병원정보 가져오기"
 *      tags: [OpenAPI_data.go.kr-공공정보]
 *      responses:
 *        "200":
 *          description: 공공데이터 병원정보가져오기
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

router.get('/hospital', async (req, res, next) => {

  // 공공데이터포털 API 키
  const serviceKey = 'e7haGJX%2BVphQb%2B3Q%2FSqH8QgJtWFeokI1NWHKlKIYGfS6OxJ1EeYZ6Pp5cjAFV2xA7OzOORLLdwg0tZ2kwClFDw%3D%3D';
  //40551110  
  const NUM_OF_ROWS = 100;
  const MAX_PAGE = 200;//200부터 처리해야함
  let list_cnt = 0;
  let list_success_cnt = 0;
  try {
    for (let page = 1; page <= MAX_PAGE; page++) {
      const url = `https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?ServiceKey=${serviceKey}&pageNo=${page}&numOfRows=${NUM_OF_ROWS}&_type=json&clCd=51`;
      const response = await axios.get(url);
      const body = response.data?.response?.body;
      let items = body?.items?.item;
      if (!items) {
        console.log(`items`,items);
        console.warn("⚠️ 병원 데이터가 없습니다.");
      } else if (!Array.isArray(items)) {
        // 단일 객체인 경우 배열로 감싸기
        items = [items];
      }

      for (const hospital of items) {
        console.log(`hospital?.clCd`,hospital?.clCd, ['01',41,29,11,28,21,51,31].includes(hospital?.clCd));
        const P1 = await crawlingCtrl.saveToDatabase(hospital); // 👉 여기에서 저장 실행
        // console.log(`P1.success`,);
        if ( P1.success ) {
          list_success_cnt++;
        }
        list_cnt++;
        await CS.wait(500); // 2초정도로
 
      } 
      
      console.log(`✅ ${page} 페이지 처리 완료`);
      await CS.wait(3000); // 5초정도로
    }
    console.error(`수집된 병원수 : ${list_cnt}, 정상저장 병원수 : ${list_success_cnt}`);
    return res.send({
      code : 200,
      success: true,
      message: `수집된 병원수 : ${list_cnt}, 정상저장 병원수 : ${list_success_cnt}`
    });
  } catch (error) {
    console.error('에러 발생:', error.message);
    res.status(500).send('데이터 수집 중 오류 발생');
  }
  
});



/**
 * @swagger
 *  /v1/c/open.go.kr/make-hid:
 *    get:
 *      summary: "병원리스트 hid생성프로세스"
 *      description: "병원정보 가져오기"
 *      tags: [OpenAPI_data.go.kr-공공정보]
 *      responses:
 *        "200":
 *          description: hospital 데이터 넣기 hid생성프로세스
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

router.get('/make-hid', async function(req, res) {   

  function zeroFill(num, length = 6) {
    return String(num).padStart(length, '0');
  }
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/openAPI_data.go.kr/controler.xml`]);
  let list_target_cnt = 0;
  let list_success_cnt = 0;
  try {
    const param = {
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
        "controler",
        "select_origin_hospital",
        param,
        format
    );
    //console.log(`query : ${query}`)
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    
    const ret = await  functions.myBatisResult(DBError,RS)
    //console.log(`ret : ${JSON.stringify(ret.data[0])}`)
    for ( i = 0; i < ret?.data.length ; i++ ) {
      const summaryData = ret.data?.length > 0 ?  ret.data[i] : null;
      //console.log(`summaryData : ${JSON.stringify(summaryData)}`)
      if ( summaryData != null ) {
        const param2 = {
          h_class_code : summaryData?.hospital_class_code,
          h_sidocodetwo : summaryData?.sidocodetwo,
        }; 
        const format2 = { language: "sql", indent: "  " };
        const query2 = mybatisMapper.getStatement(
            "controler",
            "select_origin_hospital_summary",
            param2 ,
            format2
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query2);
        //console.log(`RS : ${RS}`)
        const ret2 = await  functions.myBatisResult(DBError,RS)
        //console.log(`ret2 : ${JSON.stringify(ret2.data[0])}`)
        const summaryData2 = ret2.data?.length > 0 ?  ret2.data[0] : null;
        //console.log(`summaryData2 : ${JSON.stringify(summaryData2)}`)
        if ( summaryData2 != null ) {
          try {
            const newZerifill = zeroFill(summaryData2?.newNo);
            const newHid = `H${summaryData?.hospital_class_code}KR-${summaryData?.sidocodetwo}${newZerifill}`;
            const param3 = {
              new_hid : newHid,
              h_class_code : summaryData?.hospital_class_code,
              h_sidocodetwo : summaryData?.sidocodetwo,
              h_name : summaryData?.hospital_name,
              h_address : summaryData?.hospital_addr,
              h_lon : summaryData?.hospital_lon,
              h_lat : summaryData?.hospital_lat,
              h_tel : summaryData?.hospital_tel,
              h_ykiho : summaryData?.yoyang_giho
            }; 
            //console.log(`param3 :  ${JSON.stringify(param3)}`)
            const format3 = { language: "sql", indent: "  " };
            const query3 = mybatisMapper.getStatement(
                "controler",
                "makeHospitalId",
                param3,
                format3
            );
            const { DBError = null, RS = null } = await daoMysql.spCall(query3);
            const ret3 = await  functions.myBatisResult(DBError,RS);
            list_target_cnt++;
            if ( ret3.success ) {
              list_success_cnt++;
            }
          }catch(e){
              console.error(`error : ${e}`)
              return { success : false,error: e, data: [] };
          }
        }
      }
      await CS.wait(500); 
    }
    return res.send({
      code : 200,
      success: true,
      message: `대상 병원수 : ${list_target_cnt}, 정상저장 병원수 : ${list_success_cnt}`
    });
  } catch (error) {
    console.error('에러 발생:', error.message);
    res.status(500).send('데이터 수집 중 오류 발생');
  }
});



/**
 * @swagger
 *  /v1/c/open.go.kr/make-hospital-alias:
 *    get:
 *      summary: "병원명 별칭 리스트 생성"
 *      description: "병원정보 가져오기"
 *      tags: [OpenAPI_data.go.kr-공공정보]
 *      responses:
 *        "200":
 *          description: hospital 데이터 넣기 hid생성프로세스
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

router.get('/make-hospital-alias', async function(req, res) {   

  function generateAliasCandidates(name) {
    let candidates = new Set();

    // 원본 그대로
    candidates.add(name);
    // 0. 괄호 내용 추출
    const branchMatch = name.match(/\((.*?)\)/);
    const branchName = branchMatch ? branchMatch[1] : null;

    // 1. 불필요 수식어 제거
    const stripped = name
    .replace(/\(.*?\)/g, '') // 괄호 내용 제거
    .replace(/학교법인|의료법인|교육재단|학원|재단/g, '')
    .trim();

    candidates.add(stripped);
    
    // 2. 대학교 → 대
    if (stripped.includes('대학교')) {
      candidates.add(stripped.replace(/대학교/g, '대'));
    }

    // 3. 병원 제거
    if (stripped.includes('병원')) {
      candidates.add(stripped.replace(/병원/g, '').trim());
    }

    // 4. 대학교 → 대 + 병원 제거
    if (stripped.includes('대학교') && stripped.includes('병원')) {
      candidates.add(
        stripped.replace(/대학교/g, '대').replace(/병원/g, '').trim()
      );
    }

    // 5. 괄호 안 내용 추가
    if (branchName) {
      candidates.add(`${stripped.replace(/병원/g, '')}${branchName}병원`);
      candidates.add(`${stripped.replace(/대학교/g, '대').replace(/병원/g, '')}${branchName}병원`);
      candidates.add(`${branchName}병원`);
    }

    // 6. 공백 제거 버전
    Array.from(candidates).forEach(alias => {
      candidates.add(alias.replace(/\s+/g, ''));
    });

    return Array.from(candidates);
  }
  //mapper 경로
  mybatisMapper.createMapper([`${global.appRoot}/services/openAPI_data.go.kr/controler.xml`]);

  let list_target_cnt = 0;
  let list_success_cnt = 0;
  try {
    const param = {
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
        "controler",
        "select_table_hospital",
        param,
        format
    );
    //console.log(`query : ${query}`)
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    
    const ret = await  functions.myBatisResult(DBError,RS)
    console.log(`ret : ${JSON.stringify(ret.data[0])}`)
    for ( i = 0; i < ret?.data.length ; i++ ) {
      const hospotalData = ret.data?.length > 0 ?  ret.data[i] : null;
      console.log(`hospotalData : ${JSON.stringify(hospotalData)}`)
      if ( hospotalData != null ) {
        try {
          const aliasArray = await generateAliasCandidates(hospotalData?.baseName);
          for ( j = 0; j < aliasArray.length ; j++ ) {
            const param3 = {
              h_alias_name : aliasArray[j].replace("병원병원",'병원'),
              h_name : hospotalData?.baseName,
              h_hid : hospotalData?.hid,
            }; 
            console.log(`param3 :  ${JSON.stringify(param3)}`)
            const format3 = { language: "sql", indent: "  " };
            const query3 = mybatisMapper.getStatement(
                "controler",
                "makeHospitalAlias",
                param3,
                format3
            );
            //console.log(`query : ${query}`)
            const { DBError = null, RS = null } = await daoMysql.spCall(query3);
            const ret3 = await  functions.myBatisResult(DBError,RS)
            if ( ret3.success ) {
              list_success_cnt++;
            }
            list_target_cnt++;
          }
        }catch(e){
            console.error(`error : ${e}`)
            return { success : false,error: e, data: [] };
        }
      }
    }
    return res.send({
      code : 200,
      success: true,
      message: `조회된 병원수 : ${list_target_cnt}, 작업된 병원수 : ${list_success_cnt}`
    });
  } catch (error) {
    console.error('에러 발생:', error.message);
    res.status(500).send('데이터 수집 중 오류 발생');
  }
});


router.post('/type02', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  const data = [];
  const yGiho = null
  let result = null
  const P0 = await crawlingCtrl.get_yGiho_link()
  if (P0.data) {
    console.log(`P0.data : ${P0.data}`);
  }
  for (let index = 0; index < _.size(P0.data); index++) {
    const element = P0.data[index];
    const yKiho = element.yKiho
    if (yKiho) {
      await CS.wait(2000)
      const P1 = await crawlingCtrl.openGoApiType02(`http://apis.data.go.kr/B551182/exclInstHospAsmInfoService/getExclInstHospAsmInfo`, yKiho)
      if (P1.data) {
        console.log(`P1.data: >>>>>>`, P1.data)
        const resData = _.get(P1.data.response.body, 'items', null)
        console.log(`resData: >>>>>>`, resData)
        if (resData) {
          await CS.wait(300)
          // resData.item.yadmNm
          // element.baseName
          const T1 = await crawlingCtrl.xls2DBType03((element.hid ? element.hid : null), yKiho, resData.item.yadmNm, resData.item.asmGrd, resData.item.asmGrdNm, resData.item.asmNm, resData.item.yadmNm, 22024)
          if (T1) {
            console.log(`T1.data:>>>>>`, T1.data)
            data.push(T1.data)
          }
        } else {
          console.log(`${yKiho}> ${P0.data.baseName} > resData: >>>> null `)
        }
      }
    }
  }

  return res.json(TS.success(data));
});


/**
 * @swagger
 *  /v1/c/open.go.kr/type02:
 *    post:
 *      summary: "2단계 타입 조회"
 *      description: "공공정보를 가져와야 한다  "
 *      tags: [OpenAPI_data.go.kr-공공정보]
 *      produces:
 *      parameters:
 *        - name: "clientIp"
 *          in: "query"
 *          description: "input clientIp"
 *          required: true
 *          type: "string"
 
 *      responses:
 *        "200":
 *          description: type01
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
 * 
 */



router.post('/excel/type01', async (req, res, next) => {
  const ip = req.clientIp;
  const data = [];
  const filePath = path.join(__dirname, 'data', '병원평가정보 리스트_수정본.xls.xlsx');
  const workbook = xlsx.readFile(filePath);
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const expectedHeader = ['NO', '병원명', '평가항목', '평가등급', '소재지', '전화번호'];
    const header = rows[0];
    if (JSON.stringify(header) === JSON.stringify(expectedHeader)) {
      const dataRows = rows.slice(1);
      for (const row of dataRows) {
        const [no, hospitalName, evaluationItem, grade, location, phoneNumber] = row;
        try {
          const SP1 = await crawlingCtrl.xls2DBType01(sheetName, hospitalName, evaluationItem, grade, location, phoneNumber)
          console.log('Data inserted successfully for sheet:', sheetName);
        } catch (error) {
          console.error('Error inserting data:', error);
        }
      }
    } else {
      console.log(`Skipping sheet "${sheetName}" due to unexpected header format.`);
    }
  }
  let result = null
  return res.json(TS.success(result));

});


router.post('/excel/type02', async (req, res, next) => {
  const ip = req.clientIp;
  const data = [];
  const filePath = path.join(__dirname, 'data', '병원평가정보 리스트_수정본.xls.xlsx');
  const workbook = xlsx.readFile(filePath);
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const expectedHeader = [null, null, '고관절치환술', '췌장암수술', '식도암수술', '조혈모세포이식술', '위암', '간암'];
    const header = rows[1];
    if (JSON.stringify(header) === JSON.stringify(expectedHeader)) {
      const dataRows = rows.slice(1);
      for (const row of dataRows) {
        const [no, hospitalName, hipReplacement, pancreaticCancer, esophagealCancer, hematopoieticStemCellTransplant, stomachCancer, liverCancer, location, phoneNumber] = row;
        const evaluations = [
          { item: '고관절치환술', grade: hipReplacement },
          { item: '췌장암수술', grade: pancreaticCancer },
          { item: '식도암수술', grade: esophagealCancer },
          { item: '조혈모세포이식술', grade: hematopoieticStemCellTransplant },
          { item: '위암', grade: stomachCancer },
          { item: '간암', grade: liverCancer },
        ];
        for (const evaluation of evaluations) {
          const { item, grade } = evaluation;
          try {
            // await connection.query(query, [sheetName, hospitalName, item, grade, location, phoneNumber]);
            const SP1 = await crawlingCtrl.xls2DBType02(sheetName, hospitalName, item, grade, location, phoneNumber)
            console.log(`Looping Data : ${hospitalName} >>>>>>> ${item}-${grade}`)
            console.log('Data inserted successfully for:', hospitalName, item);
          } catch (error) {
            console.error('Error inserting data:', error);
          }
        }
      }
    } else {
      console.log(`Skipping sheet "${sheetName}" due to unexpected header format.`);
    }
  }
  let result = null
  return res.json(TS.success(result));

});



router.post('/excel/type03', async (req, res, next) => {
  const ip = req.clientIp;
  const data = [];
  const filePath = path.join(__dirname, 'data', '병원평가정보 리스트_수정본.xls.xlsx');
  const workbook = xlsx.readFile(filePath);
  // const sheetName = workbook.SheetNames[0]; // 첫 번째 시트만 사용한다고 가정
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    // 첫 번째 행이 예상한 헤더와 일치하는지 확인합니다.
    const expectedHeader = [null, null, null, '인공수정 지표', '체외수정 지표'];
    const header = rows[1];
    console.log(`header :>>>>>>>>>>> ${JSON.stringify(header)}`)
    console.log(`expectedHeader :>>>>>>>>>>> ${JSON.stringify(expectedHeader)}`)
    if (JSON.stringify(header) === JSON.stringify(expectedHeader)) {
      const dataRows = rows.slice(1);
      for (const row of dataRows) {
        const [no, hospitalName, types, data1, data2, location, phoneNumber] = row;
        const evaluations = [
          { item: '인공수정 지표', grade: data1 },
          { item: '체외수정 지표', grade: data2 }
        ];
        for (const evaluation of evaluations) {
          const { item, grade } = evaluation;
          try {
            const SP1 = await crawlingCtrl.xls2DBType01(sheetName, hospitalName, item, grade, location, phoneNumber)
            console.log(`Looping Data : ${hospitalName} >>>>>>> ${item}-${grade}`)
            console.log('Data inserted successfully for:', hospitalName, item);
          } catch (error) {
            console.error('Error inserting data:', error);
          }
        }
      }
    } else {
      console.log(`Skipping sheet "${sheetName}" due to unexpected header format.`);
    }
  }
  let result = null
  return res.json(TS.success(result));

});


router.post('/type01', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  const data = [];
  const P1 = await crawlingCtrl.openGoApiType01(`http://apis.data.go.kr/B551182/hospDiagInfoService1/getClinicTop5List1`)
  if (P1) {
    console.log(`P1.data = >>>>>>`)
    console.log(P1.data)
  }
  let result = P1.data
  return res.json(TS.success(result));
});

/**
 * @swagger
 *  /v1/c/open.go.kr/type01:
 *    post:
 *      summary: "1단계 타입 조회"
 *      description: "공공정보를 가져와야 한다  "
 *      tags: [OpenAPI_data.go.kr-공공정보]
 *      produces:
 *      parameters:
 *        - name: "clientIp"
 *          in: "query"
 *          description: "input clientIp"
 *          required: true
 *          type: "string"
 
 *      responses:
 *        "200":
 *          description: type01
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
 * 
 */

module.exports = router;