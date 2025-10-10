const config = require(`${global.appRoot}/server/config/configuration`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;

module.exports = {
  crwalingProcess01: async (r_url) => {
    
    try {
      //Response = await axios.get(r_url);

      // Launch a headless browser
      const browser = await puppeteer.launch();
      // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      // Navigate to the website
      await page.goto(r_url);
      // ✅ DOM에 해당 요소가 로드될 때까지 기다리기
      await page.waitForSelector('div.medi_index_wrap li._item');

      // ✅ 이제 렌더링된 HTML을 가져오기
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent); 
      
      let dept = [];
      console.log(`r_url: ${r_url} ${$('div.medi_index_wrap').attr('class')}`);
      $('div.medi_index_wrap').find('ul > li').each((index, element) => {
        console.log(`index: ${index}`);
        const deptName = $(element).find('div.hover_wrap > h5').text() ? $(element).find('div.hover_wrap > h5').text().trim() : '';
        const tmpLinkDepthNo = $(element).find('div.hover_wrap > span > a:nth-child(2)').attr('href') ? $(element).find('div.hover_wrap > span > a:nth-child(2)').attr('href').trim() : '';
        const linkDepthArray = tmpLinkDepthNo.split('=');
        console.log(`linkDepthArray: ${linkDepthArray}`);
        if ( linkDepthArray.length > 2 ) {
          const link = `https://www.schmc.ac.kr/bucheon/doctr/list/selectIemList.json?lang=kor&hsptlCode=bucheon&deptNo=${linkDepthArray[2]}&searchText=`
          dept.push({ 
            deptName,
            link,
            linkDepthNo : linkDepthArray[2]
          });
        }
      });

      console.log(`size of dept: `,_.size(dept));
      await browser.close();
      return { error: null, data: dept };
    } catch (error) {
      console.log(`error on ${r_url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }
  },

  crwalingProcess02: async (link,deptName,linkDepthNo) => {
    if (functions.isEmpty(link)) {
      return { error: true, data: [] };
    }
    let error = null;
    let doctors = [];
    try {
      const dataObj = {
        /* lang: "kor",
        hsptlCode: "bucheon",
        deptNo: linkDepthNo,
        searchText: "" */
      };
      doctors = await axios.post(link, dataObj, {
        headers: {
          //'Content-type': 'application/json'
          //'Content-Type': 'multipart/form-data'
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }).then(response => {
        //console.log(`Response linkDepthNo ${linkDepthNo} ${JSON.stringify(response.data.data.length)} ${typeof response.data.data}`)
        const tmpDoctors = [];
        const retData =  response.data.data;
        for (let i = 0; i < retData.length; i++) {
          const docLink = `https://www.schmc.ac.kr/bucheon/doctr/home.do?key=2947&doctrNo=${retData[i].doctrNo}`
          //console.log(`item: ${retData[i].doctrNm} ${retData[i].deptNm} ${docLink}`);
          tmpDoctors.push({
            doctorName: retData[i].doctrNm,
            deptName: retData[i].deptNm,
            url: docLink
          });
        }
        return tmpDoctors;
      }).catch(function (error) {
        console.log(error);
      });
      
    } catch (error) {
      Error = error
      console.log(`error on ${link} API return: ${error}`);
    }
  
    // 쓰레기 태그 날림
    // $('span').empty(); // 못날림 (이름과 진료과가 붙어있음)
    
    console.log(`doctors:${doctors.length}`);
    return { error: error, data: doctors };
  },



  crwalingProcess03: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`linkUrl: ${url} `);
   
    try {
    const browser = await puppeteer.launch();
      // Open a new page
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    //await page.waitForSelector('.inner');
    // Navigate to the website
    await page.goto(url,{waitUntil: "domcontentloaded"});
    await page.setViewport({
        width: 1200,
        height: 800
    });

    await page.keyboard.press('ArrowDown')
    //await page.waitForSelector("._careerIemContainer");
    await CS.wait(1000);
    await page.keyboard.press('ArrowUp');
    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);  
    // $(`#layer_pop_${doctor_id}`).attr('disabled', 'disabled').css('display', 'block');
    const profileImgUrl = $('.sub').find("img.doc_img").attr('src');
    console.log(`profileImgUrl: ${profileImgUrl} `);
    let tmpSpecialty = $('.subj_t').text().trim();
    console.log(`tmpSpecialty: ${tmpSpecialty}`);
    // 진료분야를 json화 한다
    let specialtyJson = tmpSpecialty.split(",");
    //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);

    // 학력 경력
    
    let item = {
      specialty: tmpSpecialty,
      specialtyJson: specialtyJson,
      profileImgUrl: `https://www.cmcism.or.kr/${profileImgUrl}`,
      biography: [],
    };
    //const smaple = $('#_careerContainer').find('._careerIem:first-child > td').text().trim();
    //console.log(`_press: ${smaple}`);

    $('#_careerContainer').find("div._careerContainer:first-child").find('._careerIem').each((index, dtElement) => {
      
      const dtText = $(dtElement).find('td').text() ? $(dtElement).find('td').text() : '';
      console.log(`경력: ${dtText}`);
      if ( !functions.isEmpty(dtText) && dtText.indexOf("졸업") != -1) { //졸업이 있을때믄 학력으로 표시 
        const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : null,
          type: "학력",
          text: tmpText,
          url: null,
          issuer:null
        });
      }else{
        const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : null,
          type: "경력",
          text: tmpText,
          url: null,
          issuer:null
        });
      }
    });

    $('#_careerContainer').find("div._careerContainer:nth-child(2)").find('._careerIem').each((index, dtElement) => {
      
      const dtText = $(dtElement).find('td').text() ? $(dtElement).find('td').text() : '';
      console.log(`학회: ${dtText}`);
      if ( !functions.isEmpty(dtText) ) {
        const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : null,
          type: "학회",
          text: tmpText,
          url: null,
          issuer:null
        });
      }
    });

    $('#_thesisContainer').find('li._thesisIem').each((index, dtElement) => {
      
      const dtText = $(dtElement).find('span').text() ? $(dtElement).find('span').text() : '';
      console.log(`논문: ${dtText}`);
      if ( !functions.isEmpty(dtText) ) {
        const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : null,
          type: "논문",
          text: tmpText,
          url: null,
          issuer:null
        });
      }
    });

    await browser.close();
    return { error: error, data: item };
  } catch (error) {
    Error = error;
    console.log(`error on ${url} API return: ${error}`);
    await browser.close();
    return { error: error, data: [] };
  }
  },

  crwalingtreatise: async (url) => {
    
    let result = null, error = null, DBCode = null

    console.log(`crwalingProcess03: ${url}`); 
    
    if (!url) {
      return { error: true, data: null };
    }
    try {
      const browser = await puppeteer.launch();
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      //await page.waitForSelector('.inner');
      // Navigate to the website
      await page.goto(url,{waitUntil: "domcontentloaded"});
      await page.setViewport({
          width: 1200,
          height: 800
      });

      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      
      let item = {
        biography: [],
      };

      $('#_thesisContainer').find("li").each((index, dtElement) => {
        
        const dtText = $(dtElement).find('li > div > span').text() ? $(dtElement).find('li > div > span').text() : '';  
        console.log(`논문: ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const etc = {
            type: '논문',
            title: (tmpText) ? tmpText : '',
            url: null,
          };
          item.biography.push(etc);
        }
      });

    
      await browser.close();
      return { error: error, data: item };

    } catch (error) {
      Error = error;
      console.log(`error on ${url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }




  },

  setCrawlingdoctorBasic: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
    
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL UPDATE_DOCTOR_BASIC(?)`
    // const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, specialty, profileimgurl]);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, specialty, profileimgurl, '']);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)} ${rid} ${specialty} ${profileimgurl}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },

  setCrawlingdoctorBiography: async (rid, hid, doctorName, jsondata) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL SET_DOCTOR_CAREER(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, jsondata]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_basic(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  setCrawlingTreatise: async (rid, title, doi, journalName, authorRule, publicationDate, url,
    abstract, keywords, impactFactor, totalCitations, referencesThesis,
    doctorName, authorName, subjectClassification, publicationLocation) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_paper(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, doctorName, title, doi, journalName, authorRule, publicationDate, url,
      abstract, keywords, impactFactor, totalCitations, authorName]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },


  getCrawlingDoctorLink: async (hid) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_doctor_basic(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [hid,DATA_VERSION_ID]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },


  get_crawling_doctor_mssing_link: async (hid) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_crawling_doctor_mssing_link(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [hid]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  get_rid_encrypt: async (p_doctorName, p_refUrl) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_rid(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_doctorName, p_refUrl]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },


  get_rid_decrypt: async (p_txt) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_rid_decrypt(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_txt]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

}



