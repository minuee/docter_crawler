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

      $('div.part_list').find("ul > li").each((index, element) => {
       
        const deptName = $(element).find('a').text() ? $(element).find('a').text().trim() : '';
        const tmpLink = $(element).find('a').attr('href') ? $(element).find('a').attr('href') : '';
        
        
        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const tmpLink2 = tmpLink.replaceAll("intro","doc");
          const link = `https://www.ywmc.or.kr${tmpLink2}`;
          console.log(`deptName: ${deptName} ${link}`);
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
      const links = $('div.doct_list').find('div.d_bx').toArray();
      const buttons = await page.$$('div.doct_list div.d_bx div.barea > a');
      for (const [index, element] of links.entries()) {

        const doctorName = $(element).find('div.d_info').find('div.d_if').find('p.name').text() ? $(element).find('div.d_info').find('div.d_if').find('p.name').text().trim() : '';
        const detailLink = $(element).find('div.barea').find('a').attr('onclick') ? $(element).find('div.barea').find('a').attr('onclick') : '';
        const doctorProfileUrl = $(element).find('div.d_info').find('div.d_pic').find('img').attr('src') ? $(element).find('div.d_info').find('div.d_pic').find('img').attr('src') : '';
        
        let tmpLink = null;
        let tmpLinkID = null;
        let tmpLinkFullID = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          const linkID = detailLink.match(/#_doctorView_WAR_reservportlet_pop_rsv_cplt-\d+/);
          //console.log(linkID ? linkID[0] : 'No match found');
          if ( linkID[0]) {
            tmpLinkFullID = linkID[0];
            tmpLinkID = linkID[0].replace("#","");
            tmpLink =  `https://www.ywmc.or.kr/${tmpLinkID}`;
          }
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          if ( doctorProfileUrl.indexOf("http") !== -1) {
            tmpProfileUrl =  doctorProfileUrl;
          }else{
            tmpProfileUrl =  `https://www.ywmc.or.kr${doctorProfileUrl}`;
          }
         
        }
        const doctorName2 = doctorName.replace("교수","").trim();
        console.log(`Adding doctor list: ${doctorName2} ${tmpLink} ${tmpLinkFullID}`); // 디버
        if ( !functions.isEmpty(doctorName2) &&  doctorName2 !== "일반진료" && !functions.isEmpty(tmpLink) ) {
          
          try{

            await buttons[index].click();
            // 해당 레이어가 생성되고 보일 때까지 기다림
            await page.waitForSelector(`${tmpLinkFullID}`, { visible: true });

            const tmpSpecialty = $(tmpLinkFullID).find("div.pop_container").find("div.pop_cont").find("div.major").find("span:eq(1)").text()
            ?
            $(tmpLinkFullID).find("div.pop_container").find("div.pop_cont").find("div.major").find("span:eq(1)").text().trim()
            :
            "";
            console.log(`specialty : ${tmpSpecialty}`); // 디버
            let specialtyJson = tmpSpecialty ? tmpSpecialty.split(",") : [];
          
            const doctor = {
              doctorName : doctorName2,
              deptName,
              url: tmpLink,
              profile_url : tmpProfileUrl,
              specialty : tmpSpecialty,
              specialtyJson,
              biography: [],
              paper:[]
            };
            $(tmpLinkFullID).find("div.portfolio").find('div.box').each((index, dtElement) => {

              const titleText = $(dtElement).find('p.title').first().text().trim();
              console.log(`titleText ${titleText}`);
              if (titleText.includes('학력')) {
                const targetData1 = $(dtElement).find("p.title").filter((i, el) => {return $(el).text().includes("학력");}).next('ul').find('li').html();
                if ( targetData1 ) {
                  const lines = targetData1.includes("<br>") ? targetData1.split("<br>") : targetData1.split("\n");
                  lines.forEach((dtElement, index) => {
                    const dtYearText = '';
                    if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {
                      console.log(`학력: ${dtElement?.length}, ${dtElement}`);
                      const tmpDtYearText = dtYearText;
                      doctor.biography.push({
                        targetDate : tmpDtYearText,
                        type: "학력",
                        text: dtElement,
                        url: null,
                        issuer:null
                      });
                    }
                  });
                }
              }else if (titleText.includes('경력')) {
                const targetData1 = $(dtElement).find("p.title").filter((i, el) => {return $(el).text().includes("경력");}).next('ul').find('li').html();
                if ( targetData1 ) {
                  const lines = targetData1.includes("<br>") ? targetData1.split("<br>") : targetData1.split("\n");
                  lines.forEach((dtElement, index) => {
                    const dtYearText = '';
                    if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {
                      console.log(`경력: ${dtElement?.length}, ${dtElement}`);
                      const tmpDtYearText = dtYearText;
                      doctor.biography.push({
                        targetDate : tmpDtYearText,
                        type: "경력",
                        text: dtElement,
                        url: null,
                        issuer:null
                      });
                    }
                  });
                }
              }else if (titleText.includes('학술')) {
                const targetData1 = $(dtElement).find("p.title").filter((i, el) => {return $(el).text().includes("학술");}).next('ul').find('li').html();
                if ( targetData1 ) {
                  const lines = targetData1.includes("<br>") ? targetData1.split("<br>") : targetData1.split("\n");
                  lines.forEach((dtElement, index) => {
                    const dtYearText = '';
                    if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {
                      console.log(`학술: ${dtElement?.length}, ${dtElement}`);
                      const tmpDtYearText = dtYearText;
                      doctor.biography.push({
                        targetDate : tmpDtYearText,
                        type: "학술",
                        text: dtElement,
                        url: null,
                        issuer:null
                      });
                    }
                  });
                }
              }else if (titleText.includes('주요업적')) {
                const targetData1 = $(dtElement).find("p.title").filter((i, el) => {return $(el).text().includes("주요업적");}).next('ul').find('li').html();
                if ( targetData1 ) {
                  const lines = targetData1.includes("<br>") ? targetData1.split("<br>") : targetData1.split("\n");
                  lines.forEach((dtElement, index) => {
                    const dtYearText = '';
                    if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {
                      console.log(`논문: ${dtElement?.length}, ${dtElement}`);
                      const tmpDtYearText = dtYearText;
                      doctor.paper.push({
                        publicationDate : tmpDtYearText,
                        type: "논문",
                        title: dtElement,
                        url: null,
                        journalName:null
                      });
                    }
                  });
                }
              }
            });
            doctors.push(doctor); 
            await page.click(`${tmpLinkFullID} div.pop_container a.pop_close`);
            await CS.wait(1000);
          } catch (error) {
            console.log(`error Waiting for the page to load: ${error}`);
          }
        };
      }
      console.log(`doctors:${doctors.length}`);
      return { error: error, data: doctors };

    } catch (error) {
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
      let tmpSpecialty = $('div.doctBaseInfo').find('dl.doctSect').find('dd').text() ? $('div.doctBaseInfo').find('dl.doctSect').find('dd').text().trim() : '';
      console.log(`specialtyJson: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };
     
      $('#mCSB_3_container').find('div.unit').each((index, dtElement) => {

        const titleText = $(dtElement).find('h3.unitTit').first().text().trim();
        console.log(`titleText ${titleText}`);
        if (titleText.includes('학력')) {
          $(dtElement).children('h3.unitTit').next('ul > li').each((j, pEl) => {
            const dtText = $(pEl).find("span.tText").text() ? $(pEl).find("span.tText").text().trim().substring(0,500): '';
            
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {
              
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
          });
        }else if (titleText.includes('학회')) {
          $(dtElement).children('h3.unitTit').next('ul > li').each((j, pEl) => {
            const dtText = $(pEl).find("span.tText").text() ? $(pEl).find("span.tText").text().trim().substring(0,500): '';
            
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
          });
        }
      });
      await CS.wait(500);
      
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

      $('div.profile').find('div.item').each((index, dtElement) => {

        const titleText = $(dtElement).find('h3.tit, h4.tit').first().text().trim();
        console.log(`titleText ${titleText}`);
       if (titleText.includes('연구')) {
          $(dtElement).children('h3.tit, h4.tit').next('ul').find('li').each((j, pEl) => {
            const dtText = $(pEl).find("em").text().trim() ? $(pEl).find("em").text().trim().trim().substring(0,500): '';
            
            if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {
              
              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
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
      })

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



