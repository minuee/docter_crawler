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
const { chromium } = require('playwright');

const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;


// TODO: 과 코드를 추출하지 못해, 임시로 지정.
const Depts = [
	{ name: '가정의학과', code: 'GRFM' },
	{ name: '간담췌외과', code: 'GRHPS' },
  { name: '간센터(내과)', code: 'GRL1' },
	{ name: '감염내과', code: 'GRID' },

	{ name: '구강악안면외과', code: 'GROMS' },
	{ name: '내분비내과', code: 'GREC' },
	{ name: '대장항문외과', code: 'GRCRS' },
	{ name: '류마티스내과', code: 'GRRH' },

	{ name: '마취통증의학과', code: 'GRAN' },
	{ name: '방사선종양학과', code: 'GRRO' },
	{ name: '병리과', code: 'GRAP' },
	{ name: '비뇨의학과', code: 'GRGU' },

	{ name: '산부인과', code: 'GROG' },
	{ name: '성형외과', code: 'GRPS' },
	{ name: '소아외과', code: 'GRPDS' },
	{ name: '소아청소년과', code: 'GRPD' },

	{ name: '소화기내과', code: 'GRGE' },
	{ name: '신경과', code: 'GRNU' },
	{ name: '신경외과', code: 'GRNS' },
	{ name: '신장내과', code: 'GRNE' },

	{ name: '심장혈관흉부외과', code: 'GRCS' },
	{ name: '심혈관센터(순환기)', code: 'GRC1' },
	{ name: '심혈관센터(혈관외과)', code: '202620' },
	{ name: '안과', code: 'GROP' },

	{ name: '영상의학과', code: 'GRDR' },
	{ name: '위장관외과(상부)', code:'GRGES' },
	{ name: '유방내분비외과', code: 'GRBES' },
	{ name: '응급의학과', code: 'GRED' },

	{ name: '응급중환자외상외과', code: 'GRTS' },
	{ name: '이비인후·두경부외과', code: 'GROL' },
	{ name: '이식혈관외과', code: 'GRTVS' },
	{ name: '임상약리학과', code: 'GRPT' },

	{ name: '재활의학과', code: 'GRRM' },
	{ name: '정신건강의학과', code: 'GRPY' },
	{ name: '정형외과', code: 'GROS' },
	{ name: '종양내과', code: 'GRHOO' },

	{ name: '진단검사의학과', code: 'GRCP' },
	{ name: '치과교정과', code: 'GRDTO' },
	{ name: '치과보존과', code: 'GRDTC' },
	{ name: '치과보철과', code: 'GRDTP' },

	{ name: '치과치주과', code: '110350' },
	{ name: '피부과', code: 'GRDM' },
	{ name: '핵의학과', code: 'GRNM' },
	{ name: '혈액내과', code: 'GRHOE' },
	{ name: '호흡기·알레르기내과', code: 'GRPU' },
]


let browser = null;


