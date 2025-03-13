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
module.exports = {


  crwalingProcess01: async (r_url) => {
    
    try {
      //Response = await axios.get(r_url);

      // Launch a headless browser
      const browser = await puppeteer.launch();
      // Open a new page
      const page = await browser.newPage();
      // Navigate to the website
      await page.goto(r_url);
      // Get the page content
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      let dept = [];
      ///console.log(`r_url: ${r_url} ${$('div.medi_index_wrap').attr('class')}`);
      $('div.medi_index_wrap').find('ul > li').each((index, element) => {

        const deptName = $(element).find('div.hover_wrap > h5').text().trim();
        const tmpLinkDepthNo = $(element).find('div.hover_wrap > span > a:nth-child(2)').attr('href').trim();
        const linkDepthArray = tmpLinkDepthNo.split('=');
        if ( linkDepthArray.length > 2 ) {
          const link = `https://www.schmc.ac.kr/bucheon/doctr/list/selectIemList.json?lang=kor&hsptlCode=bucheon&deptNo=${linkDepthArray[2]}&searchText=`
          ///console.log(`deptName: ${deptName} ${linkDepthArray[2]} ${link}`);
          dept.push({ 
            deptName,
            link,
            linkDepthNo : linkDepthArray[2]
          });
        }
      });

      //console.log(`size of dept: `,_.size(dept));
      return { error: null, data: dept };
    } catch (error) {
      console.log(`error on ${r_url} API return: ${error}`);
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
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
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

    $('tbody._careerIemContainer').find("tr").each((index, dtElement) => {
      console.log(`경력:`);
      const dtText = $(dtElement).find('td').text().trim();
      
      if ( !functions.isEmpty(dtText) ) {
        const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '');
        item.biography.push({
          targetDate : null,
          type: "경력",
          text: tmpText,
          url: null,
          issuer:null
        });
      }
    });

    
    return { error: error, data: item };
  },


  
  crwalingtreatise: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const deptName = $('div.wsize p.part').first().text().trim();
    const doctorName = $('div.wsize p.name').first().text().trim();
    const profileImgUrl = $('div.bg_type p img').attr('src');
    const specialty = $('div.clinic p.txtw span').first().text().trim();

    let item = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `https://main.kbsmc.co.kr/${profileImgUrl}`,
      biography: [],
    };

    $('div.section2 div.wsize div:nth-of-type(3) dl:nth-of-type(1) ul li').each((index1, element1) => {
      const liText = $(element1).text().trim().replace(/\t/g, '').replace(/\n\n/g, '');
      const etc = {
        type: '논문',
        title: (liText) ? liText : null,
        url: null,
      };
      item.biography.push(etc);
    });
    // console.log(item);
    return { error: error, data: item };
  },


  setCrawlingdoctorBasic: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_crawlingdoctor_basic(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, deptName, doctorName, specialty, profileimgurl]);
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


  setCrawlingdoctorBiography: async (rid, hid, doctorName, jsondata) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_crawlingdoctor_detail(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, doctorName, jsondata]);
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
    const query = `CALL SET_CRAWLING_DOCTOR_LINK(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, deptName, doctorName, url]);
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
    const query = `CALL set_crawlingdoctor_treatise(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, title, doi, journalName, authorRule, publicationDate, url,
      abstract, keywords, impactFactor, totalCitations, referencesThesis,
      doctorName, authorName, subjectClassification, publicationLocation]);
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
    const query = `CALL GET_CRAWLING_DOCTOR_LINK(?)`
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
    const query = `CALL get_rid_encrypt(?)`
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



