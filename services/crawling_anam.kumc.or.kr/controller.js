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

// TODO: 과 코드를 추출하지 못해, 임시로 지정.
const Depts = [
	{ name: '가정의학과', code: 'AAFM' },
	{ name: '간담췌외과', code: 'AAHPS' },
	{ name: '감염내과', code: 'AAID' },
	{ name: '내분비내과', code: 'AAEC' },
	{ name: '대장항문외과', code: 'AACRS' },
	{ name: '류마티스내과', code: 'AARH' },
	{ name: '마취통증의학과', code: 'AAAN' },
	{ name: '방사선종양학과', code: 'AARO' },
	{ name: '병리과', code: 'AAAP' },
	{ name: '비뇨의학과', code: 'AAGU' },
	{ name: '산부인과', code: 'AAOG' },
	{ name: '성형외과', code: 'AAPS' },
	{ name: '소아외과', code: 'AAPDS' },
	{ name: '소아청소년과', code: 'AAPD' },
	{ name: '소화기내과', code: 'AAGE' },
	{ name: '순환기내과', code: 'AACC' },
	{ name: '신경과', code: 'AANU' },
	{ name: '신경외과', code: 'AANS' },
	{ name: '신장내과', code: 'AANE' },
	{ name: '심장혈관흉부외과', code: 'AACS' },
	{ name: '안과', code: 'AAOP' },
	{ name: '영상의학과', code: 'AADR' },
	{ name: '위장관외과(상부)', code:'AAGES' },
	{ name: '유방내분비외과', code: 'AABES' },
	{ name: '응급의학과', code: 'AAED' },
	{ name: '이비인후과', code: 'AAOL' },
	{ name: '이식혈관외과', code: 'AATVS' },
	{ name: '임상약리학과', code: 'AAPT' },
	{ name: '재활의학과', code: 'AARM' },
	{ name: '정신건강의학과', code: 'AAPY' },
	{ name: '정형외과', code: 'AAOS' },
	{ name: '종양내과', code: 'AAHOO' },
	{ name: '중환자외상외과', code: 'AAACS' },
	{ name: '진단검사의학과', code: 'AACP' },
	{ name: '치과 구강악안면외과', code: 'AAOMS' },
	{ name: '치과교정과', code: 'AADTO' },
	{ name: '치과보존과', code: 'AADTC' },
	{ name: '치과보철과', code: 'AADTP' },
	{ name: '치과치주과', code: 'AADTPE' },
	{ name: '피부과', code: 'AADM' },
	{ name: '핵의학과', code: 'AANM' },
	{ name: '혈액내과', code: 'AAHOE' },
	{ name: '호흡기·레르기내과', code: 'AAPU' },
]


let browser = null;


