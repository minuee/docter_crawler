
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_cmcseoul.or.kr/controller`);
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
const router = asyncify(express.Router());
module.exports = router;




router.post('/step01', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  const data = [];
  const P1 = await crawlingCtrl.crwalingProcess01();
  console.log(`P1 links count : ${_.size(P1.data)}`)
  console.log(`P1.data`)
  console.log(P1.data)
  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000); // 10초 딜레이
    const SP1 = await crawlingCtrl.crwalingProcess02(P1.data[i]);
    const jsonData = JSON.parse(SP1.data)
    if (jsonData) {
      for (let ii = 0; ii < _.size(jsonData); ii++) {
        console.log(`jsonData[${ii}]: ${JSON.stringify(jsonData[ii])}`)
        await CS.wait(300);
        const SP2 = await crawlingCtrl.get_rid_encrypt(jsonData[ii].drName, `https://www.cmcseoul.or.kr/api/doctor/${jsonData[ii].doctorDept.deptCd}/${jsonData[ii].drNo}`);
        console.log(`loop ${[i]}-${[ii]}: ${jsonData[ii].deptNm} : ${jsonData[ii].drName}`)
        if (SP2.error) {
          console.log("SP2 DB fail.");
          return res.json(TS.fail("SP2 DB fail."));
        }
        const tempRid = SP2.data[0].rid_encrypt
        await CS.wait(300);
        const SP3 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, 'H01KR-11000013', jsonData[ii].deptNm, jsonData[ii].drName, `https://www.cmcseoul.or.kr/api/doctor/${jsonData[ii].doctorDept.deptCd}/${jsonData[ii].drNo}`);
        if (SP3.error) console.log("SP3 DB upsert fail.");
      }
    }
  }
  let result = jsonData
  return res.json(TS.success(result));
});

router.post('/step02', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  // db transaction
  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000013');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)
  const loopSize = _.size(P1.data);
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingProcess04(P1.data[i].url);
    const doctorname = SP1.data.doctorName ? SP1.data.doctorName : null
    const refUrl = P1.data[i].url ? P1.data[i].url : null

    if (doctorname && refUrl) {
      await CS.wait(300);
      const SP2 = await crawlingCtrl.get_rid_encrypt(doctorname, refUrl);
      if (SP2.error) {
        console.log("SP2 DB fail.");
        return res.json(TS.fail("SP2 DB fail."));
      }
      const tempRid = SP2.data[0].rid_encrypt
      if (CS.isEmpty(tempRid)) break;

      // DB upsert
      await CS.wait(300);
      const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000013', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }
      await CS.wait(300);
      const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000013', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
      if (SP4.error) {
        console.log("SP4 DB fail.");
        return res.json(TS.fail("SP4 DB fail."));
      }
    }
  }
  let result = loopSize
  return res.json(TS.success(result));
});

router.post('/hospital/step03', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  // db transaction
  const P1 = await crawlingCtrl.get_crawling_doctor_mssing_link('H01KR-11000013');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].url);
    // console.log(P1.data[i].url)
    const doctorname = SP1.data.doctorName ? SP1.data.doctorName : null
    const refUrl = P1.data[i].url ? P1.data[i].url : null
    if (!doctorname || !refUrl) {
      break;
    }
    await CS.wait(300);
    const SP2 = await crawlingCtrl.get_rid_encrypt(doctorname, refUrl);
    if (SP2.error) {
      console.log("SP2 DB fail.");
      return res.json(TS.fail("SP2 DB fail."));
    }
    const tempRid = SP2.data[0].rid_encrypt
    if (CS.isEmpty(tempRid)) break;
    await CS.wait(300);
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000013', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(300);
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000013', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }
  }

  let result = P1.data
  return res.json(TS.success(result));
});



router.post('/treatise', async (req, res, next) => {
  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000013');
  console.log(`total sie: ${_.size(P1.data)}`)
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  // const loopSize = 1;
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingtreatise(P1.data[i].url)
    if (_.size(SP1.data) > 0) {
      await CS.wait(300);
      const tempRid = P1.data[i].rid
      if (CS.isEmpty(tempRid)) break;
      for (let index = 0; index < _.size(SP1.data); index++) {
        const element = SP1.data[index];
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
          doctorName: element.doctorName,
          authorName: element.authorName,
          subjectClassification: element.subjectClassification,
          publicationLocation: element.publicationLocation
        }
        const SP6 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
        if (SP6.error) {
          console.log(`SP6 DB fail.`);
          console.log(`Error on ${P1.data[i].doctorName}`)
        }
      }
    }
  }
  let result = null
  return res.json(TS.success(result));

});



router.get('/info', AUTH.validation, async (req, res, next) => {
  const ip = req.clientIp;
  return res.json(TS.success(req.auth));
});