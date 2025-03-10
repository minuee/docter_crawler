
const config = require(`../../server/config/configuration`);
const ctrl = require(`./controller`);
const CS = require(`../../server/util/util.casting`);
const RM = require(`../../server/util/response.message`);
const TS = require(`../../server/middleware/message.handler`);
const AUTH = require(`../../server/middleware/auth.handler`);
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
  let procCount = 0
  const data = [];
  const SP1 = await ctrl.Process01()
  if (SP1) {
    console.log(`SP1.data`, SP1.data)
  }
  const loopingData = SP1.data
  let doctorCount = 0;
  for (let index = 0; index < _.size(loopingData); index++) {
    await CS.wait(4000);
    const element = loopingData[index];
    procCount = procCount + 1
    if (element.link) {
      const SP2 = await ctrl.Process02(element.link)
      if (SP2.data) {
        console.log(`SP2.data >> `, SP2.data)
        for (let index = 0; index < _.size(SP2.data); index++) {
          const element2 = SP2.data[index];
          // rid 만들기
          await CS.wait(300);
          const SP3 = await ctrl.get_rid_encrypt(element2.doctorName, element2.link);
          if (SP3.error) {
            console.log("SP3 DB fail.");
            return res.json(TS.fail("SP3 DB fail."));
          }
          const tempRid = SP3.data[0].rid_encrypt
          const hid = 'H01KR-11000004' // 고려대 안암
          if(tempRid){
            doctorCount++;
            console.log(`tempRid`, tempRid)
            await CS.wait(300);
            const SP4 = await ctrl.setCrawlingDoctorLink(tempRid, hid, element2.deptName, element2.doctorName, element2.link)
            if(SP4.data){
              console.log(`입력완료`)
            }else{
              console.log(`입력실패`)
            }
          }else{
            console.log(`tempRid`, `가 없습니다.`)
          }
        }
      }
    }
  }

  ctrl.closeBrowser();

  let result = procCount
  return res.json(TS.success({deptCount: result, doctorCount}));
});


router.post('/step02', async (req, res, next) => {
  const ip = req.clientIp;
  const P1 = await ctrl.getCrawlingDoctorLink('H01KR-11000004');
  let totalCount = 0
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  console.log(`loopSize: `, loopSize)

  if( loopSize > 0 ) {
    ctrl.openBrowser();
  }

  for (let i = 0; i < loopSize; i++) {
    const item = P1.data[i]
    // rid, hid, deptname, doctorname, createdate, accessdate, count, isuse, url
    await CS.wait(4000);
    const SP1 = await ctrl.Process03(item.url);
    console.log(`SP1.data.basic.doctorName >>>>>>>>>>>>>>>`, SP1.data.basic.doctorName)
    const doctorname = SP1.data.basic.doctorName ? SP1.data.basic.doctorName : null
    const refUrl = item.url ? item.url : null
    if (doctorname && refUrl) {
      console.log(`here`)
      totalCount = totalCount + 1

      await CS.wait(300);
      const SP2 = await ctrl.get_rid_encrypt(doctorname, refUrl);
      if (SP2.error) {
        console.log("SP2 DB fail.");
        return res.json(TS.fail("SP2 DB fail."));
      }
  
      const tempRid = SP2.data[0].rid_encrypt
      await CS.wait(300);
      const SP3 = await ctrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000004', SP1.data.basic.deptName, SP1.data.basic.doctorName, SP1.data.basic.specialty, SP1.data.basic.profileImgUrl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }

      await CS.wait(300);
      const SP4 = await ctrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000004', SP1.data.basic.doctorName, JSON.stringify(SP1.data.detail));
      if (SP4.error) {
        console.log("SP4 DB fail.");
        return res.json(TS.fail("SP4 DB fail."));
      }
 
      const treastise = SP1.data.treatise
      if(_.size(treastise) > 0){
        for (let index = 0; index < _.size(treastise); index++) {
          const element = treastise[index];
          const iD = {
            rid: tempRid,
            title: element.title,
            doi: element.doi? element.doi : null,
            journalName: element.journalName? element.journalName : null,
            authorRule: element.authorRule? element.authorRule : null,
            publicationDate: element.publicationDate? element.publicationDate : null,
            url: element.url? element.url : null,
            abstract: element.abstract? element.abstract : null,
            keywords: element.keywords? element.keywords : null,
            impactFactor: element.impactFactor? element.impactFactor : null,
            totalCitations: element.totalCitations? element.totalCitations : null,
            referencesThesis: element.referencesThesis? element.referencesThesis : null,
            doctorName: doctorname,
            authorName: element.authorName? element.authorName : null,
            subjectClassification: element.subjectClassification? element.subjectClassification: null,
            publicationLocation: element.publicationLocation? element.publicationLocation: null
          }
          await CS.wait(300);
          const SP5 = await ctrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
          if (SP5.error) {
            console.log(`SP5 DB fail.`);
            console.log(`Error on ${doctorname}`)
          }
        }
      }
    }
  }

  ctrl.closeBrowser();
  
  let result = totalCount
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