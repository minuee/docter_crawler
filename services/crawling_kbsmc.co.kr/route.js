
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_kbsmc.co.kr/controller`);
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
  const data = [];
  const P1 = await crawlingCtrl.crwalingProcess01();
  console.log(_.size(P1.data))
  if (P1.error) return res.json(TS.fail(P1.error));
  if (CS.isEmpty(P1.data)) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(500);
    const SP1 = await crawlingCtrl.crwalingProcess02(P1.data[i].link);
    if (!CS.isEmpty(SP1.data)) {
      for (let i = 0; i < _.size(SP1.data); i++) {
        data.push({
          hid: 'H01KR-11000001',
          deptName: SP1.data[i].deptName,
          doctorName: SP1.data[i].doctorName,
          url: SP1.data[i].url
        })
        await CS.wait(200);
        const SP0 = await crawlingCtrl.get_rid_encrypt(SP1.data[i].doctorName, SP1.data[i].url);
        if (SP0.error) {
          console.log("SP0 DB fail.");
          return res.json(TS.fail("SP0 DB fail."));
        }
        const tempRid = SP0.data[0].rid_encrypt


        const SP2 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, 'H01KR-11000001', SP1.data[i].deptName, SP1.data[i].doctorName, SP1.data[i].url);
        if (SP2.error) console.log("DB upsert fail.");;
      }
    } else {
      console.log(`loop ${i} result is null.`);
    }
  }

  let result = data
  return res.json(TS.success(result));
});

router.post('/step02', async (req, res, next) => {
  const ip = req.clientIp;

  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000001');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].url);
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
      await CS.wait(300);
      const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000001', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }
      await CS.wait(300);
      // console.log(SP1.data.biography)
      const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000001', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
      if (SP4.error) {
        console.log("SP4 DB fail.");
        return res.json(TS.fail("SP4 DB fail."));
      }
    }
  }
  let result = P1.data
  return res.json(TS.success(result));
});


router.post('/step03', async (req, res, next) => {
  const ip = req.clientIp;
  const P1 = await crawlingCtrl.get_crawling_doctor_mssing_link('H01KR-11000001');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].url);
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
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000001', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(200);
    // console.log(SP1.data.biography)
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000001', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }

  }

  let result = P1.data
  return res.json(TS.success(result));
});


router.post('/treatise', async (req, res, next) => {
  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000001');
  console.log(`total sie: ${_.size(P1.data)}`)
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  // const loopSize = 1;
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingtreatise(P1.data[i].url)
    if (_.size(SP1.data.biography) > 0) {
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
          doctorName: SP1.data.doctorName,
          authorName: null,
          subjectClassification: null,
          publicationLocation: null
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
