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

      $('div.list').find('ul.clinic_sel > li').each((index, element) => {

        const deptName = $(element).find('a > span').text() ?$(element).find('a > span').text() : '';
        const tmpLink = $(element).find('a').attr('href') ? $(element).find('a').attr('href') : '';

        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://hallym.hallym.or.kr${tmpLink}`;
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
      $('table.dor_sch_list').find('tbody > tr > td').each((index, element) => {
        const doctorName = $(element).find('a:first-child > div').text() ? $(element).find('a:first-child > div').text().trim() : '';
        const detailLink = $(element).find('a:first-child').attr('href') ? $(element).find('a:first-child').attr('href') : '';
        //console.log(`detailLink: ${detailLink},doctorName: ${doctorName}`);
        let tmpLink = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://hallym.hallym.or.kr/${detailLink}`;
        }
        console.log(`Adding doctor list: ${index} ${doctorName} ${deptName} ${tmpLink}`); // 디버
        if ( !functions.isEmpty(doctorName) && !functions.isEmpty(detailLink) ) {
          const doctor = {
            doctorName,
            deptName,
            url: tmpLink,
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

      let exists = false;
      try {
        exists = await page.$eval("section.content > div > ul > li:nth-child(4) > a", ele => ele ? true : false);
        console.log("exists",exists)
        if ( exists ) {
          await page.click("section.content > div > ul > li:nth-child(4) > a");
          await page.waitForSelector('div#boardContents', { visible: true, timeout: 10000 });
        }
      }catch(e){
        console.log('errro ',e)
      }
      
      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  

      

      // $(`#layer_pop_${doctor_id}`).attr('disabled', 'disabled').css('display', 'block');
      let profileImgUrl = $('article.pic > img').attr('src') ?  $('article.pic > img').attr('src')  : '';
      let tmpSpecialty = $('article.profile').find('div.denti').find('p').text() ? $('article.profile').find('div.denti').find('p').text().trim() : '';
      if ( functions.isEmpty(tmpSpecialty) ) {
        tmpSpecialty = $('article.detail').find('div.part_txt').find('p').text() ? $('article.detail').find('div.part_txt').find('p').text().trim() : '';
      }
      if ( functions.isEmpty(profileImgUrl)) {
        profileImgUrl = $('article.profile').find('div.pic > div.pic > img').attr('src') ? $('article.profile').find('div.pic > div.pic > img').attr('src') : '';
      }
      // 진료분야를 json화 한다

      let specialtyJson = tmpSpecialty.split(",");
      
      const tmpProfileImgUrl = functions.isEmpty(profileImgUrl) ? '' : `https://hallym.hallym.or.kr${profileImgUrl}`;
      console.log(`tmpProfileImgUrl, ${tmpProfileImgUrl}, specialtyJson: ${JSON.stringify(specialtyJson)}`);// 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        profileImgUrl: tmpProfileImgUrl,
        biography: [],
      };

  
      //const smaple = $('#_careerContainer').find('._careerIem:first-child > td').text();
      //console.log(`_press: ${smaple}`);
      let check_career1 = 0;
      $('#tab_con01').find('div.tab01_inner > div').find("h4:contains('학력')").next('table').find('tbody > tr > td > p').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('span:nth-child(1)').text() ? $(dtElement).find('span:nth-child(1)').text().trim()  : '';
        const dtText = $(dtElement).find('span:nth-child(2)').text() ? $(dtElement).find('span:nth-child(2)').text().trim()  : '';
        console.log(`학력 : ${dtText}`)
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "학력",
            text: tmpText,
            url: null,
            issuer:null
          });
          check_career1++;
        }
      });

      if ( check_career1 == 0 ) {
        $('#tab_con01').find("h3:contains('학력')").next('table').find('tbody > tr > td > p').each((index, dtElement) => {
          const dtYearText = $(dtElement).find('span:nth-child(1)').text() ? $(dtElement).find('span:nth-child(1)').text().trim()  : '';
          const dtText = $(dtElement).find('span:nth-child(2)').text() ? $(dtElement).find('span:nth-child(2)').text().trim()  : '';
          console.log(`학력 2222222: ${dtText}`)
          if ( !functions.isEmpty(dtText) ) {
            const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            item.biography.push({
              targetDate : tmpDtYearText,
              type: "학력",
              text: tmpText,
              url: null,
              issuer:null
            });
          }
        });
      }

      let check_career2 = 0;
      $('#tab_con01').find('div.tab01_inner > div').find("h4:contains('경력')").next('table').find('tbody > tr > td > p').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('span:nth-child(1)').text() ? $(dtElement).find('span:nth-child(1)').text().trim()  : '';
        const dtText = $(dtElement).find('span:nth-child(2)').text() ? $(dtElement).find('span:nth-child(2)').text().trim()  : '';
        console.log(`학력 : ${dtText}`)
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "학력",
            text: tmpText,
            url: null,
            issuer:null
          });
          check_career2++;
        }
      });

      if ( check_career2 == 0 ) {
        $('#tab_con02').find("h3:contains('경력')").next('table').find('tbody > tr > td > p').each((index, dtElement) => {
        
          const dtYearText = $(dtElement).find('span:nth-child(1)').text() ? $(dtElement).find('span:nth-child(1)').text().trim()  : '';
          const dtText = $(dtElement).find('span:nth-child(2)').text() ? $(dtElement).find('span:nth-child(2)').text().trim()  : '';
          console.log(`경력 2222: ${dtText}`)
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
      }

      $('#tab_con01').find('div.tab01_inner > div').find("h4:contains('학회활동')").next('table').find('tbody > tr > td > p').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('span:nth-child(1)').text() ? $(dtElement).find('span:nth-child(1)').text().trim()  : '';
        const dtText = $(dtElement).find('span:nth-child(2)').text() ? $(dtElement).find('span:nth-child(2)').text().trim()  : '';
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

      $('#tab_con01').find('div.tab01_inner > div').find("h4:contains('수상이력')").next('table').find('tbody > tr > td > p').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('span:nth-child(1)').text() ? $(dtElement).find('span:nth-child(1)').text().trim()  : '';
        const dtText = $(dtElement).find('span:nth-child(2)').text() ? $(dtElement).find('span:nth-child(2)').text().trim()  : '';
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

      let check_career3 = 0;
      $('#tab_con03').find('div.tab01_inner > ul > li').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('p.date').text() ? $(dtElement).find('p.date').text().trim()  : '';
        const dtText = $(dtElement).find('p.tit > a').text() ? $(dtElement).find('p.tit > a').text().trim()  : '';
        const dtIssuer = $(dtElement).find('p.news').text() ? $(dtElement).find('p.news').text().trim()  : '';
        const dtUrl = $(dtElement).find('p.tit > a').attr('href') ? $(dtElement).find('p.tit > a').attr('href')  : '';
        console.log(`언론222222 : ${dtText}`)
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const tmpDtIssuer = dtIssuer.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          item.biography.push({
            targetDate : tmpDtYearText,
            type: "언론",
            text: tmpText,
            url: dtUrl,
            issuer:tmpDtIssuer
          });
          check_career3++;
        }
      });
      
      if ( check_career3 == 0 ) {
        /* await page.click("section.content > div > ul > li:nth-child(4) > a");
        await CS.wait(1000);
        await page.waitForSelector('div#boardContents', { visible: true, timeout: 10000 }); */
        const ssss = $('section.content > div > ul > li:nth-child(4) > a').attr('href');
        console.log("ssssss,", ssss)
        const ssss2 = $('#tab_con06').find('table').attr('class');
        console.log("ssss2,", ssss2)
        $('#tab_con06').find('table').find('tbody > tr > td > p').each((index, dtElement) => {
        
          const dtYearText = $(dtElement).find('span').text() ? $(dtElement).find('span').text().trim()  : '';
          const dtText = $(dtElement).find('a').text() ? $(dtElement).find('a').text().trim()  : '';
          const dtIssuer = '';
          const dtUrl = $(dtElement).find('a').text() ? $(dtElement).find('a').text().trim()  : '';
          console.log(`언론보도 222222: ${dtText}`)
          if ( !functions.isEmpty(dtText) ) {
            const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            const tmpDtYearText = dtYearText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
            const tmpDtIssuer = dtIssuer
            item.biography.push({
              targetDate : tmpDtYearText,
              type: "언론",
              text: tmpText,
              url: dtUrl,
              issuer:tmpDtIssuer
            });
          }
        });
      }
      
      await browser.close();
      return { error: error, data: item };

    
  },

  crwalingtreatise: async (url) => {
    let result = null, error = null, DBCode = null;
    let Response = { status: null, data: null }
    console.log(`crwalingtreatise: ${url}`); 
    
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
     
      // 학력 경력
      let item = {
        biography: [],
      };

      const tmpArr = $('#tab_con02').find('div.tab01_inner').find('div.thesis_list').html();
      if ( !functions.isEmpty(tmpArr) ) {
        const tmpArr2 = tmpArr.trimStart().trimEnd();
        console.log(`tmpArr2 : ${tmpArr2}`)
        const arr = await tmpArr2.split("<br><br>");
        console.log(`arr : ${arr},  ${typeof arr}`)
        if ( arr?.length > 0 ) {
          arr.forEach(dtElement => {
            //const dtText = $(dtElement) ? $(dtElement).trim() : '';
            if ( !functions.isEmpty(dtElement) ) {
              console.log(`dtText : ${dtElement}`)
              const etc = {
                type: '논문',
                title: dtElement.replaceAll(/\n|\r|/g, ''),
                url: null,
              };
              item.biography.push(etc);
            }
          })
        } 
      }

      if ( item.biography.length == 0 ) {
        const tmpArr =  $('#tab_con05').find('table').find('tbody > tr > td > p').html();
        if ( !functions.isEmpty(tmpArr) ) {
          const tmpArr2 = tmpArr.trimStart().trimEnd();
          console.log(`tmpArr2 333333 : ${tmpArr2}`)
          const arr = await tmpArr2.split("<br><br>");
          console.log(`arr 3333333: ${arr},  ${typeof arr}`)
          if ( arr?.length > 0 ) {
            arr.forEach(dtElement => {
              //const dtText = $(dtElement) ? $(dtElement).trim() : '';
              if ( !functions.isEmpty(dtElement) ) {
                console.log(`dtText 33333: ${dtElement}`)
                const etc = {
                  type: '논문',
                  title: dtElement.replaceAll(/\n|\r|/g, ''),
                  url: null,
                };
                item.biography.push(etc);
              }
            })
          } 
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

  setCrawlingDoctorLink_old: async (rid, hid, deptName, doctorName, url) => {
    let result = null, error = null, DBCode = null, DBData = null

    console.log(`setCrawlingDoctorLink: ${rid.length} ${hid} ${deptName} ${doctorName} ${url}`);
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



