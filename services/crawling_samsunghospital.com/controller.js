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
    const makeTs = new Date(now.getTime() - gapSec);
    const ts13Digit = makeTs.getTime();
    return { error: error, data: ts13Digit };
  },



  crwalingProcess01: async (fakeTimestamp) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    const url01 = `http://www.samsunghospital.com/home/reservation/DoctorScheduleGubun.do?dp_type=O&_=${fakeTimestamp}`;
    try {
      Response = await axios.get(url01, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
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


  crwalingProcess02: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const info = [];
    $('article.card-content').each((index, element) => {
      const deptName = $(element).find('span.treatment-parts').text().trim().replace(/[\[\]]/g, '');
      const doctorName = $(element).find('span.text-blue').text().trim();

      const specialty = $(element).find('p.card-content-text').text().trim();

      const goodCnt = $('span[name="goodCnt"]').text();
      const tempUrl = $(element).find('a').attr('href');
      const fullUrl = `http://www.samsunghospital.com${tempUrl}`
      const profileUrlTmp = $(element).find('div.card-content-img').find("img").attr('src');
      const profileUrl = `http://www.samsunghospital.com${profileUrlTmp}`
      const item = {
        deptName: deptName,
        doctorName: doctorName,
        specialty: specialty,
        goodCnt: goodCnt,
        url: fullUrl,
        profileUrl
      }
      info.push(item)
    });

    return { error: error, data: info };
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const jsonData = [];
    const treatise = [];
    /* $('div.doctor-paper-career table').each((index, element) => {
      let type = null
      type = $(element).find('caption').text().trim();
      $('div.doctor-paper-career table tr').each((index2, element2) => {
        const targetDate = $(element2).find('th').text().trim().replace(/\t/g, '').replace(/\n/g, '');
        const text = $(element2).find('td').text().trim();
        console.log(`type: ${type}, targetDate: ${targetDate}, text: ${text}`)
        jsonData.push({
          type: type,
          date: targetDate,
          text: text
        });
      });
    }); */
    $('div.doctor-paper-career table').each((_, tableElement) => {
      const $table = $(tableElement);
      const type = $table.find('caption').first().text().trim();
    
      // tbody tr을 현재 테이블 하위만 순회 (전역 검색 금지)
      $table.find('tbody tr').each((_, row) => {
        const $row = $(row);
    
        // 날짜(왼쪽 셀) - th가 없을 수 있으므로 안전하게 처리
        let rawDate = $row.find('th').first().text() || '';
        let rawText = $row.find('td').first().text() || '';
    
        // 특수공백(&nbsp;)과 탭/개행 처리: NBSP -> 일반 공백, 연속 공백 축약
        const normalize = (s) => String(s)
          .replace(/\u00A0/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\t/g, ' ')
          .replace(/\r?\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
    
        const targetDate = normalize(rawDate);
        const text = normalize(rawText);
        console.log(`type: ${type}, targetDate: ${targetDate}, text: ${text}`)
        if ( type == "학력" || type == "경력" || type == "학회할동" ) {
          // 경우: caption(예: "연구분야") 테이블인데 <tr><td>만 있는 경우
          const strType =  type == "학회할동" ? "학회" : type;
          if (!targetDate && text && $table.hasClass('table-career-field')) {
            // 연구분야 같은 건 날짜 대신 text만 담음
            jsonData.push({ type: strType,date: '',text: text});
          } else {
            jsonData.push({ type: strType, date: targetDate, text: text});
          }
        }
      });
    });
    /* 
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

    }); */
    await CS.wait(100);
    const deptName = $('h2.doctor-paper-info span.info-field').first().text().trim();
    const doctorName = $('span[name="fullName"]').first().text().trim();
    const sectionElement = $('#doctor-paper-section02');
    const style = sectionElement.attr('style');
    const profileImgUrl = style.match(/background-image: url\(['"]?([^'")]+)['"]?\)/)[1];
    const specialty = $('div.doctor-paper-field dd').text().trim();
    console.log("deptName:", deptName);
    console.log("doctorName:", doctorName);
    console.log("profileImgUrl:", profileImgUrl);
    console.log("specialty:", specialty);


    //여기서 새로운 논문 페이지로 접속해서 데이터를 가져온다
    try {
      // 논문 버튼에서 onclick 속성 추출
      const onclickAttr = $('a.button-paper-list').attr('onclick');
      const match = onclickAttr?.match(/moveTheSisList\('([^']+)'\)/);

      if (!match || !match[1]) {
          console.log('📎 논문 목록 링크(onclick)를 찾을 수 없어 논문 수집을 건너뜁니다.');
      } else {
          const paperUrl = match[1];
          console.log('📎 논문 페이지 URL:', paperUrl);

          // URL에서 핵심 파라미터 'ep' 추출
          const urlObject = new URL(paperUrl);
          const ep = urlObject.searchParams.get('ep');

          if (!ep) {
            console.error('❌ 논문 페이지 URL에서 ep 파라미터를 찾을 수 없습니다.');
          } else {
            // 페이지의 AJAX 호출을 직접 흉내냅니다. (페이징 처리 포함)
            const apiUrl = 'https://scholarworks.samsunghospital.com:447/json/researcher-page/items-by-type';

            // 헬퍼 함수: API 응답에서 논문 정보를 추출하여 treatise 배열에 추가
            const processItems = (items) => {
              items.forEach(item => {
                const title = item.dc_title ? item.dc_title.replace(/<[^>]+>/g, '').trim() : '제목 없음';
                const journalInfo = item.dc_identifier_bibliographicCitation || null;
                const publicationDate = item.dc_date_issued || null;
                const authors = item.dc_contributor_author || null;
                console.log(`✅  treatise title : ${title}`);
                treatise.push({
                  title: title,
                  doi: null,
                  journalName: journalInfo,
                  authorRule: null,
                  publicationDate: publicationDate ? `${publicationDate} 00:00:00` : null,
                  url: null,
                  authorName: authors,
                  abstract: null,
                  keywords: null,
                  impactFactor: 0,
                  totalCitations: 0,
                  referencesThesis: null,
                  subjectClassification: null,
                  publicationLocation: null
                });
              });
            };

            // 1. 첫 페이지를 요청하여 전체 페이지 수를 확인합니다.
            const firstPageParams = new URLSearchParams();
            firstPageParams.append('ep', ep);
            firstPageParams.append('dataType', '1');
            firstPageParams.append('page', '1');
            firstPageParams.append('rpp', '10'); // 기본 페이지당 10개
            firstPageParams.append('sortType', '4');
            firstPageParams.append('order', '2');

            const { data: firstApiResponse } = await axios.post(apiUrl, firstPageParams);

            if (firstApiResponse && firstApiResponse.items) {
              // 첫 페이지 결과 처리
              processItems(firstApiResponse.items);

              const lastPage = firstApiResponse.lastPage || 1;
              console.log(`✅ 총 ${lastPage} 페이지의 논문 발견. 페이지 순회를 시작합니다.`);

              // 2. 두 번째 페이지부터 마지막 페이지까지 순회하며 요청합니다.
              for (let currentPage = 2; currentPage <= lastPage; currentPage++) {
                console.log(`- ${currentPage} 페이지 논문 수집 중...`);
                const pageParams = new URLSearchParams();
                pageParams.append('ep', ep);
                pageParams.append('dataType', '1');
                pageParams.append('page', currentPage.toString());
                pageParams.append('rpp', '10');
                pageParams.append('sortType', '4');
                pageParams.append('order', '2');

                const { data: pageApiResponse } = await axios.post(apiUrl, pageParams);
                if (pageApiResponse && pageApiResponse.items) {
                    processItems(pageApiResponse.items);
                }
                // 서버 부하를 줄이기 위해 약간의 지연 시간을 줍니다.
                await CS.wait(100);
              }
            }
            console.log(`✅ 총 ${treatise.length}건의 논문 수집 완료.`);
          }
      }
    } catch (err) {
        // 오류 메시지를 좀 더 상세하게 출력
        if (err.response) {
            console.error(`❌ 논문 정보 수집 중 API 오류 발생: ${err.response.status}`, err.response.data);
        } else {
            console.error('❌ 논문 정보 수집 중 오류 발생:', err.message);
        }
    }


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



