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


let browser = null;


module.exports = {

  Process01: async () => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    // const url01 = `https://med.khmc.or.kr/kr/treatment/department/list.do`;
    const url01 = `https://seoul.eumc.ac.kr/medical/dept/deptList.do`;
    
    console.log(`url01`, url01)
    // try {
    //   Response = await axios.get(url01, {
    //     headers: {
    //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    //       // 'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
    //       'Referer': 'https://seoul.eumc.ac.kr/kr/index.do'
    //     }
    //   })
    // } catch (error) {
    //   Error = error
    //   console.log(`error on ${url01} API return: ${error}`);
    // }
    browser = await puppeteer.launch();
    // Open a new page
    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url01);

    await page.waitForSelector('.partList > div');

    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);

    // const appcontent = $('div#app').html();

    const optionsArray = [];
    $('.partList > div').each((index, item) => {
      // console.log(`item >>>>>>>>>>>>>>`)
      // console.log(item)
      // const title = $(item).find('div.imglist_outer p').first().text().trim();
      const title = $(item).find('span').text().trim();
      const link = $(item).find('.hover .btnWrap a:nth-of-type(2)').attr('href');
      console.log(`title`, title)
      console.log(`link`, link)
      if(title) {
        const url = `https://seoul.eumc.ac.kr/medical/dept/${link}`;
        optionsArray.push({
          title,
          link: url
        });
      }
    });

    page.close();

    return { error: error, data: optionsArray };
  },


  Process02: async (url) => {
    let result = null, Error, error = null, DBCode = null
    // let DBData1 = null
    // let DBData2 = null
    // let Response = { status: null, data: null }
    // const url = `https://med.khmc.or.kr/kr/treatment/department/list.do`;
    
    // try {
    //   Response = await axios.get(url, {
    //     headers: {
    //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    //       'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
    //       'Referer': 'https://seoul.eumc.ac.kr/kr/index.do'
    //     }
    //   })
    // } catch (error) {
    //   Error = error
    //   console.log(`error on ${url} API return: ${error}`);
    // }
    console.log(`url`, url);

    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url);

    await new Promise(r => setTimeout(r, 3000));

    try {
      // await page.waitForSelector('.doctorList .dL_line .profile_box');
      await page.waitForSelector('.panel-list > div', { timeout: 5000 });
    } catch (e) {
      error = `element(.profile_box) probably not exists at url(${url})`;
      console.log(error);
      return { error, data: null };
    }


    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);

    // const body = $('body').html();

    const doctorArray = [];
    const deptName = $('.heading.heading-depth01 > h2.title').text().trim();

    $('.panel-list > div.item').each((index, item) => {
      //tit_sectin inner h2
      let doctorName = $(item).find('.card-body > .title > a').text().trim();
      doctorName = doctorName.split(' ')[0];
      console.log(`doctorName`, doctorName);

      const onclickValue = $(item).find('.btnGroup-horizontal a:nth-of-type(2)').attr('onclick')

      // const pattern = /drProfile\('([0-9A-Za-z]+)', '([A-Z]+)'\)/;
      const pattern = /drProfile\('([0-9A-Za-z]+)', '(.*)'\)/;
      const matches = onclickValue.match(pattern);
      const dr_sid = matches[1];
      const dept_cd = matches[2];
      console.log(`dr_sid`, dr_sid);
      console.log(`dept_cd`, dept_cd);

      const link = `https://seoul.eumc.ac.kr/doctor/basicInfo.do?dr_sid=${dr_sid}&dept_cd=${dept_cd}`;
      
      if(doctorName && link){
        doctorArray.push({
          deptName: deptName,
          doctorName: doctorName,
          link
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


  Process03: async (url) => {
    let result = null, Error, error = null, DBCode = null

    let basic = {};
    let detail = [];
    const treatise = [];

    const page = await browser.newPage();

    try {

      // let DBData1 = null
      // let DBData2 = null
      // let Response = { status: null, data: null }
      // try {
      //   Response = await axios.get(url, {
      //     headers: {
      //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      //       'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
      //       'Referer': 'https://med.khmc.or.kr/kr/main.do'
      //     }
      //   })
      // } catch (error) {
      //   Error = error
      //   console.log(`error on ${url} API return: ${error}`);
      // }
      // const $ = cheerio.load(Response.data);

      

      // Navigate to the website
      await page.goto(url);

      await page.waitForSelector('#content');

      const htmlContent = await page.content();

      const $ = cheerio.load(htmlContent);

      const body = $('body').html();

      const info = [];
      const jsonData = [];
      let doctorName = $('div.profile > .info > div.heading.heading-depth02 > h3.title').text().trim().replace(/\t/g, '').replace(/\n/g, '');
      doctorName = doctorName.split(' ')[0];
      console.log(`doctorName`, doctorName);

      const deptName = $('div.profile > .info > div.heading.heading-depth02 > b').text().trim().replace(/\t/g, '').replace(/\n/g, '');

      const specialty = $('div.profile > .info > p').text().trim().replace(/\t/g, '').replace(/\n/g, '');

      $('div.profile > .info > #tab-info01 > div').each((index, element) => {
        // const targetDate = $(element).find('th').text().trim();
        let type = $(element).find('h4.title').text().trim();

        $(element).next().find('li').each((idx, elem) => {
          let content = $(elem).text().trim();
          console.log('content', content);

          let targetDate;
          let career; 
          // if( content.startsWith('\"') ) {
          //   const regex = /\"\s(\d{4})(-(\d{4}|현재))?\s&nbsp;\|&nbsp;(.*)/;
          //   const values = content.match(regex);
          //   if( values.length > 2) {
          //     targetDate = `${values[0]}-${values[1]}`;
          //     career = `${values[2]}`;
          //   }
          //   else {
          //     targetDate = `${values[0]}`;
          //     career = `${values[1]}`;
          //   }
          // }
          // else {
          //   career = content;
          // }
          content = content.split('|');
          if( content.length > 1) {
            const dateStr = content[0];
            targetDate = dateStr.trim();
            career = content[1];
          }
          else {
            career = content;
          }
          
          if(career) {
            jsonData.push({ type, targetDate, text: career, url:''});
          }
        });
      })

      const ImageUrl = $('.photo img').attr('src');

      detail = jsonData;
      basic = {
        rid: null,
        hid: null,
        deptName: deptName,
        doctorName: doctorName,
        specialty: specialty,
        profileImgUrl: `https://seoul.eumc.ac.kr${ImageUrl}`
      }

      $('div.profile > .info > #tab-info02 > div').each((index, element) => {
        let type = $(element).find('h4.title').text().trim();

        $(element).next().find('li').each((idx, elem) => {
          const content = $(elem).text().trim();
          console.log('content', content);

          let targetDate;

          const text = $(elem).find('strong').text().trim()
            .replace('\"', '')
            .replace('&nbsp;', '')
            .replace(/\t/g, '')
            .replace(/\n/g, '');

          let journal = $(elem).text().trim()
            .replace('\"', '')
            .replace('&nbsp;', '');

          journal = journal.replace(text, '').trim();
          
          if(text) {
            treatise.push({ type, targetDate, journalName: journal, title: text, url:''});
          }
        });
      });

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


  crwalingProcess03: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const jsonData = [];
    const treatise = [];
    $('div.doctor-paper-career table').each((index, element) => {
      let type = null
      type = $(element).find('caption').text().trim();
      $('div.doctor-paper-career table tr').each((index2, element2) => {
        const targetDate = $(element2).find('th').text().trim().replace(/\t/g, '').replace(/\n/g, '');
        const text = $(element2).find('td').text().trim();
        jsonData.push({
          type: type,
          targetDate: targetDate,
          text: text
        });
      });
    });
    $('li.paper-list-item').each((index, element) => {
      const paperNo = $(element).find('span.paper-default-info').text().trim();
      const PaperName = $(element).find('strong.paper-name').text().trim();
      const paperInfo = $(element).find('span.paper-default-info').text().trim();
      const paperUrl = $(element).find('a.link-pubmed').attr('href')
      const doiPattern = /\b10\.\d{4}\/\S+\b/;
      const journalPattern = /^[^\d]+/;
      const yearPattern = /\b\d{4}\b/;
      const journalMatch = paperNo.match(journalPattern);
      const journalName = journalMatch ? journalMatch[0].trim() : "Unknown Journal";
      const yearMatch = paperNo.match(yearPattern);
      const year = yearMatch ? parseInt(yearMatch[0]) : null;
      const doiMatch = paperNo.match(doiPattern);
      const doiNumber = doiMatch ? doiMatch[0] : null;
      console.log("Journal Name:", journalName);
      console.log("Year:", year);
      console.log("doiMatch:", doiNumber);
      if (PaperName) {
        treatise.push({
          title: PaperName,
          doi: doiNumber,
          journalName: journalName,
          authorRule: null,
          publicationDate: year ? `${year}-01-01 00:00:00` : null,
          url: paperUrl,
          authorName: paperInfo,
          abstract: null,
          keywords: null,
          impactFactor: 0,
          totalCitations: 0,
          referencesThesis: null,
          subjectClassification: null,
          publicationLocation: null
        })
        // console.log("Extracted DOI:", doiNumber);
      } else {
        jsonData.push({
          type: '논문',
          No: paperNo,
          text: PaperName,
          Info: paperInfo,
          Url: paperUrl
        });
      }

    });
    await CS.wait(100);
    const deptName = $('h2.doctor-paper-info span.info-field').first().text().trim();
    const doctorName = $('span[name="fullName"]').first().text().trim();
    const sectionElement = $('#doctor-paper-section02');
    const style = sectionElement.attr('style');
    const profileImgUrl = style.match(/background-image: url\(['"]?([^'")]+)['"]?\)/)[1];
    const specialty = $('div.doctor-paper-field dd').text().trim();

    let item = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `http://www.samsunghospital.com/${profileImgUrl}`,
      biography: jsonData,
      treatise: treatise
    };
    return { error: error, data: item };
  },


  setCrawlingdoctorBasic: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
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






  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url) => {
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