module.exports = {

  crwalingProcess01: async () => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    // const url01 = `https://med.khmc.or.kr/kr/treatment/department/list.do`;
    const url01 = `https://guro.kumc.or.kr/kr/doctor-department/department.do`;
    
    console.log(`url01`, url01)
    // try {
    //   Response = await axios.get(url01, {
    //     headers: {
    //       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    //       // 'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
    //       'Referer': 'https://guro.kumc.or.kr/kr/index.do'
    //     }
    //   })
    // } catch (error) {
    //   Error = error
    //   console.log(`error on ${url01} API return: ${error}`);
    // }
    browser = await chromium.launch();
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
          const url = `https://guro.kumc.or.kr/kr/doctor-department/department/view.do?deptCd=${found.code}`;
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


  crwalingProcess02: async (url) => {
    let result = null, Error, error = null, DBCode = null

    console.log(`url`, url);

    const page = await browser.newPage();
    // Navigate to the website
    await page.goto(url);

    await new Promise(r => setTimeout(r, 3000));

    try {
      // await page.waitForSelector('.doctorList .dL_line .profile_box');
      await page.waitForSelector('.doctorList .dL_line .profile_box', { timeout: 5000 });
    } catch (e) {
      // if (e instanceof puppeteer.errors.TimeoutError) {
        error = `element(.profile_box) probably not exists at url(${url})`;
        console.log(error);
        return { error, data: null };
      // }
    }


    const htmlContent = await page.content();

    const $ = cheerio.load(htmlContent);

    // const body = $('body').html();

    const doctorArray = [];
    const deptName = $('.subpagebody .tit_sectin .inner02 h2').text().trim();

    $('.doctorList .dL_line .profile_box').each((index, item) => {
      //tit_sectin inner h2
      const doctorName = $(item).find('p.doctor_name span').first().text().trim();
      const link = $(item).find('div.btn_wrap.col_2.f_center a').first().attr('href')
      const profileUrlTmp = $(item).find('div.doctor_img').find('img').attr('src')
      console.log(`doctorName`, doctorName)
      // console.log(`link`, link)
      //href
      if(doctorName && link){
        doctorArray.push({
          deptName: deptName,
          doctorName: doctorName,
          link: `https://guro.kumc.or.kr${link}`,
          profileUrl : `https://guro.kumc.or.kr${profileUrlTmp}`
        });
      }
    });

    page.close();
    // browser.close();
    return { error: error, data: doctorArray };
  },


  openBrowser: async (option) => {
    if( !browser ) {
      browser = await chromium.launch(option);
    }
  },

  closeBrowser: async () => {
    if( browser ) {
      await browser.close();
      browser = null;
    }
  },  


  crwalingProcess03: async (url) => {
    let result = null;
    let error = null;
    let basic = {};
    let detail = [];
    const treatise = [];
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForSelector('.container');

        // 모든 '더보기' 버튼 클릭
        const moreButtons = await page.locator('div.linebutton a:text("더보기")').all();
        for (const button of moreButtons) {
            try {
                if (await button.isVisible()) {
                    await button.click({ timeout: 1000 });
                    await page.waitForTimeout(200); // 클릭 후 짧은 대기
                }
            } catch (e) {
                // 클릭 오류는 무시하고 계속 진행
            }
        }

        // '학회활동' 탭 클릭
        const academyTab = await page.locator('div.section.section02.doc_info01 .tab_ui .tab ul li:nth-of-type(2) a');
        if (await academyTab.isVisible()) {
            await academyTab.click();
            await page.waitForTimeout(500);

            // 학회활동 섹션의 '더보기' 버튼이 있다면 클릭
            const academyMoreButton = await page.locator('div.section.section02.doc_info01 .tab_ui .tab_cont ul li:nth-of-type(2) .linebutton a');
            if (await academyMoreButton.isVisible()) {
                try {
                    await academyMoreButton.click({ timeout: 1000 });
                    await page.waitForTimeout(200);
                } catch (e) {}
            }
        }
        
        // '저서' 탭 클릭
        const bookTab = await page.locator('div.section.section03 .tab_ui .tab ul li:nth-of-type(2) a');
        if (await bookTab.isVisible()) {
            await bookTab.click();
            await page.waitForTimeout(500);
        }

        const htmlContent = await page.content();
        const $ = cheerio.load(htmlContent);

        const deptName = $('div.doc_titline ul li:first').text().trim().replace(/\s+/g, ' ');
        const doctorName = $('div.doc_titline ul li:nth-child(2)').text().trim().replace(/\s+/g, ' ');
        const specialty = $('div.tabmo_show ul li:nth-child(2)').text().trim().replace(/\s+/g, ' ');
        const ImageUrl = $('.doctor_img img').attr('src');
        
        basic = {
            rid: null,
            hid: null,
            deptName: deptName,
            doctorName: doctorName,
            specialty: specialty,
            profileImgUrl: ImageUrl ? `https://guro.kumc.or.kr${ImageUrl}` : ''
        };

        const jsonData = [];

        // 학력
        $('div.section.section02 > .doc_info01_table tbody tr').each((index, element) => {
            const targetDate = $(element).find('th').text().trim();
            const text = $(element).find('td').text().trim();
            if(text) jsonData.push({ type: '학력', targetDate, text, url:''});
        });

        // 경력
        $('div.section.section02 .tab_ui ul li:nth-of-type(1) tbody tr').each((index, element) => {
            const targetDate = $(element).find('th').text().trim();
            const text = $(element).find('td').text().trim();
            if(text) jsonData.push({ type: '경력', targetDate, text, url:''});
        });

        // 학회활동
        $('div.section.section02 .tab_ui .tab_cont ul li:nth-of-type(2) tbody tr').each((index, element) => {
            const targetDate = $(element).find('th').text().trim();
            const text = $(element).find('td').text().trim();
            if(text) jsonData.push({ type : '학회', targetDate, text, url:''});
        });

        // 논문
        $('div.section.section03 > .tab_ui ul li:nth-of-type(1) tbody tr').each((index, element) => {
            const text = $(element).find('td .research span').eq(1).text().trim();
            if(text) treatise.push({ title: text });
        });
        
        // 저서
        $('div.section.section03 > .tab_ui ul li:nth-of-type(2) tbody tr').each((index, element) => {
            const text = $(element).find('td').text().trim();
            if(text) jsonData.push({ type: '저서', targetDate: '', text, url:''});
        });

        // 수상
        $('div.section.section03 > .doc_info01_table tbody tr').each((index, element) => {
            const targetDate = $(element).find('th').text().trim();
            const text = $(element).find('td span').text().trim();
            if(text) jsonData.push({ type : "수상", targetDate, text, url:''});
        });

        // 언론보도
        $('div.section.section04 .doc_info01_table tbody tr').each((index, element) => {
            const targetDate = $(element).find('th').text().trim();
            const text = $(element).find('td .research a').text().trim();
            const url = $(element).find('td .research a').attr('href');
            if(text) jsonData.push({ type : "언론", targetDate, text, url});
        });
        
        detail = jsonData;

    } catch (e) {
        error = `The crawling attempt from URL(${url}) has failed: ${e.message}`;
        console.error(error);
    } finally {
        await page.close();
    }

    result = {
        basic: basic,
        detail: detail,
        treatise: treatise
    };
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



