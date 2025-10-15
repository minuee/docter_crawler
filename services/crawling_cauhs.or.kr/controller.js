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
        
        let result = null, error = null, DBCode = null
        let DBData1 = null
        let DBData2 = null
        let Response = { status: null, data: null }
        const url01 = `https://ch.cauhs.or.kr/home/medical/deptAllIntro.do`;
      
        console.log(`url01`, url01)

        const browser = await puppeteer.launch();
        // Open a new page
        const page = await browser.newPage();
        // Navigate to the website
        await page.goto(url01, { waitUntil: 'networkidle2' });
        await page.waitForSelector('ul.medical_list li',{ timeout: 5000 });
        const htmlContent = await page.content();
     
        const $ = cheerio.load(htmlContent);

        const dept = [];
        $('ul.medical_list li').each((index, element) => {
            //const name = $(element).find('div.deptinfo').text().trim();
            const name = $(element).find('div.medical_top').text().trim();
            const tempLink = $(element).find('div.medical_hover a:first-child').attr('href');
            console.log(`name : ${name}, tempLink : ${tempLink}`)
            if ( tempLink ) {
                const match = tempLink.match(/fn_MoveDept\('(\d+)'\)/);
                const number = match ? match[1] : '';
            
                const link = `https://ch.cauhs.or.kr/home/medical/deptProf${number}.do`;
                console.log(`link : ${link}`)
                const info = {
                    deptName : name,
                    link,
                };
                
                dept.push(info);
            }
        });
        return { error: error, data: dept };
    },
    
    crwalingProcess02: async (link) => {
        let result = null, error = null, DBCode = null
        let DBData1 = null
        let DBData2 = null
        let Response = { status: null, data: null }
        if (!link) {
          return { error: true, data: null };
        }
        try {
          Response = await axios.get(link, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
            }
          })
        } catch (error) {
          Error = error
          console.log(`error on ${link} API return: ${error}`);
        }
        const $ = cheerio.load(Response.data);
        // 쓰레기 태그 날림
        // $('span').empty(); // 못날림 (이름과 진료과가 붙어있음)
        const doctors = [];
        $('ul.doc_sche_list_wrap_flex li').each((index, element) => {
            const doctorName = $(element).find('.doc_name').contents().filter(function() { return this.type === 'text';}).first().text().trim();
            const deptName = $(element).find('.doc_name').find(".doc_part").text().trim().replace("[", "").replace("]", "");
            const tempLink = $(element).find('div.doc_txt').find('ul.doc_sche_btn_wrap').find("li:first-child a").attr('href');
            const profileUrlTmp = $(element).find('div.doc_info div.doc_img_wrap').find("img").attr('src');
            const profileUrl = `https://ch.cauhs.or.kr${profileUrlTmp}`
            if ( tempLink ) {
                const regex = /'([^']*)'/g;
                const argsArray = Array.from(tempLink.matchAll(regex), match => match[1])
                const link = `https://ch.cauhs.or.kr/home/medical/profView.do?deptNo=${argsArray[1]}&profNo=${argsArray[2]}&empNo=${argsArray[3]}`;
                console.log(`doctorName : ${doctorName}, deptName : ${deptName}, link : ${link}, profileUrl : ${profileUrl}`)
                // 의료진 정보를 객체로 저장
                const doctor = {
                    doctorName: CS.removeMatchingWordFromEnd(doctorName, deptName),
                    deptName: deptName,
                    url: link,
                    profileUrl
                };
                
                doctors.push(doctor);
            }
        });
        return { error: error, data: doctors };
      },
    Process00: async () => {
        let result = null, Error, error = null, DBCode = null
        let DBData1 = null
        let DBData2 = null
        let Response = { status: null, data: null }
        const url01 = 'https://ch.cauhs.or.kr/home/medical/profList.do';
        console.log(`url01`, url01);
        try {
            Response = await axios.post(url01, {
                sortOrder: 'HAN',
                page: 1,
                headHspCd: 'H'
            }, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Referer': 'https://ch.cauhs.or.kr'
                }
            });
            //   console.log('Response:', Response.data);
        } catch (error) {
            console.error(`error on ${url01} API return: ${error}`);
        }
        const $ = cheerio.load(Response.data);
        let maxPageNumber = null
        const lastPageHref = $('.ritnavi li:last-child a').attr('href');
        console.log('Last Page Href:', lastPageHref);
        const pageNumberMatch = lastPageHref.match(/G_MovePage\((\d+)\)/);
        if (pageNumberMatch) {
            maxPageNumber = pageNumberMatch[1];
            console.log('Last Page Number:', maxPageNumber);
        } else {
            maxPageNumber = null
            console.log('No page number found.');
        }
        return { error: error, data: maxPageNumber };
    },





    Process01: async (pageNumber) => {
        let result = null, Error, error = null, DBCode = null
        let DBData1 = null
        let DBData2 = null
        let Response = { status: null, data: null }
        const url01 = `https://ch.cauhs.or.kr/home/medical/profList.do?sortOrder=HAN&headHspCd=H&page=${pageNumber}`;
        console.log(`url01`, url01);
        try {
            Response = await axios.post(url01, {}, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': 'https://ch.cauhs.or.kr'
                }
            });
            //   console.log('Response:', Response.data);
        } catch (error) {
            console.error(`error on ${url01} API return: ${error}`);
        }
        const $ = cheerio.load(Response.data);
        let maxPageNumber = null
        const optionsArray = [];
        const lastPageHref = $('.ritnavi li:last-child a').attr('href');
        console.log('Last Page Href:', lastPageHref);
        const pageNumberMatch = lastPageHref.match(/G_MovePage\((\d+)\)/);
        if (pageNumberMatch) {
            maxPageNumber = pageNumberMatch[1];
            console.log('Last Page Number:', maxPageNumber);
        } else {
            maxPageNumber = null
            console.log('No page number found.');
        }
        $('li.doc_sche_list').each((index, item) => {
            let link = null
            const profileImageUrl = $(item).find('.doc_img_wrap img').attr('src');
            const doctorName = $(item).find('.doc_name').contents().first().text().trim();
            const deptName = $(item).find('.doc_part').text().replace('[', '').replace(']', '').trim();
            const specialty = $(item).find('.doc_explain').text().trim();
            const docIntroLink = $(item).find('.doc_intro').attr('href');
            if (docIntroLink){
                const regex = /javascript:fn_DeatilPop\('home', '(\d+)', '(\d+)', '(\d+)'\);/;
                const match = docIntroLink.match(regex);
                if(match){
                    const [_, deptNo, profNo, empNo] = match;
                    link = `https://ch.cauhs.or.kr/home/medical/profView.do?deptNo=${deptNo}&profNo=${profNo}&empNo=${empNo}`;
                    const item = {
                        doctorName: doctorName,
                        deptName: deptName,
                        specialty: specialty,
                        link: link,
                        maxPageNumber: maxPageNumber
                    }
                    optionsArray.push(item)
                    console.log(`item >>`, item)
                }
            }
        });
        return { error: error, data: optionsArray };
    },







    Process02: async (url) => {
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

            $(element).find('.button[role="button"]').each((btnIndex, btnElement) => {
                const onclickValue = $(btnElement).attr('onclick');
                if (onclickValue) {
                    const match = onclickValue.match(/drProfile\('(\d+)', '(\d+)'\)/);
                    if (match) {
                        const dr_sid = match[1];
                        const dept_cd = match[2];
                        const link = `https://www.kuh.ac.kr/doctor/basicInfo.do?dr_sid=${dr_sid}&dept_cd=${dept_cd}`;
                        doctorArray.push({ deptName, doctorName, link });
                    }
                }
            });
        });

        return { error: error, data: doctorArray };
    },

    crwalingProcess03: async (url) => {
        //https://www.kuh.ac.kr/doctor/basicInfo.do?dr_sid=20100170&dept_cd=000397
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
        const $ = cheerio.load(Response.data);
        const info = [];
        

        // doctorName, deptName, specialty 추출
        const doctorName = $('p.doc_name').text().trim().replace(/\t/g, '').replace(/\n/g, '');
        const deptName = $('p.doc_part').text().trim().split(',')[0].replace('[', '').trim().replace(/\t/g, '').replace(/\n/g, '');
        const specialty = $('div.doc_spec.fix p.txt').text().trim().replace(/\t/g, '').replace(/\n/g, '');
        const imgUrl = $('li.swiper-slide img').attr('src');
        const basic = {
            doctorName,
            deptName,
            specialty,
            profileImgUrl: 'https://www.kuh.ac.kr' + imgUrl
        }
        console.log(`doctorName : ${doctorName}, deptName : ${deptName}, specialty : ${specialty}, profileImgUrl : ${imgUrl}`)
        const detail = [];
        const treatise = [];

        const treatiseTemplate = {
            title: null,
            doi: null,
            journalName: null,
            authorRule: null,
            publicationDate: null,
            url: null,
            abstract: null,
            keywords: null,
            impactFactor: null,
            totalCitations: null,
            referencesThesis: null,
            doctorName: doctorName,
            authorName: null,
            subjectClassification: null,
            publicationLocation: null,
          }

        $('div.info_area.profViewTab').each((index, elem) => {
            $(elem).find('div.history_content').each((idx, elem2) => {
                const type = $(elem2).find('div.tit_area p.tit').text().trim();
                let selector;
                selector = '.dec_list_wrap li';
                if(index === 1 && idx === 1) {
                    selector = '.dec_list_wrap_paper p';
                }
                $(elem2).find(selector).each((idx2, element) => {
                    let text;
                    text = $(element).find('div.dec_txt').text().trim();
                    if(index === 1 && idx === 1) {
                        text = $(element).text().trim();
                    }
                    if( text !== '') {
                        const strType = type == '논문 및 저서' ? "논문" : type == '경력 및 연수' ? "경력" : type == '학회활동' ? "학회" : type;  
                        const history = {
                            type :strType, 
                            text,
                            url: null
                        }
                        console.log(`type : ${strType}, text : ${text}`)           
                        if( strType === '논문') {
                            const content = {
                                ...treatiseTemplate,
                                title: text
                            }
                            if ( text.length > 10 ) treatise.push(content);
                        } else {
                            detail.push(history);
                        }
                    }
                });
            });
        });

        // console.log(treatise);
        result = {
            basic,
            detail,
            treatise
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



