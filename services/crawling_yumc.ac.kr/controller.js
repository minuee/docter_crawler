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

      $('#content_body').find('div.row > div').each((index, element) => {

        const deptName = $(element).find('h4').find('a').clone().children('span').remove().end().text()  ? $(element).find('h4').find('a').clone().children('span').remove().end().text().trim()  : '';
        const tmpLink = $(element).find('h4').find('a').attr('href') ? $(element).find('h4').find('a').attr('href'): '';
        
        console.log(`deptName: ${deptName} ${tmpLink}`);

        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://yumc.ac.kr${tmpLink}`;
         
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

  crwalingProcess02: async (tmpUrl,deptName) => {
    let result = null, error = null, DBCode = null;
    if (functions.isEmpty(tmpUrl)) {
      return { error: true, data: [] };
    }
    console.log(`link: ${tmpUrl} ${deptName}`);
   
    try {
      const match = tmpUrl.split("?");
      let url = tmpUrl;

      if (match.length > 1) {
          const params = new URLSearchParams(match[1]);
          const clubid = params.get("clubid"); // clubid 값 추출

          if (clubid) {
              console.log(clubid); // NIM697GM
              url = `https://yumc.ac.kr/medical/timetable.do?clubid=${clubid}`;
          } else {
              return { error: true, data: [] };
          }
      } else {
          return { error: true, data: [] };
      }

      console.log(`url: ${url} ${deptName}`);
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
      $('table.board_doc').find('tbody > tr').each((index, element) => {
        const doctorName = $(element).find('th:eq(0)').find('a').find('strong').text() ? $(element).find('th:eq(0)').find('a').find('strong').text().trim() : '';
        const detailLink = $(element).find('th:eq(0)').find('a').attr('href') ? $(element).find('th:eq(0)').find('a').attr('href') : '';
        const doctorProfileUrl = $(element).find('th:eq(0)').find('a').find('img').attr('src') ? $(element).find('th:eq(0)').find('a').find('img').attr('src') : '';
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://yumc.ac.kr${detailLink}`;
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `https://yumc.ac.kr${doctorProfileUrl}`;
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
      let tmpSpecialty = $('#content_body')
      .find('div.subbox')
      .find('ul.arrow4 > li')
      .filter(function() {
        return $(this).children('strong').text().trim() === '[진료과목]';
      })
      .clone() // 원본 li를 복제해서
      .children('strong').remove() // strong 태그 제거
      .end()
      .text() ? $('#content_body')
      .find('div.subbox')
      .find('ul.arrow4 > li')
      .filter(function() {
        return $(this).children('strong').text().trim() === '[진료과목]';
      })
      .clone() // 원본 li를 복제해서
      .children('strong').remove() // strong 태그 제거
      .end()
      .text().trim() : '';
      console.log(`specialtyJson: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };
     
      const targetData1 = $('#content_body').find("h3:contains('학력')").next('p').next('div.subbox').html();
      //console.log(`targetData2: ${targetData1}`);
      if ( targetData1 ) {
        const cleanText = targetData1.replace(/<br\s*\/?>/gi, '\n'); // 모든 <br>을 개행으로 변환
        const lines = cleanText.split('\n').map(line => line.trim()).filter(Boolean);

        lines.forEach((dtElement, index) => {
          
          const match = functions.splitPeriodAndText(dtElement);
          const targetDate = match ? match.period : null;
          const titleText = match ? match.text : dtElement;
          console.log(`학력 ${index}: ${targetDate} ${titleText}`);
          item.biography.push({
            targetDate: targetDate,
            type: "학력",
            text: titleText,
            url: null,
            issuer: null
          });
        });
      }

      const targetData2 = $('#content_body').find("h3:contains('경력')").next('p').next('div.subbox').html();
      //console.log(`targetData2: ${targetData2}`);
      if ( targetData2 ) {
        const cleanText = targetData2.replace(/<br\s*\/?>/gi, '\n'); // 모든 <br>을 개행으로 변환
        const lines = cleanText.split('\n').map(line => line.trim()).filter(Boolean);

        lines.forEach((dtElement, index) => {

          const match = functions.splitPeriodAndText(dtElement);
          const targetDate = match ? match.period : null;
          const titleText = match ? match.text : dtElement;
          console.log(`경력 ${index}: ${targetDate} ${titleText}`);
          item.biography.push({
            targetDate: targetDate,
            type: "경력",
            text: titleText,
            url: null,
            issuer: null
          });
        });
      }

      const targetData3 = $('#content_body').find("h3:contains('수상경력')").next('p').next('div.subbox').html();
      if ( targetData3 ) {
        const cleanText = targetData3.replace(/<br\s*\/?>/gi, '\n'); // 모든 <br>을 개행으로 변환
        const lines = cleanText.split('\n').map(line => line.trim()).filter(Boolean);

        lines.forEach((dtElement, index) => {
          
          const match = functions.splitPeriodAndText(dtElement);
          const targetDate = match ? match.period : null;
          const titleText = match ? match.text : dtElement;
          console.log(`수상 ${index}: ${targetDate} ${titleText}`);
          item.biography.push({
            targetDate: targetDate,
            type: "수상",
            text: titleText,
            url: null,
            issuer: null
          });
        });
      }else{
        const targetData3_2 = $('#content_body').find("h3:contains('수상경력')").next('div.subbox').html();
        if ( targetData3_2 ) {
          const cleanText = targetData3_2.replace(/<br\s*\/?>/gi, '\n'); // 모든 <br>을 개행으로 변환
          const lines = cleanText.split('\n').map(line => line.trim()).filter(Boolean);

          lines.forEach((dtElement, index) => {
            const match = functions.splitPeriodAndText(dtElement);
            const targetDate = match ? match.period : null;
            const titleText = match ? match.text : dtElement;
            console.log(`수상2 ${index}: ${targetDate} ${titleText}`);
            item.biography.push({
              targetDate: targetDate,
              type: "수상",
              text: titleText,
              url: null,
              issuer: null
            });
          });
        }
      }
      $('#content_body').find("h3:contains('주요 저서 및 논문')").next('div.subbox').find("ul > li").each((index, dtElement) => {
      
        const dtYearText = '';
        const dtText = $(dtElement).text() ? $(dtElement).text().trim()  : '';
        const dtTextIssuer =  '';
        
        if ( !functions.isEmpty(dtText) && dtText.length > 10 ) {
          console.log(`저서: ${dtYearText}, ${dtText}, ${dtTextIssuer}`);
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText;
          const tmpDtTextIssuer = dtTextIssuer;
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "저서",
            text: tmpText,
            url: null,
            issuer:tmpDtTextIssuer
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
      let collecting = false;
      let isTreatiseCount = 0;
      $('#content_body').find("h3:contains('주요 저서 및 논문')").next('div.subbox').find("ul > li").each((index, dtElement) => {
      
        const dtYearText = '';
        const dtText = $(dtElement).text() ? $(dtElement).text().trim()  : '';
        const dtTextIssuer =  '';
        
        if ( !functions.isEmpty(dtText) && dtText.length > 10 ) {
          //console.log(`논문1 : ${dtYearText}, ${dtText}, ${dtTextIssuer}`);
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText;
          const tmpDtTextIssuer = dtTextIssuer;
          item.biography.push({
            type: '논문',
            title: tmpText,
            url: null,
            publicationDate : tmpDtYearText,
            journalName : tmpDtTextIssuer
          });
          isTreatiseCount++;
        }
      });

      if ( isTreatiseCount == 0 ) {
        const targetData3 = $('#content_body').find("h3:contains('학회 및 대외활동')").next('div.subbox').html();
        if ( targetData3 ) {
          const lines = targetData3.includes("<br>") ? targetData3.split("<br>") : targetData3.split("\n");
          let currentType = null; // '논문' 또는 '저서'

          lines.forEach((dtElement, index) => {
            let cleanText = dtElement.trim();

            if (cleanText === '') return;

            /// '[주요논문]'이 나오면 그 다음부터 수집 시작
            if (cleanText.includes('논문')) {
              collecting = true;
              return;
            }

            // '[주요저서]' 또는 다른 카테고리 나오면 수집 중단
            if (cleanText.includes('[')) {
              collecting = false;
              return;
            }

            if (collecting && !functions.isEmpty(cleanText) && cleanText.length > 10) {
              const tmpText = cleanText
                .replace(/\t/g, '')
                .replace(/\n/g, '')
                .replaceAll(/\n|\r|/g, '')
                .trim();

              console.log(`논문 2: ${tmpText.length}, ${tmpText}`);
              item.biography.push({
                type: '논문',
                title: tmpText,
                url: null,
                publicationDate: '',
                journalName: ''
              });
            }
          })
        }
      }

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



