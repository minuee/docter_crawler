
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
  let maxPageNumber = 1
  const SP0 = await ctrl.Process00() // for maxPageNumber
  if (SP0) {
    //maxPageNumber
    console.log(`SP0.data(maxPageNumber) >>>`, SP0.data)
    if(SP0.data){
        maxPageNumber = SP0.data
    }
  }
  for (let index1 = 0; index1 < maxPageNumber; index1++) {
    const page = index1+1;
    console.log(`page >>>`, page)

    const SP1 = await ctrl.Process01(page)
    const loopingData = SP1.data

    for (let index = 0; index < _.size(loopingData); index++) {
        procCount = procCount + 1
        await CS.wait(4000);
        const element = loopingData[index];
            console.log(`element >>>`, element)
            
        if(element.link){
            const SP3 = await ctrl.get_rid_encrypt(element.doctorName, element.link);
            if (SP3.error) {
                console.log("SP3 DB fail.");
                return res.json(TS.fail("SP3 DB fail."));
            }
            const tempRid = SP3.data[0].rid_encrypt
            const hid = 'H01KR-11000011' // 중앙대학교 병원
            if(tempRid){
                console.log(`tempRid >>>>>`, tempRid)
                await CS.wait(300);
                const SP4 = await ctrl.setCrawlingDoctorLink(tempRid, hid, element.deptName, element.doctorName, element.link)
                    if(SP4.data){
                        console.log(`DB inserted`)
                    }else{
                        console.log(`DB insert fail`)
                    }
            }else{
                console.log(`tempRid >>>>>`, `null`)
            }
        }
      }
  }
  let result = procCount
  return res.json(TS.success(result));
});


router.post('/step02', async (req, res, next) => {
  const ip = req.clientIp;
  const P1 = await ctrl.getCrawlingDoctorLink('H01KR-11000011');
  let totalCount = 0
  // https://www.kuh.ac.kr/doctor/basicInfo.do?dr_sid=20100170&dept_cd=000397
  // console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  console.log(`loopSize: `, loopSize)
  for (let i = 0; i < loopSize; i++) {
    const item = P1.data[i]
    // rid, hid, deptname, doctorname, createdate, accessdate, count, isuse, url
    await CS.wait(3000);
    const SP1 = await ctrl.Process03(item.url);

    console.log(`SP1.data.basic.doctorName >>>>>>>>>>>>>>>`, SP1.data.basic.doctorName)
    const doctorname = SP1.data.basic.doctorName ? SP1.data.basic.doctorName : null
    const refUrl = item.url ? item.url : null
    if (doctorname && refUrl) {
      console.log(`here`)
      totalCount = totalCount + 1
      //  console.log(`SP1.data >>> `, SP1.data)

      await CS.wait(300);
      const SP2 = await ctrl.get_rid_encrypt(doctorname, refUrl);
      if (SP2.error) {
        console.log("SP2 DB fail.");
        return res.json(TS.fail("SP2 DB fail."));
      }
  
      const tempRid = SP2.data[0].rid_encrypt

      await CS.wait(300);
      const SP3 = await ctrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000011', SP1.data.basic.deptName, SP1.data.basic.doctorName, SP1.data.basic.specialty, SP1.data.basic.profileImgUrl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return res.json(TS.fail("SP3 DB fail."));
      }

      await CS.wait(300);
      const SP4 = await ctrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000011', SP1.data.basic.doctorName, JSON.stringify(SP1.data.detail));
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
  let result = totalCount
  return res.json(TS.success(result));
});



router.get('/info', AUTH.validation, async (req, res, next) => {
  const ip = req.clientIp;
  return res.json(TS.success(req.auth));
});