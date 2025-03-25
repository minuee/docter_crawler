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
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }

    try {
      Response = await axios.get(r_url);
      const $ = cheerio.load(Response.data);  
      let dept = [];
      $('table.MedicalTeam > tbody > tr').each((index, element) => {

        $(element).find('td').each((index2, element2) => {
          let tmpeDeptName = $(element2).find('span').text() ? $(element2).find('span').text().trim() : '';
          let tmlLink = $(element2).find('a').attr('href') ? $(element2).find('a').attr('href').trim() : '';
          
          if ( !functions.isEmpty(tmpeDeptName) && !functions.isEmpty(tmlLink) ) {
            //검색된 상세페이지링크주소를  의료진 페이지로 변경
            const link = `https://www.cmcism.or.kr${tmlLink.replace('treatment_info','treatment_team').trim()}`;
            const deptName = tmpeDeptName.trim();
            //console.log(`Adding department: ${tmpeDeptName} with link: ${link}`); // 디버깅을 위한 로그
            dept.push({ 
              deptName,
              link,
            });
          }
        })
        //console.log(`index: `, index);
      });

      //console.log(`size of dept: `,_.size(dept));
      return { error: null, data: dept };
    } catch (error) {
      console.log(`error on ${r_url} API return: ${error}`);
      return { error: error, data: [] };
    }
  },

  crwalingProcess02: async (link,deptName) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!link) {
      return { error: true, data: null };
    }
    try {
      Response = await axios.get(link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${link} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);

    const doctors = [];
    $('div.select_list_wrap > ul > li').each((index, element) => {
      const doctorName = $(element).find('div.doc_info > div.doc_name > a:first-child > strong').text() ?$(element).find('div.doc_info > div.doc_name > a:first-child > strong').text() : '';
      const detailLink = $(element).find('div.doc_list_wrap > a').attr('href') ? $(element).find('div.doc_list_wrap > a').attr('href') : '';
      console.log(`Adding doctor list: ${index} ${doctorName} ${deptName} ${detailLink}`); // 디버깅을 위한 로그
      const doctor = {
        doctorName,
        deptName,
        url: detailLink,
      };
      doctors.push(doctor); 
    });
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

    const devideUrl = url.split('&');
    const linkUrl = devideUrl[0];
    const doctor_id = devideUrl[1];

    console.log(`linkUrl: ${devideUrl} ${linkUrl} doctor_id: ${doctor_id}`);
    try {
      Response = await axios.get(linkUrl, {
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
    const profileImgUrl = $(`#layer_pop_${doctor_id}`).find("p.img > img").attr('src') ? $(`#layer_pop_${doctor_id}`).find("p.img > img").attr('src').trim() : '';
    console.log(`profileImgUrl: ${profileImgUrl} `);
    let tmpSpecialty = [];
    $(`#layer_pop_${doctor_id}`).find('table > tbody > tr').each((index, element) => {
      if (index == 0) { //직급/직위
      }else if (index == 1) { //전문분야
        tmpSpecialty = $(element).find('td').text().trim();
      }else { // 약력
      }
    });

    // 진료분야를 json화 한다
    let specialtyJson = tmpSpecialty.split(",");
    //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);

  
    let item = {
      specialty: tmpSpecialty,
      specialtyJson: specialtyJson,
      profileImgUrl: `https://www.cmcism.or.kr/${profileImgUrl}`,
      biography: [],
    };

    $(`#layer_pop_${doctor_id}`).find(`#tab${doctor_id}_2 > dl:first-child dd`).each((index, dtElement) => {
      const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
      //console.log(`경력: ${dtText}`);
      if ( !functions.isEmpty(dtText) ) {
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

    $(`#layer_pop_${doctor_id}`).find(`#tab${doctor_id}_2 > dl:nth-child(2) dd`).each((index, dtElement) => {
      const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
      //console.log(`학력: ${dtText}`);
      if ( !functions.isEmpty(dtText) ) {
        const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : null,
          type: "학력",
          text: tmpText,
          url: null,
          issuer:null
        });
      }
    });

    $(`#layer_pop_${doctor_id}`).find(`#tab${doctor_id}_2 > dl:nth-child(3) dd`).each((index, dtElement) => {
      const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
      //console.log(`학회활동 : ${dtText}`);
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
    
    $(`#layer_pop_${doctor_id}`).find(`#tab${doctor_id}_2 > dl:nth-child(4) dd`).each((index, dtElement) => {
      const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
      //console.log(`수상: ${dtText}`);
      if ( !functions.isEmpty(dtText) ) {
        const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : null,
          type: "수상",
          text: tmpText,
          url: null,
          issuer:null
        });
      }
    });

    $(`#layer_pop_${doctor_id}`).find(`#tab${doctor_id}_4 .table_type02:first`).find("tbody tr").each((index, dtElement) => {
      const textTitle = $(dtElement).find('td:nth-child(2) > a').text() ? $(dtElement).find('td:nth-child(2) > a').text().trim() : '';
      const textIssuer = $(dtElement).find('td:nth-child(3)').text() ? $(dtElement).find('td:nth-child(3)').text().trim() : '';
      const textDate = $(dtElement).find('td:nth-child(4)').text() ? $(dtElement).find('td:nth-child(4)').text().trim() : '';
      const textUrl = $(dtElement).find('td:nth-child(2) > a').attr('href') ? $(dtElement).find('td:nth-child(2) > a').attr('href').trim() : '';
      console.log(`textTitle: ${textTitle} ${textIssuer} ${textDate} ${textUrl}`);

      if ( !functions.isEmpty(textTitle) ) {
        const tmpText = textTitle.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : textDate,
          type: "언론",
          text: tmpText,
          url: textUrl,
          issuer: textIssuer,
          gubun:"신문"
        });
      }
    });

    $(`#layer_pop_${doctor_id}`).find(`#tab${doctor_id}_4 .table_type02:nth-child(2)`).find("tbody tr").each((index, dtElement) => {
      const textTitle = $(dtElement).find('td:nth-child(2) > a').text() ? $(dtElement).find('td:nth-child(2) > a').text().trim() : '';
      const textIssuer = $(dtElement).find('td:nth-child(3)').text() ? $(dtElement).find('td:nth-child(3)').text().trim() : '';
      const textDate = $(dtElement).find('td:nth-child(4)').text() ? $(dtElement).find('td:nth-child(4)').text().trim() : '';
      const textUrl = $(dtElement).find('td:nth-child(2) > a').attr('href') ? $(dtElement).find('td:nth-child(2) > a').attr('href').trim() : '';
      console.log(`textTitle: ${textTitle} ${textIssuer} ${textDate} ${textUrl}`);

      if ( !functions.isEmpty(textTitle) ) {
        const tmpText = textTitle.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : textDate,
          type: "언론",
          text: tmpText,
          url: textUrl,
          issuer: textIssuer,
          gubun:"방송"
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

    const devideUrl = url.split('&');
    const linkUrl = devideUrl[0];
    const doctor_id = devideUrl[1];

    console.log(`linkUrl: ${devideUrl} ${linkUrl} doctor_id: ${doctor_id}`);
    try {
      Response = await axios.get(linkUrl, {
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

    let item = {
      biography: [],
    };


    $(`#layer_pop_${doctor_id}`).find(`#tab${doctor_id}_3`).find('dd').each((index, dtElement) => {
      const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
      
      if ( !functions.isEmpty(dtText) && dtText.length > 15 ) {
        console.log(`논문: ${dtText}`);
        const etc = {
          type: '논문',
          title: dtText.replaceAll(/\n|\r|/g, ''),
          url: null,
        };
        item.biography.push(etc);
      }
    });

    // console.log(item);
    return { error: error, data: item };
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



