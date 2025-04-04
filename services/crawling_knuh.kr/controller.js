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
      $('div.doctor_list').find('ul > li').each((index, element) => {

        const deptName = $(element).find('a').text() ? $(element).find('a').text().trim() : '';
        const tmpLink = $(element).find('a').attr('href') ? $(element).find('a').attr('href'): '' ; 
        
        if ( !functions.isEmpty(tmpLink) ) {
          const link = `https://www.knuh.kr${tmpLink}`;
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
       
        const link = `https://www.knuh.kr${detailLink}`;
        console.log(`doctorName:${doctorName} detailLink:${link}`);
        if ( !functions.isEmpty(doctorName) && !functions.isEmpty(link) && doctorName != '일반의사') {
          const doctor = {
            doctorName : doctorName,
            deptName,
            url: link,
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
      
      /* // 텍스트와 줄바꿈 태그만 남기기
      const cleanedContent = rawContent
      .replaceAll(/<!--[\s\S]*?-->/g, "") // 주석 제거
      .replaceAll(/<br\s*\/?>/gi, "\n") // <br> 태그 → 줄바꿈
      .replaceAll(/<p\s*\/?>/gi, "\n") // <br> 태그 → 줄바꿈
      .replaceAll(/<\/?[^>]+(>|$)/g, "") // 나머지 태그 제거
      .trim();

      // 자동 분류 (정확한 카테고리 매칭)
      function categorizeContent2(text) {
        const categories = {};
        let currentCategory = null;

        // 학력, 경력, 논문, 수상경력 등의 패턴 목록
        const categoryPatterns = [
          "학력",
          "경력",
          "학회활동",
          "수상경력",
          "특허",
          "논문 및 저서",
        ];

        text.split("\n").forEach((line) => {
          line = line.trim();
          if (!line) return;

          // 현재 줄이 카테고리인지 확인
          const matchedCategory = categoryPatterns.find((pattern) =>
            line.includes(pattern)
          );

          if (matchedCategory) {
            // 새로운 카테고리 시작
            currentCategory = matchedCategory;
            categories[currentCategory] = [];
          } else if (currentCategory) {
            // 기존 카테고리에 추가
            categories[currentCategory].push(line);
          }
        });

        return categories;
      }

      // 자동 분류 (패턴 기반)
      function categorizeContent(text) {
        const categories = {};
        let currentCategory = "기타"; // 기본값

        text.split("\n").forEach((line) => {
          line = line.trim();
          if (!line) return;

          // 카테고리 제목 찾기 (예: "학력", "경력", "논문 및 저서" 등)
          if (/^(학력|경력|논문|수상|특허|학회활동)/.test(line)) {
            currentCategory = line;
            categories[currentCategory] = [];
          } else {
            categories[currentCategory] = categories[currentCategory] || [];
            categories[currentCategory].push(line);
          }
        });

        return categories;
      }

      const categorizedData = categorizeContent2(cleanedContent);

      console.log(JSON.stringify(categorizedData)); */

      // 필요한 데이터 가져오기
      const result = await page.evaluate(() => {
        const groups = [];
        let currentGroup = { title: "", contents: [] };

        const elements = document.querySelectorAll("div.results *"); // 모든 태그 탐색

        elements.forEach(el => {
            if (el.tagName.match(/H[1-6]|STRONG|B|SPAN/)) {
                // 새로운 제목이 나오면 이전 그룹 저장 후 새 그룹 시작
                if (currentGroup.contents.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = { title: el.innerText.trim(), contents: [] };
            } else if (el.tagName === "P") {
                // <p> 태그 내 모든 자식 요소를 하나의 텍스트로 변환
                let text = el.innerText.replace(/\s+/g, " ").trim();
                if (text) {
                    currentGroup.contents.push(text);
                }
            }
        });

        // 마지막 그룹 추가
        if (currentGroup.contents.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    });
    console.log(JSON.stringify(result, null, 2));
  
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
      $('#cont_wrap4').find("div.bh_mgb25:nth-child(1)").find('ul > li').each((index, dtElement) => {
        const dtYearText = '';
        const dtText = $(dtElement).find('p.title').text() ? $(dtElement).find('p.title').text().trim() : '';  
        console.log(`논문: ${dtYearText} ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.trim().replaceAll(/\t/g, '').replaceAll(/\n/g, '').replaceAll(/\n|\r|\s*/g, '');
          const etc = {
            type: '논문',
            title: tmpText,
            url: null,
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



