
const config = require(`${global.appRoot}/server/config/configuration`);
const crawlingCtrl = require(`${global.appRoot}/services/crawling_amc.seoul.kr/controller`);
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
  const P1 = await crawlingCtrl.crwalingProcess01();
  // console.log(P1)
  console.log(`links count : ${_.size(P1.data)}`)
  for (let i = 0; i < _.size(P1.data); i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingProcess02(`https://www.amc.seoul.kr/${P1.data[i]}`);
    if (!CS.isEmpty(SP1.data)) {
      for (let i = 0; i < _.size(SP1.data); i++) {
        data.push({
          hid: 'H01KR-11000010',
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
        const SP3 = await crawlingCtrl.setCrawlingDoctorLink(tempRid, 'H01KR-11000010', SP1.data[i].deptName, SP1.data[i].doctorName, SP1.data[i].url);
        if (SP3.error) console.log("SP3 DB upsert fail.");;
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
  // validation parameter
  // db transaction
  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000010');
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const doctorLinkTotal = _.size(P1.data)
  const loopSize = _.size(P1.data);
  // const loopSize = 1;


  // for (let i = 0; i < 10; i++) {
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].url);
    const doctorname = SP1.data.doctorName ? SP1.data.doctorName : null
    const refUrl = P1.data[i].url ? P1.data[i].url : null
    if (!doctorname || !refUrl) {
      console.log("SP1 DB fail.");
      continue;
      // break;
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
    const SP3 = await crawlingCtrl.setCrawlingdoctorBasic(tempRid, 'H01KR-11000010', SP1.data.deptName, SP1.data.doctorName, SP1.data.specialty, SP1.data.profileImgUrl);
    if (SP3.error) {
      console.log("SP3 DB fail.");
      return res.json(TS.fail("SP3 DB fail."));
    }
    await CS.wait(300);
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000010', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }
  }

  let result = P1.data
  return res.json(TS.success(result));
});


router.post('/treatise', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  // db transaction
  const P1 = await crawlingCtrl.getCrawlingDoctorLink('H01KR-11000010'); //학력 경력 링크
  console.log(_.size(P1.data))
  if (CS.isEmpty(_.size(P1.data))) { return res.json(TS.fail({ code: 'DATA_NULL', message: 'response data is null' })) }
  const loopSize = _.size(P1.data);
  let resultCount = 0
  for (let i = 0; i < loopSize; i++) {
    await CS.wait(5000); // 10초정도로 - 부사장님 지시임! 꼭 지킬것
    const SP1 = await crawlingCtrl.crwalingProcess03(P1.data[i].url);
    const doctorname = SP1.data.doctorName ? SP1.data.doctorName : null
    const refUrl = P1.data[i].url ? P1.data[i].url : null
    const dbRid = P1.data[i].rid ? P1.data[i].rid : null

    if (!doctorname || !refUrl || !dbRid) {
      break;
    }
    const tempRid = dbRid
    if (CS.isEmpty(tempRid)) break;
    await CS.wait(300);
    const link = P1.data[i].url;
    const urlParts = link.split("?");
    const baseURL = urlParts[0];
    const queryString = urlParts[1];
    const queryParams = {};
    if (queryString) {
      const queryParamsArray = queryString.split("&");
      queryParamsArray.forEach(param => {
        const [key, value] = param.split("=");
        queryParams[key] = decodeURIComponent(value);
      });
    }
    const drEmpId = queryParams['drEmpId'] || null;
    const searchHpCd = queryParams['searchHpCd'] || null;
    const tabIndex1 = queryParams['tabIndex1'] || null;
    const tabIndex2 = queryParams['tabIndex2'] || null;
    const pageIndex = queryParams['pageIndex'] || null;
    let linkObj = {
      baseURL,
      drEmpId,
      searchHpCd,
      tabIndex1,//5
      tabIndex2,//1
      pageIndex
    };
    linkObj.tabIndex1 = 5;
    linkObj.tabIndex2 = 1;
    const SP4 = await crawlingCtrl.getTreatiseTotalcount(linkObj)
    if (SP4.error) {
      console.log("SP4 DB fail.");
      return res.json(TS.fail("SP4 DB fail."));
    }
    const totalCount = SP4.data.totalCount
    resultCount = totalCount
    if (totalCount) {
      const refPage = _.floor(totalCount / 10)
      console.log(`refPage`)
      console.log(refPage)
      for (let index = 0; index < refPage + 1; index++) {
        await CS.wait(5000)
        const SP5 = await crawlingCtrl.getTreatiseDetail(linkObj, (index + 1))
        if (SP5.error) {
          console.log("SP5 DB fail.");
          return res.json(TS.fail("SP5 DB fail."));
        }
        // console.log(_.size(SP5.data))
        if (_.size(SP5.data)) {
          for (let index2 = 0; index2 < _.size(SP5.data); index2++) {
            const element = SP5.data[index2];
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
            const SP6 = await crawlingCtrl.setCrawlingTreatise(iD.rid, iD.title, iD.doi, iD.journalName, iD.authorRule, iD.publicationDate, iD.url, iD.abstract, iD.keywords, iD.impactFactor, iD.totalCitations, iD.referencesThesis, iD.doctorName, iD.authorName, iD.subjectClassification, iD.publicationLocation);
            if (SP6.error) {
              console.log(`SP6 DB fail.`);
              console.log(`Error on ${SP1.data.doctorName}`)
            }
          }
        }
      }

    }
  }

  let result = P1.data
  return res.json(TS.success(resultCount));
});




router.post('/hospital/step03/H01KR-11000001', async (req, res, next) => {
  const ip = req.clientIp;
  // validation parameter
  // db transaction
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
    await CS.wait(300);
    const SP4 = await crawlingCtrl.setCrawlingdoctorBiography(tempRid, 'H01KR-11000010', SP1.data.doctorName, JSON.stringify(SP1.data.biography));
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