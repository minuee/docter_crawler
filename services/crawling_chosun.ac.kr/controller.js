const config = require(`${global.appRoot}/server/config/configuration`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;


module.exports = {


  crwalingProcess01: async (r_url) => {
    
    try {
 
      // Launch a headless browser
      const browser = await puppeteer.launch();
      // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      // Navigate to the website
      await page.goto(r_url);
      // Get the page content
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      let dept = [];
      console.log(`r_url: ${r_url} `);

      $('div.department_list').find("ul > li").each((index, element) => {
       
        const deptName = $(element).find('dl > dt').find('a > span').text() ? $(element).find('dl > dt').find('a > span').text().trim() : '';
        const tmpLink = $(element).find('dl').find('dd:eq(1)').find('a').attr('href') ?$(element).find('dl').find('dd:eq(1)').find('a').attr('href') : '';
        
        console.log(`deptName: ${deptName} ${tmpLink}`);
        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://hosp.chosun.ac.kr${tmpLink}`;
          dept.push({ 
            deptName,
            link
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

  crwalingProcess02: async (url,deptName) => {
    let result = null, error = null, DBCode = null;
    if (functions.isEmpty(url)) {
      return { error: true, data: [] };
    }

    console.log(`url: ${url} ${deptName}`);
    try{

      const browser = await puppeteer.launch();
      //const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);

      await page.goto(url,{waitUntil: "networkidle2",timeout:0});
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      await page.setViewport({ width: 1280, height: 800 });
      await page.waitForSelector('ul.dep_li', {
        timeout: 15000,
        visible: true, // 꼭 화면에 보여야만 통과
      });
      await page.evaluate(() => {
        console.log('dep_list_wrap 존재?', document.querySelector('ul.dep_li'));
      });
      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent); 

      const doctors = [];
      const doctorCount = $('#dep_list_wrap').find('ul.dep_li > li').length;
      console.log(`doctorCount: ${doctorCount}`);
      $('#dep_list_wrap').find('ul.dep_li > li').each((index, element) => {
        const doctorName = $(element).find('div.box').find('h4').find('span').remove().end().text() ?  $(element).find('div.box').find('h4').find('span').remove().end().text() .trim() : '';
        const detailLink = $(element).find('div.box').find('div.hover > div.hover_btn').find('a:eq(0)').attr('href') ? $(element).find('div.box').find('div.hover > div.hover_btn').find('a:eq(0)').attr('href') : '';
        const doctorProfileUrl = $(element).find('div.box').find('div.pro_img').find('img').attr('src') ? $(element).find('div.box').find('div.pro_img').find('img').attr('src') : '';
        
        let tmpLink = null
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://hosp.chosun.ac.kr${detailLink}`;
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `hhttps://hosp.chosun.ac.kr${doctorProfileUrl}`;
        }
        const doctorName2 = doctorName.replace("교수","").trim();
        console.log(`Adding doctor list: ${doctorName2} ${deptName} ${tmpProfileUrl} ${tmpLink}`); // 디버
        if ( !functions.isEmpty(doctorName2) && !functions.isEmpty(tmpLink) ) {
          const doctor = {
            doctorName : doctorName2,
            deptName,
            url: tmpLink,
            profile_url : tmpProfileUrl
          };
          doctors.push(doctor); 
        }
      });
   
      console.log(`doctors:${doctors.length}`);
      return { error: error, data: doctors };

    } catch (error) {
      Error = error;
      console.log(`error on ${url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }

    
  },

  

  crwalingProcess03: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
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
      await CS.wait(500);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      let tmpSpecialty = $('div.profile_wrap').find('div.profile_txt').find('p.pro_subject').text() ? $('div.profile_wrap').find('div.profile_txt').find('p.pro_subject').text().trim() : '';
      ///console.log(`specialtyJson: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };
      const careerHtmlData = $('div.pro_career div.pro_career_box > ul').html();
      if (!functions.isEmpty(careerHtmlData)) {
        const sections = await getParseProfile(careerHtmlData);
        console.log(`sections: ${sections?.경력?.length} ${sections?.학력?.length} ${sections?.학회?.length} ${sections?.수상?.length}`);
        sections?.학력?.forEach(async (dtText) => {
    
          if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
                
            const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
    
            console.log(`학력: ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "학력",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        })
        sections.경력.forEach(async (dtText) => {
    
          if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
                
            const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
    
            console.log(`경력: ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "경력",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        })
        sections.학회.forEach(async (dtText) => {
          if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
                
            const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
    
            console.log(`학회: ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "학회",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        })
        sections.수상.forEach(async (dtText) => {
          if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
                
            const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
    
            console.log(`수상: ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "수상",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        })
      }
      await CS.wait(500);
      const paperHtmlData = $('div.paper_ul > ul').html();
      if (!functions.isEmpty(paperHtmlData)) {
        const sections2 = await getParsePaper(paperHtmlData);
        console.log(`저서 count: ${sections2.논문.length}`);
        sections2.논문.forEach(async (dtText) => {
          if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
                
            const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
    
            console.log(`저서: ${tmpText}`);
            item.biography.push({
              targetDate : null,
              type: "저서",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        })
      }
      
      
      await CS.wait(300);
      
      await browser.close();
      return { error: error, data: item };

    } catch (error) {
      Error = error;
      console.log(`error on ${url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }

    async function getParseProfile(contentData) {
      const $ = cheerio.load(contentData);
      const sections = {
        학력: [],
        경력: [],
        학회: [],
        수상: [],
      };
    
      let currentSection = '경력'; // 기본은 경력
    
      $('li').each((_, el) => {
        const text = $(el).text().trim();
        const decodedText = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        // 비어있거나 공백이면 무시
        if (!decodedText || decodedText === '') return;
    
        if (decodedText.includes('학력') && decodedText.length < 10) {
          currentSection = '학력'; // 학력과 경력은 구분 안 되어 있으니 후처리 필요
        } else if (decodedText.includes('경력') && decodedText.length < 10) {
          currentSection = '경력';
        } else if (decodedText.includes('학회') && decodedText.length < 10) {
          currentSection = '학회';
        } else if (decodedText.includes('수상') && decodedText.length < 10) {
          currentSection = '수상';
        } else {
          if (currentSection === '학력' || currentSection === '경력') {
            if (decodedText.match(/(학사|석사|박사)/)) {
              const modifiedText = decodedText.replaceAll("(", "<").replaceAll(")", ">").replaceAll(",", " ").trim();
              if( !functions.isEmpty(modifiedText) ) {
                sections.학력.push(modifiedText);
              }
            } else {
              const modifiedText = decodedText.replaceAll("(", "<").replaceAll(")", ">").replaceAll(",", " ").trim();
              if( !functions.isEmpty(modifiedText) ) {
                sections.경력.push(modifiedText);
              }
            }
          } else {
            const modifiedText = decodedText.replaceAll("(", "<").replaceAll(")", ">").replaceAll(",", " ").trim();
            if( !functions.isEmpty(modifiedText) ) {
              sections[currentSection].push(modifiedText);
            }
          }
        }
      });
    
      return sections;
    }

    async function getParsePaper(contentData) {
      const $ = cheerio.load(contentData);
      const sections = {
        논문: []
      };
    
      let currentSection = '논문'; // 기본은 경력
    
      $('li').each((_, el) => {
        const text = $(el).text().trim();
    
        // 비어있거나 공백이면 무시
        if (!text || text === '') return;
    
        if (text.includes('논문') ) {
          currentSection = '논문'; // 학력과 경력은 구분 안 되어 있으니 후처리 필요
        } else {
          // 학력/경력 구분을 위한 키워드 기반 조건
          if (currentSection === '논문') {
            sections.논문.push(text);
          }
        }
      });
    
      return sections;
    }
  },

  crwalingtreatise: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
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


      const paperHtmlData = $('div.paper_ul > ul').html();
      if (!functions.isEmpty(paperHtmlData)) {
        const sections2 = await getParsePaper(paperHtmlData);
        console.log(`논문 count: ${sections2.논문.length}`);

        sections2?.논문?.forEach(async (dtText) => {
          if ( !functions.isEmpty(dtText)  && dtText?.length > 6 && dtText != "등록된 자료가 없습니다.") {
                
            const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
    
            console.log(`논문: ${tmpText}`);
            item.biography.push({
              type: '논문',
              title: tmpText,
              url: null,
              publicationDate : null,
              journalName : null
            })  
          }
        })
      }

      

      
      await browser.close();
      return { error: error, data: item };

    } catch (error) {
      Error = error;
      console.log(`error on ${url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }

    async function getParsePaper(contentData) {
      const $ = cheerio.load(contentData);
      const sections = {
        논문: []
      };
    
      let currentSection = '논문'; // 기본은 경력
    
      $('li').each((_, el) => {
        const text = $(el).text().trim();
        const decodedText = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        // 비어있거나 공백이면 무시
        if (!decodedText || decodedText === '') return;
    
        if (decodedText.includes('논문')) {
          currentSection = '논문'; // 학력과 경력은 구분 안 되어 있으니 후처리 필요
        } else {
          // 학력/경력 구분을 위한 키워드 기반 조건
          if (currentSection === '논문') {
            const modifiedText = decodedText.replaceAll("(", "<").replaceAll(")", ">").replaceAll(",", " ").trim();
            if( !functions.isEmpty(modifiedText) ) {
              sections.논문.push(modifiedText);
            }
          }
        }
      });
    
      return sections;
    }

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


  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url,profile_url) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_basic_v2(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url,profile_url]);
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



