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

      $('div.rangelist').find("ul > li").each((tindex, element) => {

        const deptName = $(element).find('div > div.photos').find('strong').text()  ? $(element).find('div > div.photos').find('strong').text().trim()  : '';
        const tmpLink = $(element).find('div > div.photos').find("div > ul > li:eq(1)").find("a").attr('href') ? $(element).find('div > div.photos').find("div > ul > li:eq(1)").find("a").attr('href') : '';
        
        console.log(`deptName: ${deptName} ${tmpLink}`);

        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://www.cnuh.co.kr${tmpLink}`;
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
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);

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

      const doctors = [];
      $('#con_section_day').find('div.lists > ul > li').each((index, element) => {
        const doctorName = $(element).find('div.block').find('strong').find('span').remove().end().text() ? $(element).find('div.block').find('strong').find('span').remove().end().text().trim() : '';
        const detailLink = $(element).find('div.block').find('div.photos').find('a').attr("href") ? $(element).find('div.block').find('div.photos').find('a').attr("href") : '';
        const doctorProfileUrl = $(element).find('div.block').find('div.photos > img').attr("src") ?$(element).find('div.block').find('div.photos > img').attr("src") : '';
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://www.cnuh.co.kr${detailLink}`;
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `https://www.cnuh.co.kr${doctorProfileUrl}`;
        }
      
        console.log(`Adding doctor list: ${doctorName} ${deptName} ${tmpProfileUrl} ${tmpLink}`); // 디버
        if ( !functions.isEmpty(doctorName) && !functions.isEmpty(tmpLink) ) {
          const doctor = {
            doctorName,
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
      let tmpSpecialty = $('div.layout').find('div.topbox').find('ul.data').find("strong:contains('전문진료분야')").next('div').text() ? $('div.layout').find('div.topbox').find('ul.data').find("strong:contains('전문진료분야')").next('div').text().trim() : '';
      console.log(`specialtyJson: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };

      $("div.layout > ul.data").find('li').each((sectionIndex, sectionElement) => {
        const title = $(sectionElement).find('strong').text().trim();
        //console.log(`📌 ${title}, ${title.includes('학력')}`);

        if (title.includes('학력')) { 
          
          $(sectionElement).find("strong:contains('학력 및 경력')").next('div').find('div').each((index, liElement) => {
            const subTitle = $(liElement).find('em').text().trim();
            //console.log(`학력targetData1 ${subTitle}`);
            if (subTitle.includes('학력')) { 
              $(liElement).find("ul > li").each((index, insideLiElement) => {
                const dtText = $(insideLiElement).text().trim();
                if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {
                  if (dtText.match(/(학사|석사|박사|졸업)/)) {
                    const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                    console.log(`학력 ${tmpText}`);
                    item.biography.push({
                      targetDate : null,
                      type: "학력",
                      text: tmpText,
                      url: null,
                      issuer:null
                    });
                  }
                }
              })
            }else if (subTitle.includes('경력')) { 
              $(liElement).find("ul > li").each((index, insideLiElement) => {
                const dtText = $(insideLiElement).text().trim();
                if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {
                  if (dtText.match(/(학사|석사|박사|졸업)/)) {
                    const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                    console.log(`학력 ${tmpText}`);
                    item.biography.push({
                      targetDate : null,
                      type: "학력",
                      text: tmpText,
                      url: null,
                      issuer:null
                    });
                  }else{
                    const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                    console.log(`경력 ${tmpText}`);
                    item.biography.push({
                      targetDate : null,
                      type: "경력",
                      text: tmpText,
                      url: null,
                      issuer:null
                    });
                  }
                }
              })
            }else{
              $(liElement).find("ul > li").each((index, insideLiElement) => {
                const dtText = $(insideLiElement).text().trim();
                
                if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {
                  if (dtText.match(/(학사|석사|박사|졸업)/)) {
                    const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                    console.log(`학력 ${tmpText}`);
                    item.biography.push({
                      targetDate : null,
                      type: "학력",
                      text: tmpText,
                      url: null,
                      issuer:null
                    });
                  }else{
                    const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                    console.log(`경력 ${tmpText}`);
                    item.biography.push({
                      targetDate : null,
                      type: "경력",
                      text: tmpText,
                      url: null,
                      issuer:null
                    });
                  }
                  
                }
              })
              
            }
          });
        }else if (title.includes('학회')) {
          $(sectionElement).find("strong:contains('학회활동')").next('div').find('div').each((index, liElement) => {
            //const subTitle = $(sectionElement).find('em').text().trim();
            //if (subTitle.includes('학회활동')) { 
              $(liElement).find("ul > li").each((index, insideLiElement) => {
                const dtText = $(insideLiElement).text().trim();
                if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {
                  
                  const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                  console.log(`학회 ${tmpText}`);
                  item.biography.push({
                    targetDate : null,
                    type: "학회",
                    text: tmpText,
                    url: null,
                    issuer:null
                  });
                }
              })
            //}
          });
        }else if (title.includes('수상')) {
          $(sectionElement).find("strong:contains('수상내역 및 기타')").next('div').find('div').each((index, liElement) => {
            //const subTitle = $(sectionElement).find('em').text().trim();
            //if (subTitle.includes('수상내역')) { 
              $(liElement).find("ul > li").each((index, insideLiElement) => {
                const dtText = $(insideLiElement).text().trim();
                if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {
                  
                  const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                  console.log(`수상 ${tmpText}`);
                  item.biography.push({
                    targetDate : null,
                    type: "수상",
                    text: tmpText,
                    url: null,
                    issuer:null
                  });
                }
              })
            //}
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

      const targetData4 = $('li.icon03').find('div.dctTabCont').find('ul').find("h5:contains('눈문')").next('ul').find('div').html();
      const targetData4_cleanHtml = targetData4 ? targetData4.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData4_cleanHtml ) {
        const lines4 = targetData4_cleanHtml.includes("<br>") ? targetData4_cleanHtml.split("<br>") : targetData4_cleanHtml.split("\n");
        lines4.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`논문 ${tmpText}`);
            item.biography.push({
              type: '논문',
              title: tmpText,
              url: null,
              publicationDate : null,
              journalName : null
            }) 
          }
        });
      }

      const targetData4_2 = $('li.icon03').find('div.dctTabCont').find('ul').find("h5:contains('논문')").next('ul').find('div > p > font').html();
      const targetData4_2_cleanHtml = targetData4_2 ? targetData4_2.replace(/<!--[\s\S]*?-->/g, '') : '';
      if ( targetData4_2_cleanHtml ) {
        const lines4 = targetData4_2_cleanHtml.includes("<br>") ? targetData4_2_cleanHtml.split("<br>") : targetData4_2_cleanHtml.split("\n");
        lines4.forEach((dtElement, index) => {
          if ( !functions.isEmpty(dtElement)  && dtElement?.length > 6) {
              
            const tmpText = dtElement.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            console.log(`논문 ${tmpText}`);
            item.biography.push({
              type: '논문',
              title: tmpText,
              url: null,
              publicationDate : null,
              journalName : null
            }) 
          }
        });
      }

      
      await browser.close();
      return { error: error, data: item };

    } catch (error) {
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



