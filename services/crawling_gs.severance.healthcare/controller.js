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

let browser = null;


module.exports = {

  crwalingProcess01: async () => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    const url01 = `https://gs.severance.healthcare/gs/department/department.do`;
    
    console.log(`url01`, url01)
    browser = await puppeteer.launch();
    // Open a new page
    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url01);

    await page.waitForSelector('#content');

    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);

    const optionsArray = [];
    $("#content-area > div.sev-card-results ul li").each((index, elem) => {

      const dataId = $(elem).find('a').attr('data-id');
      const link = `https://gs.severance.healthcare/gs/department/department/${dataId}.do`;

      const title = $(elem).find('a > div.line-gray > span').text().trim();

      console.log(`title`, title)
      console.log(`link`, link)
      if(title) {
        optionsArray.push({
          title,
          link
        });
      }
    });

    page.close();

    return { error: error, data: optionsArray };
  },


  crwalingProcess02: async (url) => {
    let result = null, Error, error = null, DBCode = null

    console.log(`url`, url);

    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url);

    await new Promise(r => setTimeout(r, 3000));

    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);

    // const body = $('body').html();

    const doctorArray = [];
    let deptName = $("#cms-content > div.content-header.department-header.tab-yes > div > h2").text().trim();

    $("#tab-content1 > div > ul > li").each((index, element) => {

      const doctorName = $(element).find("div > div.card-view > dl > dt").text().trim();
      const dataEmp = $(element).find("div > div.card-back > div > a.btn.btn-lg.btn-primary.btn-round.btn-block.viewLink").attr('data-emp');
      const dataDept = $(element).find("div > div.card-back > div > a.btn.btn-lg.btn-primary.btn-round.btn-block.viewLink").attr('data-dept');
      const profileUrlTmp = $(element).find("div > div.card-view").find("div.photo").find('img').attr('src');
      const link = `https://gs.severance.healthcare/gs/doctor/doctor-view.do?empNo=${dataEmp}&deptSeq=${dataDept}`;

      if(doctorName && link){
        doctorArray.push({
          deptName: deptName,
          doctorName: doctorName,
          link,
          profileUrl :profileUrlTmp ? `https://gs.severance.healthcare${profileUrlTmp}` : null
        });
      }
    });

    page.close();
    // browser.close();
    return { error: error, data: doctorArray };
  },


  openBrowser: async (option) => {
    if( !browser ) {
      browser = await puppeteer.launch(option);
    }
  },

  closeBrowser: async () => {
    if( browser ) {
      await browser.close();
      browser = null;
    }
  },  


  crwalingProcess03: async (url) => {
    let result = null, Error, error = null, DBCode = null

    let basic = {};
    let detail = [];
    const treatise = [];

    const page = await browser.newPage();

    try {

      // Navigate to the website
      await page.goto(url);

      await page.waitForSelector('#content-doctor');

      const htmlContent = await page.content();

      let $ = cheerio.load(htmlContent);

      const body = $('body').html();

      const info = [];
      const jsonData = [];
      
      let doctorName = $("#content-doctor > div > div.profile-overview > h2 > strong").text().trim().replace(/\t/g, '').replace(/\n/g, '');
      console.log(`doctorName`, doctorName);
     
      const deptName = $("#content-doctor > div > div.profile-overview > h2 > span").text().trim().replace(/\t/g, '').replace(/\n/g, '');

      const specialty = $("#content-doctor > div > div.profile-overview > p:nth-child(3)").text().trim();

      const ImageUrl = $("#header-doctor > div.profile-wrap > div > img").attr('src');

      basic = {
        rid: null,
        hid: null,
        deptName: deptName,
        doctorName: doctorName,
        specialty: specialty,
        profileImgUrl: ImageUrl ? `https://gs.severance.healthcare${ImageUrl}` :null
      }

      $("#tab-intro > div > dl").each((index, element) => {

        if( index === 0 || index === 4 ) return;

        const targetDate = null;

        let type = $(element).find('dt').text().trim();
        
        // const selector = `#mCSB_${index+4}_container > ul > li`;

        $(element).find('dd .mCSB_container ul li').each((idx2, elem) => {
          const text = $(elem).text().trim();
          if( text ) {
            const career = { type, targetDate, text, url:''}
            console.log('career', career); 
            jsonData.push(career);
          }
        })
      })
      detail = jsonData;

      const secondTabName = $("#content-doctor .tab-menu .tab-list li:nth-of-type(2) a span").text().trim();
      if (secondTabName === '논문') {
        const treatise_link = $("#content-doctor .tab-menu .tab-list li:nth-of-type(2) a").attr('href');

        try {
          let Response = await axios.get(treatise_link, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': 'https://gs.severance.healthcare/'
            }
          });

          let $ = cheerio.load(Response.data);

          const extractTreatises = ($) => {
            $("#sb-site > div.m_container > div > div.sub_right_wrap > table > tbody > tr").each((index, element) => {
              const title = $(element).find('td:nth-of-type(2) a:first').text().trim();
              const url = $(element).find('td:nth-of-type(2) a:first').attr('href');
              const journalName = $(element).find('td:nth-of-type(3) a').text().trim();
              if (title) {
                console.log(`treatise title`, title);
                treatise.push({ title, journalName, url: `https://ir.ymlib.yonsei.ac.kr${url}` });
              }
            });
          };

          extractTreatises($);

          const pageLinks = [];
          $('div.pagination_box a.auto_w_page').each((index, element) => {
            const pageUrl = $(element).attr('href');
            if (pageUrl) {
              pageLinks.push(pageUrl);
            }
          });

          for (const pageLink of pageLinks) {
            try {
              const nextPageUrl = `https://ir.ymlib.yonsei.ac.kr${pageLink}`;
              Response = await axios.get(nextPageUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  'Referer': 'https://gs.severance.healthcare/'
                }
              });
              $ = cheerio.load(Response.data);
              extractTreatises($);
            } catch (pageError) {
              console.log(`Error fetching treatise page ${pageLink}: ${pageError}`);
            }
          }
        } catch (error) {
          Error = error;
          console.log(`error on ${treatise_link} API return: ${error}`);
        }
      }

    }
    catch(error) {
      console.log('error', error);
      console.log(`The crawling attempt from URL(${url}) has failed.`);
    }
    finally {
      page.close();
    }

    result = {
      basic: basic,
      detail: detail,
      treatise: treatise
    }
    return { error: error, data: result };
  },

  setCrawlingdoctorBasic: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
    
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL UPDATE_DOCTOR_BASIC(?)`
    // const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, specialty, profileimgurl]);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, specialty, profileimgurl, '']);
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

  setCrawlingdoctorBasic_old: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
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
    const query = `CALL SET_DOCTOR_CAREER(?)`
    // const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, doctorName, jsondata]);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, jsondata]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };
  },

  setCrawlingdoctorBiography_old: async (rid, hid, doctorName, jsondata) => {
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

  setCrawlingTreatise: async (rid, title, doi, journalName, authorRule, publicationDate, url,
    abstract, keywords, impactFactor, totalCitations, referencesThesis,
    doctorName, authorName, subjectClassification, publicationLocation) => {
    let result = null, error = null, DBCode = null, DBData = null;
    let rePublicationDate = await functions.formatPublishDate(publicationDate);
    console.log(`setCrawlingTreatise: ${title}, ${rePublicationDate}, ${journalName}`)
    const query = `CALL set_doctor_paper(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, doctorName, title, doi, journalName, authorRule, rePublicationDate, url,
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

  setCrawlingTreatise_old: async (rid, title, doi, journalName, authorRule, publicationDate, url,
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


  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url,profile_url,p_hName) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_basic_v3(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url,profile_url,p_hName,url]);
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

  setCrawlingDoctorLink_old: async (rid, hid, deptName, doctorName, url) => {
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

  getCrawlingDoctorLink: async (hid) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL get_doctor_basic(?)`
    console.log(`getCrawlingDoctorLink: ${hid} ${DATA_VERSION_ID}`);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [hid, DATA_VERSION_ID]);
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

  getCrawlingDoctorLink_old: async (hid) => {
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

    console.log(`p_doctorName : ${p_doctorName}, p_refUrl : ${p_refUrl}`);
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_rid(?) `
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

  get_rid_encrypt_old: async (p_doctorName, p_refUrl) => {
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



