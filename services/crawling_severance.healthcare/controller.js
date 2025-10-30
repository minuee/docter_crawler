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


  setTimeStamp: async () => {
    let result = null, error = null, DBCode = null
    const now = new Date();
    const gapSec = 5 * 1000;
    // 현재 시간에서 5초 차감
    const makeTs = new Date(now.getTime() - gapSec);
    // 5초 전의 13자리 타임스탬프
    const ts13Digit = makeTs.getTime();
    return { error: error, data: ts13Digit };
  },

  crwalingProcess01: async () => {
    let result = null, error = null, DBCode = null
    const url01 = `https://sev.severance.healthcare/sev/department/department.do`;
    console.log(`url01 : ${url01}`);

    let browser = null;
    try {
      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url01, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div.sev-card-results ul.depart-list > li');
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);
      
      const dept = [];
      $('div.sev-card-results ul.depart-list > li').each((index, element) => {
   
        const name = $(element).find('a > div > span').text().trim();
        const tempLink = $(element).find('a').attr('data-id');
        const link = `https://sev.severance.healthcare/sev/department/department/${tempLink}.do`
        const info = {
          deptName : name,
          link,
        };
        if (name && tempLink) {
          dept.push(info);
        }
      });
      return { error: null, data: dept };

    } catch (e) {
      error = e;
      console.log(`error on ${url01} puppeteer process: ${e}`);
      return { error: error, data: null };
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  },

  crwalingProcess01_old: async () => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }

    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    const url01 = `https://sev.severance.healthcare/sev/department/department.do`;
    try {
      Response = await axios.get(url01, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Referer': 'https://sev.severance.healthcare/sev/doctor/doctor.do'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url01} API return: ${error}`);
    }

    return { error: error, data: Response?.data?.data?.list };
  },

  
  crwalingProcess02: async (link) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    console.log(`crwalingProcess02 : ${link}`);
    if (!link) {
      return { error: true, data: null };
    }
    let browser = null;
    try {
      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(link, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div.doctor-card-wrap ul',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);
    // 쓰레기 태그 날림
      // $('span').empty(); // 못날림 (이름과 진료과가 붙어있음)
      const doctors = [];
      $('div.doctor-card-wrap ul').find("li").each((index, element) => {
        const doctorName = $(element).find('div.doctor-card-box div.card-view dl').find('dt').text().trim();
        const tempLinkEmp = $(element).find('div.doctor-card-box div.card-back').find("div.flip-btns").find('a:first-child').attr('data-emp');
        const tempLinkDept = $(element).find('div.doctor-card-box div.card-back').find("div.flip-btns").find('a:first-child').attr('data-dept');
        const link = `https://sev.severance.healthcare/sev/doctor/doctor-view.do?empNo=${tempLinkEmp}&deptSeq=${tempLinkDept}`
        const profileUrlTmp =$(element).find('div.doctor-card-box div.card-view').find('div.photo > img').attr('src');
        const profileUrl = `https://sev.severance.healthcare${profileUrlTmp}`
        // 의료진 정보를 객체로 저장
        const doctor = {
          doctorName,
          url: link,
          profileUrl
        };
        console.log(`index: ${index}, doctorName: ${doctorName}, link: ${link}, profileUrl: ${profileUrl}`)
        doctors.push(doctor);
      });
      return { error: error, data: doctors };
    } catch (e) {
      error = e;
      console.log(`error on ${link} puppeteer process: ${e}`);
      return { error: error, data: null };
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  },

  crwalingProcess02_old: async (profile) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    const deptName = profile.deptNm
    const doctorName = profile.nm
    const specialty = profile.clnicRealm
    const fullUrl = `https://sev.severance.healthcare/sev/doctor/doctor-view.do?empNo=${profile.empNo}&deptSeq=${profile.deptSeq}`
    const item = {
      deptName: deptName,
      doctorName: doctorName,
      specialty: specialty,
      url: fullUrl
    }
    return { error: error, data: item };
  },

  crwalingProcess03: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    let browser = null;
    console.log(`crwalingProcess03 : ${url}`);

    try {
      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div.profile-intro',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);

      const doctorName = $('h2.profile-name strong.name.nm').first().text().trim();
      const deptName = $('h2.profile-name span.department').first().text().trim();
      const profileImgUrl = $('div.profile-item img').attr('src');
      const specialty = $('p.medical-subject').text().trim();

      const jsonData = [];

      $('div.profile-intro dl').each((index, element) => {
        let type = null
        type = $(element).find('dt.text-title').text().trim(); // 타입(학력 경력)
        $(element).find('dd ul li').each((index2, element2) => {
          const text = $(element2).text().trim(); // 내용
          console.log(`type: ${type}, text: ${text}`);
          if ( type !== '진료분야') {
            const strType = type == '학술활동' ? '학술' : type;
            jsonData.push({
              type: strType,
              text: text
            });
          }
          
        });
      });

      let item = {
        doctorName: doctorName,
        deptName: deptName,
        specialty: specialty,
        profileImgUrl: `https://sev.severance.healthcare${profileImgUrl}`,
        biography: jsonData,
      };

      console.log(`item`);
      console.log(item);
      return { error: error, data: item };
    } catch (e) {
      error = e;
    if (browser !== null) {
        await browser.close();
      }
    }
  },

  crwalingProcess03_new: async (browser, url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    
    console.log(`crwalingProcess03_new : ${url}`);
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForSelector('div.profile-intro',{ timeout: 5000 });
        
        const htmlContent = await page.content();
        const $ = cheerio.load(htmlContent);

        const doctorName = $('h2.profile-name strong.name.nm').first().text().trim();
        const deptName = $('h2.profile-name span.department').first().text().trim();
        const profileImgUrl = $('div.profile-item img').attr('src');
        const specialty = $('p.medical-subject').text().trim();

        const jsonData = [];

        $('div.profile-intro dl').each((index, element) => {
          let type = null
          type = $(element).find('dt.text-title').text().trim(); // 타입(학력 경력)
          $(element).find('dd ul li').each((index2, element2) => {
            const text = $(element2).text().trim(); // 내용
            console.log(`type: ${type}, text: ${text}`);
            if ( type !== '진료분야') {
              const strType = type == '학술활동' ? '학술' : type;
              jsonData.push({
                type: strType,
                text: text
              });
            }
            
          });
        });

        let item = {
          doctorName: doctorName,
          deptName: deptName,
          specialty: specialty,
          profileImgUrl: `https://sev.severance.healthcare${profileImgUrl}`,
          biography: jsonData,
        };

        console.log(`item`);
        console.log(item);
        return { error: error, data: item };
    } catch (e) {
        error = e;
        console.log(`error on ${url} puppeteer process: ${e}`);
        return { error: error, data: null };
    } finally {
        if (page !== null) {
            await page.close();
        }
    }
  },

  crwalingGetTreatiseLink: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    let browser = null;
    
    try {
      console.log(`crwalingGetTreatiseLink : ${url}`);
      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div.profile-intro',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);
      const tempLink = $('ul.tab-list li a:contains("논문")').attr('href');
      const treatiseLink = tempLink ? tempLink : null
      console.log(`treatiseLink: ${treatiseLink}`);
      return { error: error, data: treatiseLink };
    } catch (e) {
      error = e;
      return { error: error, data: null };
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  },

  crwalingGetTreatiseLink_new: async (browser, url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    
    const page = await browser.newPage();
    try {
      console.log(`crwalingGetTreatiseLink_new : ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div.profile-intro',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);
      const tempLink = $('ul.tab-list li a:contains("논문")').attr('href');
      const treatiseLink = tempLink ? tempLink : null
      console.log(`treatiseLink: ${treatiseLink}`);
      return { error: error, data: treatiseLink };
    } catch (e) {
      error = e;
      return { error: error, data: null };
    } finally {
      if (page !== null) {
        await page.close();
      }
    }
  },


  getTreatiseApiLink: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    let tempUrl = url
    let params = null
    let seqValue = null
    let modeValue = null
    let categoryValue = null

    try {
      params = new URLSearchParams(url.split('?')[1]);
      seqValue = params.get('seq');
      modeValue = params.get('mode');
      categoryValue = params.get('search_field');
    } catch (error) {
      console.log(`error on ${url} params return: ${error}`);
    }
    //https://yhrn.yonsei.ac.kr/Search/Result.aspx?search_field=Expert&search_word=&targetFd=Expert&mode=view&seq=38527
    try {
      if (!seqValue || !modeValue || !categoryValue) {
        return { error: error, data: null };
      }
      Response = await axios.post(url,
        {
          mode: modeValue,
          category: categoryValue,
          seq: seqValue
        }, {
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Referer': url,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    console.log(`Response.data : ${Response.data}`)
    const $ = cheerio.load(Response.data);
    return { error: error, data: Response.data };
  },



  getTreatiseLinkTotalCount: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }

    console.log(`getTreatiseLinkTotalCount : ${url}`);

    let browser = null;
    try {
      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div.list_tab',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent)
      let articlesCount = 0
      const articlesText = $('div.list_tab ul li:first-child span').text();
      articlesCount = parseInt(articlesText.match(/\((\d+)\)/)[1]);
      console.log(`articlesCount: ${articlesCount}`);
      return { error: error, data: articlesCount };
    } catch (e) {
      error = e;
      return { error: error, data: null };
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  },

  getTreatiseLinkTotalCount_new: async (browser, url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }

    console.log(`getTreatiseLinkTotalCount_new : ${url}`);

    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('div.list_tab',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent)
      let articlesCount = 0
      const articlesText = $('div.list_tab ul li:first-child span').text();
      articlesCount = parseInt(articlesText.match(/\((\d+)\)/)[1]);
      console.log(`articlesCount: ${articlesCount}`);
      return { error: error, data: articlesCount };
    } catch (e) {
      error = e;
      return { error: error, data: null };
    } finally {
      if (page !== null) {
        await page.close();
      }
    }
  },


  getTreatiseDetail: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let items = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`getTreatiseDetail : ${url}`);
    
    let browser = null;
    try {
      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('table.list_tbl',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent)
      const arrLinks = []
      $('table.list_tbl tbody tr').each((index, element) => {
        const firstLink = $(element).find('td.alleft_td a').first().attr('href');
        const title = $(element).find('td.alleft_td a').first().text().trim();
        items = {
          title,
          url: `https://ir.ymlib.yonsei.ac.kr/${firstLink}`
        }
        console.log(`firstLink: ${items.title}`);
        arrLinks.push(items)
      });


      return { error: error, data: arrLinks };
    } catch (e) {
      error = e;
      return { error: error, data: null };
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  },

  getTreatiseDetail_new: async (browser, url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let items = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`getTreatiseDetail_new : ${url}`);
    
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('table.list_tbl',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent)
      const arrLinks = []
      $('table.list_tbl tbody tr').each((index, element) => {
        const firstLink = $(element).find('td.alleft_td a').first().attr('href');
        const title = $(element).find('td.alleft_td a').first().text().trim();
        items = {
          title,
          url: `https://ir.ymlib.yonsei.ac.kr/${firstLink}`
        }
        console.log(`firstLink: ${items.title}`);
        arrLinks.push(items)
      });


      return { error: error, data: arrLinks };
    } catch (e) {
      error = e;
      return { error: error, data: null };
    } finally {
      if (page !== null) {
        await page.close();
      }
    }
  },

  del_crawlingdoctor_treatise: async (p_rid) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL del_crawlingdoctor_treatise(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_rid]);
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



  setTreatiseDetail: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`setTreatiseDetail : ${url}`);
   
    let browser = null;
    try {
      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('p.view_title',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent)
      const treatise = []
      const PaperName = $('p.view_title').text().trim().replace(/\t/g, '').replace(/\n/g, '');
      let Titem = {
        title: PaperName ? PaperName : null,
        doi: null,
        journalName: null,
        authorRule: null,
        publicationDate: null,
        url: null,
        authorName: null,
        abstract: null,
        keywords: null,
        impactFactor: 0,
        totalCitations: 0,
        referencesThesis: null,
        subjectClassification: null,
        publicationLocation: null
      }


      $('dl.row_dl').each((index, element) => {
        const dtText = $(element).find('dt').text().trim();
        if (dtText === 'Authors') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.authorName = ddText ? ddText : null
        }
        if (dtText === 'Journal Title') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.journalName = ddText ? ddText : null
        }
        if (dtText === 'Keywords') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.keywords = ddText ? ddText : null
        }
        if (dtText === 'Abstract') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.abstract = ddText ? ddText : null
        }
        if (dtText === 'URI') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.url = ddText ? ddText : null
        }
        //
        if (dtText === 'Issue Date') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);

          if (CS.YYYY_MM_DD(ddText)) {
            Titem.publicationDate = CS.YYYY_MM_DD(ddText)
          }
        }
        if (dtText === 'DOI') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.doi = ddText ? ddText : null
        }
      });
      console.log(Titem);


      return { error: error, data: Titem };
    } catch (e) {
      error = e;
      return { error: error, data: null };
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  },

  setTreatiseDetail_new: async (browser, url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    console.log(`setTreatiseDetail_new : ${url}`);
   
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('p.view_title',{ timeout: 5000 });
      
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent)
      const treatise = []
      const PaperName = $('p.view_title').text().trim().replace(/\t/g, '').replace(/\n/g, '');
      let Titem = {
        title: PaperName ? PaperName : null,
        doi: null,
        journalName: null,
        authorRule: null,
        publicationDate: null,
        url: null,
        authorName: null,
        abstract: null,
        keywords: null,
        impactFactor: 0,
        totalCitations: 0,
        referencesThesis: null,
        subjectClassification: null,
        publicationLocation: null
      }


      $('dl.row_dl').each((index, element) => {
        const dtText = $(element).find('dt').text().trim();
        if (dtText === 'Authors') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.authorName = ddText ? ddText : null
        }
        if (dtText === 'Journal Title') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.journalName = ddText ? ddText : null
        }
        if (dtText === 'Keywords') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.keywords = ddText ? ddText : null
        }
        if (dtText === 'Abstract') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.abstract = ddText ? ddText : null
        }
        if (dtText === 'URI') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.url = ddText ? ddText : null
        }
        //
        if (dtText === 'Issue Date') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);

          if (CS.YYYY_MM_DD(ddText)) {
            Titem.publicationDate = CS.YYYY_MM_DD(ddText)
          }
        }
        if (dtText === 'DOI') {
          const ddText = $(element).find('dd').text().trim();
          console.log(`Text: ${ddText}`);
          Titem.doi = ddText ? ddText : null
        }
      });
      console.log(Titem);


      return { error: error, data: Titem };
    } catch (e) {
      error = e;
      return { error: error, data: null };
    } finally {
      if (page !== null) {
        await page.close();
      }
    }
  },




  setCrawlingTreatise: async (rid, title, doi, journalName, authorRule, publicationDate, url,
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



