
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_samsunghospital.com/controller`);
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
  // if(CS.isEmpty(certKey)){return res.json(TS.fail({code: 'INSUFFICIENT_DATA', message: 'certKey'}))}
  // db transaction
  const data = [];
  const P0 = await crawlingCtrl.setTimeStamp();
  let fakeTimestamp = P0.data
  console.log(fakeTimestamp);
  fakeTimestamp = (new Date(fakeTimestamp + 1)).getTime();
  console.log(fakeTimestamp);
  fakeTimestamp = (new Date(fakeTimestamp + 1)).getTime();
  console.log(fakeTimestamp);
  fakeTimestamp = (new Date(fakeTimestamp + 1)).getTime();
  console.log(fakeTimestamp);

  const P1 = await crawlingCtrl.crwalingProcess01(fakeTimestamp);
  console.log(`links count : ${_.size(P1.data)}`)



  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(5000);
    fakeTimestamp = (new Date(fakeTimestamp + 1)).getTime();
    const SP1 = await crawlingCtrl.crwalingProcess02(`http://www.samsunghospital.com/home/reservation/doctorInfoList.do?cPage=1&SW=&SUB_DEPT_YN=A&DP_CODE=${P1.data[i].value}&DP_TYPE=O&FLAG=Y&_=${fakeTimestamp}`);
    // console.log(`Iteration ${i}: Result is ${SP1.data}`);
    if (!CS.isEmpty(SP1.data)) {
      for (let i = 0; i < _.size(SP1.data); i++) {
        data.push({
          hid: 'H01KR-11000005',
          deptName: SP1.data[i].deptName,
          doctorName: SP1.data[i].doctorName,
          url: SP1.data[i].url
        })
        await CS.wait(300);
        const SP2 = await crawlingCtrl.get_rid_encrypt(SP1.data[i].doctorName, SP1.data[i].url);
        if (SP2.error) {
          console.log("SP2 DB fail.");
          return res.json(TS.fail("SP2 DB fail."));
        }
        const tempRid = SP2.data[0].rid_encrypt
        await CS.wait(300);
        const SP3 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, 'H01KR-11000005', SP1.data[i].deptName, SP1.data[i].doctorName, SP1.data[i].url);
        // const SP3 = await crawlingCtrl.setCrawlingDoctorLink('H01KR-11000010', SP1.data[i].deptName, SP1.data[i].doctorName, SP1.data[i].url);
        if (SP3.error) console.log("SP3 DB upsert fail.");;
      }
    }
  }
  let result = data
  return res.json(TS.success(result));
});


router.post('/step02', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  // db transaction
  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000005');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)
  const loopSize = _.size(P1.data);
  // const loopSize = 1;
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(10000);
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
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000005', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(300);
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000005', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }

    if (_.size(SP1.data.treatise) > 0) {
      const resData = SP1.data.treatise
      console.log(`resData:${resData}`)
      for (let index = 0; index < _.size(resData); index++) {
        const element = resData[index];
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
          doctorName: SP1.data.doctorName,
          authorName: element.authorName,
          subjectClassification: element.subjectClassification,
          publicationLocation: element.publicationLocation
        }
        await CS.wait(300);
        const SP5 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
        if (SP5.error) {
          console.log(`SP5 DB fail.`);
          console.log(`Error on ${SP1.data.doctorName}`)
        }
      }

    }
  }
  let result = P1.data
  return res.json(TS.success(result));
});



router.post('/hospital/step03', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  // db transaction
  const P1 = await crawlingCtrl.get_crawling_doctor_mssing_link('H01KR-11000005');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)

  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(10000);
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
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000005', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(300);
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000005', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }
  }

  let result = P1.data
  return res.json(TS.success(result));
});



router.get('/info', AUTH.validation, async (req, res, next) => {
  const ip = req.clientIp;
  return res.json(TS.success(req.auth));
});