module.exports = {

  Process01: async () => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    // const url01 = `https://med.khmc.or.kr/kr/treatment/department/list.do`;
    const url01 = `https://anam.kumc.or.kr/kr/doctor-department/department.do`;
    console.log(`url01`, url01)
    // try {
    //   Response = await axios.get(url01, {
    //     headers: {
    //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    //       // 'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
    //       'Referer': 'https://anam.kumc.or.kr/kr/index.do'
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

    await page.waitForSelector('#app');

    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);
    $('span').empty();

    // const appcontent = $('div#app').html();

    const optionsArray = [];
    $('div.inner02 .list_type02.hov.icon li').each((index, item) => {
      // console.log(`item >>>>>>>>>>>>>>`)
      // console.log(item)
      // const title = $(item).find('div.imglist_outer p').first().text().trim();
      const link = $(item).find('a').first()
      const title = $(link).find('div p').first().text().trim();
      console.log(`title`, title)
      console.log(`link`, link)
      if(title){
        // temp_link = link.attr('href');
        // temp_link = temp_link.replace('introduce','timetable')
        const found = Depts.find(dept => dept.name === title);
        if( found ) {
          const url = `https://anam.kumc.or.kr/kr/doctor-department/department/view.do?deptCd=${found.code}`;
          optionsArray.push({
            title,
            link: url
          });
  
        }
      }
    });

    page.close();

    return { error: error, data: optionsArray };
  },


  Process02: async (url) => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    // const url = `https://med.khmc.or.kr/kr/treatment/department/list.do`;
    console.log(`url`, url)
    // try {
    //   Response = await axios.get(url, {
    //     headers: {
    //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    //       'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
    //       'Referer': 'https://anam.kumc.or.kr/kr/index.do'
    //     }
    //   })
    // } catch (error) {
    //   Error = error
    //   console.log(`error on ${url} API return: ${error}`);
    // }

    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url);

    await page.waitForSelector('.doctorList .dL_line .profile_box');
    // await page.waitForSelector('p.doctor_name span');

    // await new Promise(r => setTimeout(r, 1000));

    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);

    // const body = $('body').html();

    const doctorArray = [];
    const deptName = $('.subpagebody .tit_sectin .inner02 h2').text().trim();

    $('.doctorList .dL_line .profile_box').each((index, item) => {
      //tit_sectin inner h2
      const doctorName = $(item).find('p.doctor_name span').first().text().trim();
      const link = $(item).find('div.btn_wrap.col_2.f_center a').first().attr('href')
      console.log(`doctorName`, doctorName)
      // console.log(`link`, link)
      //href
      if(doctorName && link){
        doctorArray.push({
          deptName: deptName,
          doctorName: doctorName,
          link: `https://anam.kumc.or.kr${link}`
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

      await page.waitForSelector('.container');

      // const elements = await page.$$('div.linebutton a[href^="javascript:;"]');
      const elements = [
        'div.section.section02.doc_info01 .tab_ui .tab_cont ul li:first-child a',
        'div.section.section03.doc_info01 .tab_ui .tab_cont ul li:first-child .linebutton > a',
        'div.section.section03.doc_info01 > .doc_info01_table .linebutton a',
        'div.section.section04.doc_info01 .tab_ui .tab_cont ul li:first-child .linebutton a',
      ];

      console.log(`element count: ${elements.length}`)
      for (let i = 0; i < elements.length; i++) {

        const element = await page.$(elements[i]);

          
        if (element) {
          // 요소가 화면에 보이도록 스크롤
          await page.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), element);
          await new Promise((resolve) => setTimeout(resolve, 1000)) // 스크롤 후 대기 시간 추가;

          try {
            // 요소가 클릭 가능한지 확인
            // await page.waitForSelector('div.linebutton a[href^="javascript:;"]', { visible: true });
            await element.click();
          } catch (error) {
            console.error(`${i+1}번째 클릭할 수 없는 요소:`, error);
          }

          await new Promise((resolve) => setTimeout(resolve, 1000)) // 스크롤 후 대기 시간 추가;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 3000))

      const academy = await page.$('div.section.section02.doc_info01 .tab_ui .tab ul li:nth-of-type(2) a');
      await page.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), academy);
      await new Promise((resolve) => setTimeout(resolve, 1000)) // 스크롤 후 대기 시간 추가;
      await page.waitForSelector('div.section.section02.doc_info01 .tab_ui .tab ul li:nth-of-type(2) a', { visible: true });
      await academy.click();

      // const element = elements[1];
      const element = await page.$('div.section.section02.doc_info01 .tab_ui .tab_cont ul li:nth-of-type(2) a');

      if (element) {
        // 요소가 화면에 보이도록 스크롤
        await page.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), element);
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 스크롤 후 대기 시간 추가;

        try {
          // 요소가 클릭 가능한지 확인
          // await page.waitForSelector('div.linebutton a[href^="javascript:;"]', { visible: true });
          await element.click();
        } catch (error) {
          console.error(`클릭할 수 없는 요소:`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000)) // 스크롤 후 대기 시간 추가;
      }


      const htmlContent = await page.content();

      const $ = cheerio.load(htmlContent);

      const body = $('body').html();

      const info = [];
      const jsonData = [];
      const deptName = $('div.doc_titline ul li:first').text().trim().replace(/\t/g, '').replace(/\n/g, '');
      let doctorName = $('div.doc_titline ul li:first').next().text().trim().replace(/\t/g, '').replace(/\n/g, '');

      const specialty = $('div.tabmo_show ul li:first').next().text().trim().replace(/\t/g, '').replace(/\n/g, '');


      let type = $('div.section.section02 p').text().trim();
      $('div.section.section02 > .doc_info01_table tbody tr').each((index, element) => {
        const targetDate = $(element).find('th').text().trim();
        const text = $(element).find('td').text().trim();
        if(text) {
          jsonData.push({ type, targetDate, text, url:''});
        }
      })

      type = '경력';
      $('div.section.section02 .tab_ui ul li:nth-of-type(1) tbody tr').each((index, element) => {
        const targetDate = $(element).find('th').text().trim();
        const text = $(element).find('td').text().trim();
        if(text) {
          jsonData.push({ type, targetDate, text, url:''});
        }
      })

      type = '학회활동';
      $('div.section.section02 .tab_ui .tab_cont ul li:nth-of-type(2) tbody tr').each((index, element) => {
        const targetDate = $(element).find('th').text().trim();
        const text = $(element).find('td').text().trim();
        if(text) {
          jsonData.push({ type, targetDate, text, url:''});
        }
      })    

      type = '논문';
      $('div.section.section03 > .tab_ui ul li:nth-of-type(1) tbody tr').each((index, element) => {
        const targetDate = $(element).find('th').text().trim();
        const journal = $(element).find('td .research span:first').text().trim();
        const text = $(element).find('td .research span:first').next().text().trim();
        if(text) {
          jsonData.push({ type, targetDate, text, journal, url:''});
        }
      })

      type = '수상내역';
      $('div.section.section03 > .doc_info01_table tbody tr').each((index, element) => {
        const targetDate = $(element).find('th').text().trim();
        const text = $(element).find('td span').text().trim();
        if(text) {
          jsonData.push({ type, targetDate, text, url:''});
        }
      })

      type = '언론보도';
      $('div.section.section04 .doc_info01_table tbody tr').each((index, element) => {
        const targetDate = $(element).find('th').text().trim();
        const text = $(element).find('td .research a').text().trim();
        const url = $(element).find('td .research a').attr('href');
        if(text) {
          jsonData.push({ type, targetDate, text, url});
        }
      })    

      const ImageUrl = $('.doctor_img img').attr('src');

      detail = jsonData;
      basic = {
        rid: null,
        hid: null,
        deptName: deptName,
        doctorName: doctorName,
        specialty: specialty,
        profileImgUrl: `https://anam.kumc.or.kr${ImageUrl}`
      }


      detail.forEach(obj => {
        if( obj.type === '논문' ) {
          treatise.push({
            ...obj,
            title: obj.text,
            journalName: obj.journal
          })
        }
      })
    }
    catch(error) {
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


  Process04: async (fakeTimestamp) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    const url01 = `http://www.samsunghospital.com/home/reservation/DoctorScheduleGubun.do?dp_type=O&_=${fakeTimestamp}`;
    try {
      Response = await axios.get(url01, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
          'Referer': 'https://med.khmc.or.kr/kr/main.do'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url01} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    $('span').empty();
    const optionsArray = [];
    $('select option').each((index, option) => {
      const optionText = $(option).text().trim();
      const optionValue = $(option).attr('value');
      optionsArray.push({
        text: optionText,
        value: optionValue
      });
    });
    return { error: error, data: optionsArray };
  },











  setTimeStamp: async () => {
    let result = null, error = null, DBCode = null
    const now = new Date();
    const gapSec = 5 * 1000;
    const makeTs = new Date(now.getTime() - gapSec);
    const ts13Digit = makeTs.getTime();
    return { error: error, data: ts13Digit };
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



