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


  crwalingProcess01: async () => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    const url01 = `https://www.kuh.ac.kr/medical/dept/deptList.do`;
    console.log(`url01`, url01)
    try {
      Response = await axios.get(url01, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          // 'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
          'Referer': 'https://www.kuh.ac.kr'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url01} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    // $('span').empty();
    const optionsArray = [];
    $('div.partItem ul li').each((index, item) => {
      const title =  $(item).find('span').first().text().trim();
      const link = $(item).find('a:contains("의료진")');
      // console.log(`title`, title)
      // console.log(`link`, link)
      //href
      if(link.attr('href')){
        temp_link = link.attr('href');
        optionsArray.push({
          link: `https://www.kuh.ac.kr/medical/dept/${temp_link}`
        });
      }
    });
    return { error: error, data: optionsArray };
  },


  crwalingProcess02: async (url) => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    // const url = `https://med.khmc.or.kr/kr/treatment/department/list.do`;
    console.log(`url`, url)
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          // 'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
          'Referer': 'https://www.kuh.ac.kr'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    // $('span').empty();
    const doctorArray = [];
    const deptName = $('h2.title').text().trim();
    // "프로필/진료시간"에 해당하는 링크 추출 및 변환
    $('.docTreatInfo .inner').each((index, element) => {
        // const deptName = $(element).find('.docDesc em span').first().text().trim();
        const doctorName = $(element).find('.docDesc .txt strong').first().text().trim();
        const profileUrlTmp = $(element).find('.docDesc .img').find('img').attr('src');
        const profileUrl = `https://www.kuh.ac.kr${profileUrlTmp}`;
        $(element).find('.button[role="button"]').each((btnIndex, btnElement) => {
            const onclickValue = $(btnElement).attr('onclick');
            if (onclickValue) {
                const match = onclickValue.match(/drProfile\('(\d+)', '(\d+)'\)/);
                if (match) {
                    const dr_sid = match[1];
                    const dept_cd = match[2];
                    const link = `https://www.kuh.ac.kr/doctor/basicInfo.do?dr_sid=${dr_sid}&dept_cd=${dept_cd}`;
                    doctorArray.push({ deptName, doctorName, link,profileUrl });
                }
            }
        });
    });
   
    return { error: error, data: doctorArray };
  },



  // TODO: 단국대는 여기서 일단 정지 (논문 데이터 포멧이 지멋대로임)
  crwalingProcess03: async (url) => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    let Response2 = { status: null, data: null }
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          // 'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
          'Referer': 'https://www.kuh.ac.kr'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    console.log(`crwalingProcess03`, url)
    const $ = cheerio.load(Response.data);
    const info = [];
    const jsonData = [];

    // doctorName, deptName, specialty 추출
    const doctorName = $('div.docInfo .desc strong').text().trim().replace(/\t/g, '').replace(/\n/g, '');
    const deptName = $('div.docInfo .desc span').text().trim().split(',')[0].replace('[', '').trim().replace(/\t/g, '').replace(/\n/g, '');
    const specialty = $('div.docInfo .desc').find('p').text().trim().replace(/\t/g, '').replace(/\n/g, '');
    console.log(`doctorName`, doctorName);
    $('.column.column-type01 .item').each((index, element) => {
      const title = $(element).find('.title').text().trim();
      const $item = $(element);
      if ( title == "학력" ) {
        $item.find('> ul.bullet > li').each((_, liElement) => {
          let rawText = $(liElement).html().replace(/&nbsp;/g, ' ').trim();
          // 2️⃣ HTML 제거
          rawText = rawText.replace(/<[^>]+>/g, '').trim();
          // 3️⃣ | 기호로 분리
          const parts = rawText.split('|').map(s => s.trim());

          // 4️⃣ 분리 결과 정리
          const date = parts[0] || '';  
          const text = parts[1] || parts[0] || ''; // |가 없을 때 대비
          console.log(`학력`, date,text);
          jsonData.push({ type: title, text,date });
        });
      }else if ( title == "경력" ) {
        $item.find('> ul.bullet > li').each((_, liElement) => {
          let rawText = $(liElement).html().replace(/&nbsp;/g, ' ').trim();
          // 2️⃣ HTML 제거
          rawText = rawText.replace(/<[^>]+>/g, '').trim();
          // 3️⃣ | 기호로 분리
          const parts = rawText.split('|').map(s => s.trim());

          // 4️⃣ 분리 결과 정리
          const date = parts[0] || '';  
          const text = parts[1] || parts[0] || ''; // |가 없을 때 대비
          console.log(`경력`, date,text);
          jsonData.push({ type: title, text,date });
        });
      }else if ( title == "학회활동" ) {
        $item.find('> ul.bullet > li').each((_, liElement) => {
          let rawText = $(liElement).html().replace(/&nbsp;/g, ' ').trim();
          // 2️⃣ HTML 제거
          rawText = rawText.replace(/<[^>]+>/g, '').trim();
          // 3️⃣ | 기호로 분리
          const parts = rawText.split('|').map(s => s.trim());

          // 4️⃣ 분리 결과 정리
          const date = parts[0] || '';  
          const text = parts[1] || parts[0] || ''; // |가 없을 때 대비
          console.log(`학회활동`,date, text);
          jsonData.push({ type: "학회", date,text });
        });
      }
    });

    const imageUrl = $('.docImg img').attr('src');
    let detail = jsonData;
    let basic = {
      rid: null,
      hid: null,
      deptName: deptName,
      doctorName: doctorName,
      specialty: specialty,
      profileImgUrl: `https://www.kuh.ac.kr/${imageUrl}`
    }

    result = {
      basic: basic,
      detail: detail
    }
    return { error: error, data: result };
  },


  crwalingtreatise: async (url) => {
    let result = null, Error, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    let Response2 = { status: null, data: null }
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          // 'Cookie': '_fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utma=171149434.1869919459.1716537368.1716537368.1716537368.1; __utmc=171149434; __utmz=171149434.1716537368.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); _gid=GA1.3.1781820103.1716537368; _ga=GA1.1.1869919459.1716537368; _ga_LT9FD6NRDW=GS1.1.1716537368.1.0.1716537369.0.0.0; SCOUTER=x4la7sujboc428; org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=kr; language=kr; _fwb=180BkWbSApStpo6WmeE59Sq.1716537367549; __utmc=26925601; _voicemonjs.option_change_flag=false; _voicemonjs.ttsmode=false; _voicemonjs.controllbarType=1; _voicemonjs.controlbarPosition=BR; _voicemonjs.controlbarScreenZoom=3; _voicemonjs.controlbarContrastMode=0; _voicemonjs.controlbarContrast=1; _voicemonjs.controlbarZoom=3; _voicemonjs.controlbarZoomContrast=1; _voicemonjs.controlbarHighlight=1; _voicemonjs.controlbarHighlightColor=1; _voicemonjs.voiceVolume=M; _voicemonjs.voicePitch=M; _voicemonjs.voiceSpeed=M; _voicemonjs.zoomPanelmode=0; _voicemonjs.controlbarSkinColor=0054FF; _voicemonjs.cpanel_showmode=1; __utma=26925601.1869919459.1716537368.1716537373.1716537376.2; __utmz=26925601.1716537376.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=AE25BB993ECFCBF9A11213D273DCD8A1.front1; wcs_bt=e770d73a88a274:1716539917; __utmt=1; __utmb=26925601.14.10.1716537376',
          'Referer': 'https://www.kuh.ac.kr'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    console.log(`crwalingtreatise`, url)
    const $ = cheerio.load(Response.data);
    let item = {
      biography: []
    };

    $('ul.bullet.paper li').each((index, element) => {
      const strongElement = $(element).find('strong');
      const title = $(element).text().trim();

  
      console.log(`title`, title)
      const treatise = {
          title: title,
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
      };

      item.biography.push(treatise);
    });
    return { error: error, data: item };
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

  crwalingProcess03_old: async (url) => {
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



