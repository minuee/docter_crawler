
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/openAPI_data.go.kr/controller`);
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
const xlsx = require('xlsx');
const _ = require('lodash');
const path = require('path');
const router = asyncify(express.Router());
module.exports = router;




router.post('/type02', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  const data = [];
  const yGiho = null
  let result = null
  const P0 = await crawlingCtrl.get_yGiho_link()
  if (P0.data) {
    console.log(`P0.data : ${P0.data}`)

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








