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
      console.log(`r_url: ${r_url}`);
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
      ///console.log(`r_url: ${r_url} ${$('div.medi_index_wrap').attr('class')}`);
      $('div.depart_list').find('ul > li').each((index, element) => {

        const deptName = $(element).find('a').text() ? $(element).find('a').text().trim() : '';
        const tmpLink = $(element).find('a').attr('href') ? $(element).find('a').attr('href'): '' ; 
        
        if ( !functions.isEmpty(tmpLink) ) {
          const link = `https://www.knuch.kr:442${tmpLink}`;
          console.log(`tmpLinkDepthNo:${deptName} ${link}`);
          dept.push({ 
            deptName,
            link,
          });
        }
      });

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
      $('div.doctor_box > dl').each((index, element) => {
        const doctorName = $(element).find('dd').find('div.name_box > p.name').text() ? $(element).find('dd').find('div.name_box > p.name').text().trim() : '';
        const detailLink = $(element).find('dd').find('div.name_box > ul > li > a').attr('href') ? $(element).find('dd').find('div.name_box > ul > li > a').attr('href') : '';
        let link = detailLink ? `https://www.knuch.kr:442${detailLink}` : "";
       
        const profileUrlTmp = $(element).find('dt.pic').find('img').attr('src') ? $(element).find('dt.pic').find('img').attr('src') : '';
        const profileUrl = profileUrlTmp ? `https://www.knuch.kr:442${profileUrlTmp}` : '';
        console.log(`doctorName:${doctorName} detailLink:${link}, profileUrl:${profileUrl}`);
        if ( !functions.isEmpty(doctorName) && !functions.isEmpty(link) && doctorName != '일반의사') {
          const doctor = {
            doctorName : doctorName,
            deptName,
            url: link,
            profileUrl
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
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`linkUrl: ${url} `);
   
    try {
      const browser = await puppeteer.launch({
        //headless:false,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
      ]
      });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      //await page.on("dialog", async (dialog) => { await dialog.accept(); });
      //await page.waitForSelector('.inner');
      // Navigate to the website
      await page.goto(url,{waitUntil: "domcontentloaded"});
      await page.setViewport({
          width: 1200,
          height: 800
      });
      
      /* const rawContent = await page.evaluate(() => {
        const resultsDiv = document.querySelector("div.results");
        return resultsDiv ? resultsDiv.innerHTML : "";
      }); */
      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      // $(`#layer_pop_${doctor_id}`).attr('disabled', 'disabled').css('display', 'block');
      const profileImgUrl = $('div.detail_area').find('p.pic > img').attr('src') ? $('div.detail_area').find('p.pic > img').attr('src')  : '';
      console.log(`profileImgUrl: ${profileImgUrl} `);
      let tmpSpecialty = $('div.info').find("p.treat").text() ? $('div.info').find("p.treat").text().trim()  : '';
      console.log(`tmpSpecialty: ${tmpSpecialty}`);
      if ( functions.isEmpty(tmpSpecialty)) {
        
        tmpSpecialty = $('div.detail_area').find('div.info > p:nth-child(4)').text() ? $('div.detail_area').find('div.info > p:nth-child(4)').text().trim()  : '';
        console.log(`tmpSpecialty: is Empty ${tmpSpecialty}`);
      }
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.trim().split(",");
      //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);

      // 학력 경력
      
      let item = {
        specialty: functions.isEmpty(tmpSpecialty) ? "" : tmpSpecialty.trim(),
        specialtyJson: functions.isEmpty(tmpSpecialty) ? "" : specialtyJson,
        profileImgUrl: functions.isEmpty(profileImgUrl) ? "" : `https://www.snubh.org/${profileImgUrl}`,
        biography: [],
      };
      
      const sections = ['학력', '경력', '학회활동', '수상경력'];
      const careerResult = {};

      $('p.stit').each((i, el) => {
        const title = $(el).text().trim();
        if (!sections.includes(title)) return;
      
        const list = [];
        let sibling = $(el)[0].nextSibling;
      
        while (sibling) {
          // 종료 조건: 다음 p.stit 등장
          if (sibling.type === 'tag' && sibling.name === 'p' && $(sibling).hasClass('stit')) break;
      
          if (sibling.type === 'text') {
            const text = sibling.nodeValue.trim();
            if (text) list.push(text);
          } else if (sibling.type === 'tag') {
            const tag = $(sibling);
      
            // <p><span>...</span></p>
            if (sibling.name === 'p') {
              // <p> 안에 span이 있는 경우
              if (tag.find('span').length > 0) {
                tag.find('span').each((_, span) => {
                  const txt = $(span).text().trim();
                  if (txt) list.push(txt);
                });
              } else {
                // <p> 안에 text + <br>로 구분된 경우
                const htmlContent = tag.html(); // 내부 HTML
                const lines = htmlContent.split(/<br\s*\/?>/i);
                lines.forEach(line => {
                  const txt = cheerio.load(`<div>${line}</div>`)('div').text().trim();
                  if (txt) list.push(txt);
                });
              }
            }
      
            // <span>...</span>
            if (sibling.name === 'span') {
              const txt = tag.text().trim();
              if (txt) list.push(txt);
            }
          }
      
          sibling = sibling.nextSibling;
        }
      
        careerResult[title] = list;
      });

 
      if ( !functions.isEmpty(careerResult['학력']) )  {
        //console.log('careerResult 학력',careerResult['학력']);
        careerResult['학력'].forEach((dtElement, index) => {
          //console.log(`dtText: ${index}, ${dtElement}`);
          const dtYearText = '';
          
          if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {
            console.log(`학력: ${dtElement?.length}, ${dtElement}`);
            //const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            const tmpDtYearText = dtYearText;
            item.biography.push({
              targetDate : tmpDtYearText,
              type: "학력",
              text: dtElement,
              url: null,
              issuer:null
            });
          }
        });
      }

      if ( !functions.isEmpty(careerResult['경력']) )  {
        //console.log('careerResult 경력',careerResult['경력']);
        careerResult['경력'].forEach((dtElement, index) => {
          const dtYearText = '';
          
          if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {
            console.log(`경력: ${dtElement?.length}, ${dtElement}`);
            //const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            const tmpDtYearText = dtYearText;
            item.biography.push({
              targetDate : tmpDtYearText,
              type: "경력",
              text: dtElement,
              url: null,
              issuer:null
            });
          }
        });
      }

      if ( !functions.isEmpty(careerResult['학회활동']) )  {
        //console.log('careerResult 22',careerResult['학회활동']);
        careerResult['학회활동'].forEach((dtElement, index) => {
          const dtYearText = '';
          
          if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {
            console.log(`학회: ${dtElement?.length}, ${dtElement}`);
            //const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            const tmpDtYearText = dtYearText;
            item.biography.push({
              targetDate : tmpDtYearText,
              type: "학회",
              text: dtElement,
              url: null,
              issuer:null
            });
          }
        });
      }

      if ( !functions.isEmpty(careerResult['수상경력']) )  {
        //console.log('careerResult 22',careerResult['수상경력']);
        careerResult['수상경력'].forEach((dtElement, index) => {
          const dtYearText = '';
          
          if ( !functions.isEmpty(dtElement) && dtElement?.length > 10 ) {
            console.log(`수상: ${dtElement?.length}, ${dtElement}`);
            //const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            const tmpDtYearText = dtYearText;
            item.biography.push({
              targetDate : tmpDtYearText,
              type: "수상",
              text: dtElement,
              url: null,
              issuer:null
            });
          }
        });
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

  crwalingProcess03_book: async (url,preData) => {

    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`linkUrl: ${url} `);
   
    try {
      const browser = await puppeteer.launch({
        //headless:false,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
      ]
      });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      //await page.on("dialog", async (dialog) => { await dialog.accept(); });
      //await page.waitForSelector('.inner');
      // Navigate to the website
      await page.goto(url,{waitUntil: "domcontentloaded"});
      await page.setViewport({
          width: 1200,
          height: 800
      });
      
      /* const rawContent = await page.evaluate(() => {
        const resultsDiv = document.querySelector("div.results");
        return resultsDiv ? resultsDiv.innerHTML : "";
      }); */
      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      
      let item = preData;

      const target = $('h3.tit').filter((_, el) => $(el).text().trim() === '논문/저서');
      const arr = [];
      target.each((_, h3) => {
        let sibling = $(h3).next();

        while (sibling.length) {
          if (sibling.is('h3.tit')) break; // 다음 섹션 도달 시 종료

          // <ol><li>...</li></ol> 케이스
          if (sibling.find('ol > li').length > 0) {
            sibling.find('ol > li').each((_, li) => {
              const dtText = ($(li).text() || '').trim();
              console.log(`저서 : ${dtText}`)
              if ( !functions.isEmpty(dtText) && dtText?.length > 10) {
                const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                item.biography.push({
                  targetDate : null,
                  type: "저서",
                  text: tmpText,
                  url: null,
                  issuer:null
                });
              }
            });
          }

          // <span>...</span><span>...</span> 케이스
          else if (sibling.find('span').length > 0) {
            sibling.find('span').each((_, span) => {
              const dtText = ($(span).text() || '').trim();
              console.log(`저서 : ${dtText}`)
              if ( !functions.isEmpty(dtText) && dtText?.length > 10) {
                const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                item.biography.push({
                  targetDate : null,
                  type: "저서",
                  text: tmpText,
                  url: null,
                  issuer:null
                });
              }
            });
          }
          sibling = sibling.next();
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


  crwalingProcess03_press: async (url,preData) => {

    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`linkUrl: ${url} `);
   
    try {
      const browser = await puppeteer.launch({
        //headless:false,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
      ]
      });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      //await page.on("dialog", async (dialog) => { await dialog.accept(); });
      //await page.waitForSelector('.inner');
      // Navigate to the website
      await page.goto(url,{waitUntil: "domcontentloaded"});
      await page.setViewport({
          width: 1200,
          height: 800
      });
      
      /* const rawContent = await page.evaluate(() => {
        const resultsDiv = document.querySelector("div.results");
        return resultsDiv ? resultsDiv.innerHTML : "";
      }); */
      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      
      let item = preData;
      
      $('div.table_blist').find('tbody > tr').each((index, dtElement) => {
      
        const dtYearText = $(dtElement).find('td:eq(0)').text() ? $(dtElement).find('td:eq(0)').text().trim()  : '';
        const dtTextIssuer =  $(dtElement).find('td:eq(1)').text() ? $(dtElement).find('td:eq(1)').text().trim()  : '';
        const dtText = $(dtElement).find('td:eq(2) > a').text() ?  $(dtElement).find('td:eq(2) > a').text().trim()  : '';
        const dtLink = $(dtElement).find('td:eq(2) > a').attr('href') ? $(dtElement).find('td:eq(2) > a').attr('href')   : '';
  
        console.log(`언론 : ${dtText}`)
        if ( !functions.isEmpty(dtText) && dtText?.length > 10 ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText =  dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtTextIssuer =  dtTextIssuer.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "언론",
            text: tmpText,
            url: dtLink,
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
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`linkUrl: ${url} `);
   
    try {
      const browser = await puppeteer.launch({
        //headless:false,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-first-run',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
      ]
      });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      await page.on("dialog", async (dialog) => { await dialog.accept(); });
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

      const target = $('h3.tit').filter((_, el) => $(el).text().trim() === '논문/저서');
      const arr = [];
      target.each((_, h3) => {
        let sibling = $(h3).next();

        while (sibling.length) {
          if (sibling.is('h3.tit')) break; // 다음 섹션 도달 시 종료

          // <ol><li>...</li></ol> 케이스
          if (sibling.find('ol > li').length > 0) {
            sibling.find('ol > li').each((_, li) => {
              const dtText = ($(li).text() || '').trim();
              console.log(`저서 : ${dtText}`)
              if ( !functions.isEmpty(dtText) && dtText?.length > 10) {
                const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                const etc = {
                  type: '논문',
                  title: tmpText,
                  url: null,
                };
                item.biography.push(etc);
              }
            });
          }

          // <span>...</span><span>...</span> 케이스
          else if (sibling.find('span').length > 0) {
            sibling.find('span').each((_, span) => {
              const dtText = ($(span).text() || '').trim();
              console.log(`저서 : ${dtText}`)
              if ( !functions.isEmpty(dtText) && dtText?.length > 10) {
                const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                const etc = {
                  type: '논문',
                  title: tmpText,
                  url: null,
                };
                item.biography.push(etc);
              }
            });
          }
          sibling = sibling.next();
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



