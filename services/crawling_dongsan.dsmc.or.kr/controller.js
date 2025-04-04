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
      // Get the page content
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      let dept = [];
      console.log(`r_url: ${r_url} `);

      $('div.medipart_list').find('ul > li').each((index, element) => {

        const deptName = $(element).find('div.deptinfo').text() ? $(element).find('div.deptinfo').text().trim() : '';
        const tmpLink = $(element).find('div.deptlink a:nth-child(2)').attr('href') ? $(element).find('div.deptlink a:nth-child(2)').attr('href') : '';

        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://dongsan.dsmc.or.kr:49870${tmpLink}`;
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
    console.log(`link: ${url} ${deptName}`);

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

      const doctors = [];
      $('div.medipart_doctor').find('ul.dr_list > li').each((index, element) => {
        const doctorName = $(element).find('div.dr_wrap').find('div.info > p.name').text() ? $(element).find('div.dr_wrap').find('div.info > p.name').text().replace('교수','').trim() : '';
        const doctorProfileUrl = $(element).find('div.dr_wrap > div.photo > img').attr('src') ?  $(element).find('div.dr_wrap > div.photo > img').attr('src') : '';
        const detailLink = $(element).find('div.btn_area').find('a:nth-child(2)').attr('href') ? $(element).find('div.btn_area').find('a:nth-child(2)').attr('href') : '';
        //console.log(`detailLink: ${detailLink},doctorName: ${doctorName}`);
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://dongsan.dsmc.or.kr:49870${detailLink}`;
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `https://dongsan.dsmc.or.kr:49870${doctorProfileUrl}`;
        }
        console.log(`Adding doctor list: ${tmpProfileUrl} ${doctorName} ${deptName} ${tmpLink}`); // 디버
        if ( !functions.isEmpty(doctorName) && !functions.isEmpty(detailLink) && doctorName != "일반진료 일반의") {
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

    try{
   
      if (!url) {
        return { error: true, data: null };
      }
    
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
      //let profileImgUrl = $('article.pic > img').attr('src') ?  $('article.pic > img').attr('src')  : '';
      let tmpSpecialty = $('div.doctor_cont').find('div.speci').find('p:nth-child(2)').text() ? $('div.doctor_cont').find('div.speci').find('p:nth-child(2)').text().trim() : '';
      console.log(`tmpSpecialty, ${tmpSpecialty}`);// 학력 경력
      /* if ( functions.isEmpty(profileImgUrl)) {
        profileImgUrl = $('article.profile').find('div.pic > div.pic > img').attr('src') ? $('article.profile').find('div.pic > div.pic > img').attr('src') : '';
      } */
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      
    /*  const tmpProfileImgUrl = functions.isEmpty(profileImgUrl) ? '' : `https://hallym.hallym.or.kr${profileImgUrl}`;
      console.log(`tmpProfileImgUrl, ${tmpProfileImgUrl}, specialtyJson: ${JSON.stringify(specialtyJson)}`);// 학력 경력
      */ 
     let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        //profileImgUrl: tmpProfileImgUrl,
        biography: [],
      };
      const smaple = $('div.prd_btm').find("div.prd_list h4:contains('학력/경력')").next('div').find('dl').length;
  
      $('div.prd_btm').find("div.prd_list h4:contains('학력/경력')").next('div.history').find('dl').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('dt').text() ? $(dtElement).find('dt').text().trim()  : '';
        const dtText = $(dtElement).find('dd > ul > li:first-child').text() ? $(dtElement).find('dd > ul > li:first-child').text().trim()  : '';

        console.log(`경력 : ${dtText}`)
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "경력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });


      $('div.prd_btm').find("div.prd_list h4:contains('학회활동')").next('div.history').find('dl').each((index, dtElement) => {
        
        
        const dtYearText = $(dtElement).find('dt').text() ? $(dtElement).find('dt').text().trim()  : '';
        const dtText = $(dtElement).find('dd > ul > li:first-child').text() ? $(dtElement).find('dd > ul > li:first-child').text().trim()  : '';

        console.log(`학회 : ${dtText}`)
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "학회",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('div.prd_btm').find("div.prd_list h4:contains('수상')").next('div.history').find('dl').each((index, dtElement) => {
    
        const dtYearText = $(dtElement).find('dt').text() ? $(dtElement).find('dt').text().trim()  : '';
        const dtText = $(dtElement).find('dd > ul > li:first-child').text() ? $(dtElement).find('dd > ul > li:first-child').text().trim()  : '';

        console.log(`수상 : ${dtText}`)
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "수상",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });
        
      await browser.close();
      return { error: error, data: item };
    }catch(e){
      Error = error;
      console.log(`error on ${url} API return: ${error}`);
      await browser.close();
      return { 
        error: error, 
        data: {
          specialty: '',
          specialtyJson: null,
          biography: [],
        }
      };
    }
  },

  crwalingProcess03_book: async (url,preData) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    console.log(`crwalingProcess03_book: ${url}`); 
   
    if (!url) {
      return { error: true, data: null };
    }
   
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

    
   /*  const tmpProfileImgUrl = functions.isEmpty(profileImgUrl) ? '' : `https://hallym.hallym.or.kr${profileImgUrl}`;
    console.log(`tmpProfileImgUrl, ${tmpProfileImgUrl}, specialtyJson: ${JSON.stringify(specialtyJson)}`);// 학력 경력
    */ let item = preData;

    $('div.wsize').find('table').each((index, dtElement) => {
      
      const dtYearText = $(dtElement).find('tbody > tr:nth-child(3)').find('td:eq(1)').text() ? $(dtElement).find('tbody > tr:nth-child(3)').find('td:eq(1)').text().trim()  : '';
      const dtTextIssuer = $(dtElement).find('tbody > tr:nth-child(3)').find('td:eq(0)').text() ? $(dtElement).find('tbody > tr:nth-child(3)').find('td:eq(0)').text().trim()  : '';
      const dtText = $(dtElement).find('tbody > tr:nth-child(1)').find('td:eq(0)').text() ? $(dtElement).find('tbody > tr:nth-child(1)').find('td:eq(0)').text().trim()  : '';


      console.log(`저서 : ${dtText}`)
      if ( !functions.isEmpty(dtText) ) {
        const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        const tmpDtTextIssuer = dtTextIssuer.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
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
  },

  crwalingProcess03_press: async (url,preData) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    console.log(`crwalingProcess03_press: ${url}`); 
   
    if (!url) {
      return { error: true, data: null };
    }
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
    });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      // 새 창(팝업)이 열리는 이벤트 감지
      browser.on('targetcreated', async (target) => {
        const popupPage = await target.page();
        if (popupPage) {
            console.log('팝업 감지됨, 자동으로 닫습니다.');
            await popupPage.close(); // 팝업 자동 닫기
        }
      });
      
      // Navigate to the website
      await page.goto(url,{waitUntil: "domcontentloaded"});
      await page.setViewport({
          width: 1200,
          height: 800
      });
        // iframe 선택자
      const iframeSelector = 'iframe[id="the_iframe"]';
      await page.waitForSelector(iframeSelector);
      const iframeElementHandle = await page.$(iframeSelector);

      // iframe 내부 접근
      const iframe = await iframeElementHandle.contentFrame();
      
      // iframe 내부 요소 대기
      await iframe.waitForSelector('div.mscroll table.table1 tbody');
      //page.on('console', msg => console.log('BROWSER LOG:', msg.text()))
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);
    
      let item = preData;
      const tableData = await iframe.evaluate(() => {
        const rows = document.querySelectorAll('div.mscroll table.table1 tbody > tr');
        return Array.from(rows).map(row => {
            return Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
        });
      });
      await browser.close();
      return { error: error, data: tableData };
  } catch (e) {
    error = `element probably not exists at url(${url})`;
    console.log(error);
    return { error, data: preData };
  // }
}
  },

  crwalingProcess03_press2: async (url,preData) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    console.log(`crwalingProcess03_press2: ${url}`); 
   
    if (!url) {
      return { error: true, data: null };
    }
   
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

  
   let item = preData;

    $('div.photo_list').find('ul > li').each((index, dtElement) => {
      
      const dtYearText = $(dtElement).find('div.con_w').find('p.date').text() ? $(dtElement).find('div.con_w').find('p.date').text().trim()  : '';
      const dtText = $(dtElement).find('div.con_w').find('p.tit').find('strong.titname').text() ? $(dtElement).find('div.con_w').find('p.tit').find('strong.titname').text().trim() : '';
      const dtIssuer = $(dtElement).find('div.con_w').find('p.tit').find('span.category_color').text() ? $(dtElement).find('div.con_w').find('p.tit').find('span.category_color').text().trim() : '';
      const dtLinkUrl = $(dtElement).find('a').attr('href') ? $(dtElement).find('a').attr('href') : '';


      console.log(`언론 : ${dtText}`)
      if ( !functions.isEmpty(dtText) ) {
        const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        const tmpLinkUrl = dtLinkUrl.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        const tmpDtIssuer = dtIssuer.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
        item.biography.push({
          targetDate : tmpDtYearText,
          type: "언론",
          text: tmpText,
          url: tmpLinkUrl,
          issuer: tmpDtIssuer
        });
      }
    });

    await browser.close();
    return { error: error, data: item };
  },

  crwalingtreatise: async (url) => {

    if (!url) {
      return { error: true, data: null };
    }
    try {
      let error = null;
      console.log(`crwalingtreatise: ${url}`); 
    
      if (!url) {
        return { error: true, data: null };
      }
    
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
      $('div.wsize').find('table').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('tbody > tr:nth-child(4)').find('td:eq(0)').text() ? $(dtElement).find('tbody > tr:nth-child(4)').find('td:eq(0)').text() : '';
        const dtTextIssuer = $(dtElement).find('tbody > tr:nth-child(3)').find('td:eq(0)').text() ? $(dtElement).find('tbody > tr:nth-child(3)').find('td:eq(0)').text().trim()  : '';
        const dtText = $(dtElement).find('tbody > tr:nth-child(1)').find('td:eq(0)').text() ? $(dtElement).find('tbody > tr:nth-child(1)').find('td:eq(0)').text().trim()  : '';


        console.log(`논문 : ${dtText}, ${dtTextIssuer}, ${dtYearText}`)
        if ( !functions.isEmpty(dtText) && !functions.isEmpty(dtTextIssuer) && !functions.isEmpty(dtYearText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtTextIssuer = dtTextIssuer.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const etc = {
            type: '논문',
            title: tmpText,
            url: null,
            publicationDate : tmpDtYearText,
            journalName : tmpDtTextIssuer
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
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url, profile_url]);
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


  setCrawlingTreatise: async (rid, title, doi, journalName, authorRule, publicationDate, url,abstract, keywords, impactFactor, totalCitations, referencesThesis,doctorName, authorName, subjectClassification, publicationLocation) => {
    let result = null, error = null, DBCode = null, DBData = null;
    try{
      if ( !functions.isEmpty(title) && !functions.isEmpty(publicationDate) && !functions.isEmpty(journalName)) {
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
      }
    }catch(e){
      console.log('error',e);
    }
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



