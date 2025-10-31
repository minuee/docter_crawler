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
    let DBData1 = null
    let Response = { status: null, data: null }
    const url = `https://www.snuh.org/reservation/meddept/main.do`;
    try {
      Response = await axios.post(
        url, {
        sortType: 'N',
        chkSortType: 'N'
      }, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Referer': 'https://www.snuh.org/reservation/meddept/main.do'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const jsonData = [];
    let hrefValue = null;
    $('.treatLink a').each((index, element) => {
      const anchorText = $(element).text().trim();
      if (anchorText === '의료진') {
        hrefValue = $(element).attr('href').split('\'');
        jsonData.push((_.get(hrefValue, [1], null)));
      }
    });
    console.log(`hrefValue: ${hrefValue}`)
    return { error: error, data: jsonData };
  },


  crwalingProcess02: async (deptCode) => {
    let result = null, error = null, DBCode = null
    let Response = { status: null, data: null }
    const url = `https://www.snuh.org/reservation/meddept/${deptCode}/mainDoctor.do`
    try {
      Response = await axios.post(
        url, {
        pageIndex: 1,
        chkSortType: 'D'
      }, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Referer': 'https://www.snuh.org/reservation/meddept/main.do'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API2 return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const jsonData = [];
    let lastPage = $('a.lastBtn').attr('href');
    lastPage = _.replace(lastPage, 'javascript:paginate(', '');
    lastPage = _.replace(lastPage, ')', '');

    return { error: error, data: lastPage };
  },



  crwalingProcess03: async (deptCode, pageIndex) => {
    let result = null, error = null, DBCode = null
    let Response = { status: null, data: null }
    const url = `https://www.snuh.org/reservation/meddept/${deptCode}/mainDoctor.do?pageIndex=${pageIndex}&sortType=&chkSortType=D&searchWord=`
    console.log(`param pageIndex: >>>>>>> ${pageIndex}`)
    try {
      Response = await axios.post(url, {}, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          'Content-Type': 'application/x-www-form-urlencoded',
          // 'Content-Type': 'multipart/form-data',
          'Host': 'www.snuh.org',
          'Origin': 'https://www.snuh.org',
          'Referer': `https://www.snuh.org/reservation/meddept/${deptCode}/mainDoctor.do`,
          'Sec-Ch-Ua-Platform': '"Windows"'
        }
      })
    } catch (error) {
      Error = error
      console.log(`error on ${url} API3 return: ${error}`);
    }
    const $ = cheerio.load(Response.data);
    const jsonData = [];

    $('ul.doctorSchedule li').each((index, element) => {
      //const doctorName = $(element).find('div.descWrap a').first().text().trim()
      const doctorName = $(element).find('a.doctorNameWrap strong').first().text().trim()
      //const deptName = $('div.descWrap span.colorPoint').first().text().trim().replace(/_/g, '').replace(/\[/g, '').replace(/\]/g, '');
      const deptName = $(element).find('div.doctorDept-badge p').first().text().trim()
      //const ProfileUrl = $(element).find('div.imgWrap a.btnType01').attr('href')
      const ProfileUrl = $(element).find('div.imgWrap a').attr('href')
      const fixedProfileUrl = _.replace(ProfileUrl, 'philosophy', 'career');
      
      if ( !functions.isEmpty(doctorName)) {
        console.log(`crwalingProcess03 : pageIndex(${pageIndex}) >>>>>>>>>>> ${deptName} ${doctorName}`);
        jsonData.push({
          doctorName: doctorName,
          deptName: deptName,
          url: `https://www.snuh.org/${fixedProfileUrl}`
        })
      }
    })
    return { error: error, data: jsonData };
  },



  crwalingProcess04: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    if (!url) {
      return { error: true, data: null };
    }

    try {
      Response = await axios.get(url, {
        // httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      console.log(`error on ${url} API return: ${error}`);
    }
    const $ = cheerio.load(Response.data);

    const doctorName = $('div.doctorInfo div.name strong').first().text().trim();
    const deptName = $('div.blogLinkWrap a.showPub1').first().text().trim();
    const profileImgUrl = $('div.feSlItem img').attr('src');
    const specialty = $('div#pub1').find('div.doctor-concentration-wrap').find('p').text().trim().replace(/\t/g, '').replace(/\n/g, '');

    console.log(`doctorName: ${doctorName}, deptName: ${deptName}, profileImgUrl: ${profileImgUrl}, specialty: ${specialty}`)

    const jsonData = [];
    // 학력 경력 날짜
    $('div.tableType01').each((index, element) => {
      let type = null
      type = $(element).find('thead th').eq(1).text().trim().replace(/\t/g, '').replace(/\n/g, '');
      $(element).find('tbody tr').each((index2, element2) => {
        const tds = $(element2).find('td');
        const year = $(tds[0]).text().trim();
        const text = $(tds[1]).text().trim().replace(/\t/g, '').replace(/\n/g, '');
       
        const strType = type == "경력 및 연수" ? "경력" : type == "학회활동" ? "학회" :  type;
        console.log(`type : ${strType}, date : ${year}, text : ${text}`)
        jsonData.push({
          type: strType,
          date: year,
          text: text
        });
      });
    });

    let item = {
      doctorName: doctorName,
      deptName: deptName,
      specialty: specialty,
      profileImgUrl: `https://www.snuh.org${profileImgUrl}`,
      biography: jsonData,
    };

    return { error: error, data: item };
  },

  crwalingtreatise: async (url) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let DBData2 = null
    let Response = { status: null, data: null }
    console.log(`crwalingProcess03: ${url}`); 
    
    if (!url) {
      return { error: true, data: null };
    }
    try {
      const browser = await puppeteer.launch({headless:true});
        // Open a new page
      const page = await browser.newPage();

      // ⚠️ 페이지 이동 전 미리 dialog 감지 설정
      page.on('dialog', async (dialog) => {
        console.log(`🔔 알림창 감지됨: ${dialog.message()}`);
        await dialog.dismiss(); // 또는 dialog.accept();
      });
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

      // 페이지에 있는 모든 '더보기' 버튼을 찾아 클릭합니다.
      console.log("페이지에 있는 모든 '더보기' 버튼을 찾아서 클릭합니다.");
      console.log("페이지 내 '더보기' 버튼을 반복적으로 클릭합니다.");

      let clickCount = 0;
      const maxAttempts = 50; // 안전장치: 무한루프 방지용

      while (true) {
        try {
          // evaluate 블록 내부에서 현재 페이지의 상태 확인 및 클릭 수행
          const result = await page.evaluate(async () => {
            const findVisibleMoreButton = () => {
              // 모든 버튼 중 텍스트가 '더보기'를 포함한 것 찾기
              const buttons = Array.from(document.querySelectorAll('button'));
              for (const btn of buttons) {
                const raw = (btn.innerText || btn.textContent || '').replace(/\u00A0/g, ' ');
                const text = raw.replace(/\s+/g, ' ').trim();
                if (/더보기/.test(text)) {
                  const style = window.getComputedStyle(btn);
                  const rect = btn.getBoundingClientRect();
                  const visible =
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    rect.width > 0 &&
                    rect.height > 0 &&
                    !btn.disabled;
                  if (visible) return btn;
                }
              }
              return null;
            };

            const button = findVisibleMoreButton();
            if (!button) return { clicked: false };

            try {
              button.click();
              return { clicked: true };
            } catch (e) {
              console.log("클릭 실패:", e.message);
              return { clicked: false };
            }
          });

          if (!result.clicked) {
            console.log("더 이상 '더보기' 버튼이 없습니다. 종료합니다.");
            break;
          }

          clickCount++;
          console.log(`${clickCount}번째 '더보기' 버튼 클릭 완료.`);

          /* page.on('dialog', async dialog => {
            console.log(`알림창 감지됨: ${dialog.message()}`);
            await dialog.dismiss(); // 또는 dialog.accept();
            break;
          }); */
          // 로드 기다림 (네트워크 지연이나 렌더링 시간 고려)
          await functions.puppeteerSleep(700);

        } catch (e) {
          console.log(`⚠️ 클릭 중 오류 발생: ${e.message}`);
          // alert 때문에 멈춘 경우를 대비해 대기 후 재시도
          await functions.puppeteerSleep(700);
          continue;
        }
        
        // 안전장치
        if (clickCount >= maxAttempts) {
          console.log(`최대 ${maxAttempts}회 클릭 후 종료합니다 (무한루프 방지).`);
          break;
        }

      }

      console.log(`총 ${clickCount}회 '더보기' 클릭 완료.`);
     
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      
      let item = {
        biography: [],
      };

      $('#paperConArea').find('li').each((index, dtElement) => {

        const $label = $(dtElement).find('p.blogCont-history-date:contains("제목")');
        if ($label.length > 0) {
          const $content = $label.next('div.blogCont-history-content-wrap').find('p.blogCont-history-content');
          const titleText = $content.text().trim().replace(/\s+/g, ' ');
          
          if (titleText) {
            console.log(`논문: ${titleText}`);
            item.biography.push({
              type: '논문',
              title: titleText,
              url: null,
              publicationDate: null,
              journalName: null
            });
          }
        }

        /* const titleText = $(dtElement).find('p.blogCont-history-date:contains("제목")').next('div.blogCont-history-content-wrap').find('p.blogCont-history-content').text().trim();
        if ( !functions.isEmpty(titleText)  && titleText?.length > 6) {
          
          const title = titleText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`논문 ${title}`);
          item.biography.push({
            type: '논문',
            title: title,
            url: null,
            publicationDate : null,
            journalName : null
          })   
        } */

      })

      await browser.close();
      return { error: error, data: item };

    } catch (error) {
      Error = error;
      console.log(`error on ${url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }

  },

  crwalingtreatise_new: async (browser, url) => {
    let error = null;
    if (!url) {
      return { error: true, data: null };
    }
    const page = await browser.newPage();
    try {
      // ⚠️ 페이지 이동 전 미리 dialog 감지 설정
      page.on('dialog', async (dialog) => {
        console.log(`🔔 알림창 감지됨: ${dialog.message()}`);
        await dialog.dismiss(); // 또는 dialog.accept();
      });
      page.setDefaultNavigationTimeout(0);
      
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.setViewport({
          width: 1200,
          height: 800
      });

      await page.keyboard.press('ArrowDown');
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');

      console.log("페이지 내 '더보기' 버튼을 반복적으로 클릭합니다.");

      let clickCount = 0;
      const maxAttempts = 50; // 안전장치: 무한루프 방지용

      while (true) {
        try {
          const result = await page.evaluate(async () => {
            const findVisibleMoreButton = () => {
              // 모든 버튼 중 텍스트가 '더보기'를 포함한 것 찾기
              const buttons = Array.from(document.querySelectorAll('button'));
              for (const btn of buttons) {
                const raw = (btn.innerText || btn.textContent || '').replace(/\u00A0/g, ' ');
                const text = raw.replace(/\s+/g, ' ').trim();
                if (/더보기/.test(text)) {
                  const style = window.getComputedStyle(btn);
                  const rect = btn.getBoundingClientRect();
                  const visible =
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    rect.width > 0 &&
                    rect.height > 0 &&
                    !btn.disabled;
                  if (visible) return btn;
                }
              }
              return null;
            };

            const button = findVisibleMoreButton();
            if (!button) return { clicked: false };

            try {
              button.click();
              return { clicked: true };
            } catch (e) {
              console.log("클릭 실패:", e.message);
              return { clicked: false };
            }
          });

          if (!result.clicked) {
            console.log("더 이상 '더보기' 버튼이 없습니다. 종료합니다.");
            break;
          }

          clickCount++;
          console.log(`${clickCount}번째 '더보기' 버튼 클릭 완료.`);
          
          await functions.puppeteerSleep(700);

        } catch (e) {
          console.log(`⚠️ 클릭 중 오류 발생: ${e.message}`);
          await functions.puppeteerSleep(700);
          continue;
        }
        
        if (clickCount >= maxAttempts) {
          console.log(`최대 ${maxAttempts}회 클릭 후 종료합니다 (무한루프 방지).`);
          break;
        }
      }

      console.log(`총 ${clickCount}회 '더보기' 클릭 완료.`);
     
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      
      let item = {
        biography: [],
      };

      $('#paperConArea').find('li').each((index, dtElement) => {
        const $label = $(dtElement).find('p.blogCont-history-date:contains("제목")');
        if ($label.length > 0) {
          const $content = $label.next('div.blogCont-history-content-wrap').find('p.blogCont-history-content');
          const titleText = $content.text().trim().replace(/\s+/g, ' ');
          
          if (titleText) {
            console.log(`논문: ${titleText}`);
            item.biography.push({
              type: '논문',
              title: titleText,
              url: null,
              publicationDate: null,
              journalName: null
            });
          }
        }
      });
      
      return { error: null, data: item };

    } catch (e) {
      error = e;
      console.log(`error on ${url} API return: ${e}`);
      return { error: error, data: [] };
    } finally {
        if(page) await page.close();
    }
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

    let result = null, error = null, DBCode = null, DBData = null;
    const newDetaulUrl = url.replace("//","/");
    const query = `CALL set_doctor_basic_v3(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url,profile_url,p_hName,newDetaulUrl]);
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




  generateAccessToken: async (account, deviceInfo) => {
    // console.log(`account: ${JSON.stringify(account)}`)
    let result = null, error = null, DBCode = null, DBData = null
    const targetAccount = _.get(account.cms_account, [0], null)
    const deviceType = _.get(deviceInfo.split(':'), [0], null)
    const deviceVersion = _.get(deviceInfo.split(':'), [1], null)
    const deviceUUID = _.get(deviceInfo.split(':'), [2], null)

    if (!targetAccount) error = RM.NO_RESULT
    const payload = {
      exp: Math.floor(Date.now() / 1000) + (60 * 10),
      cms_aid: targetAccount.cms_aid,
      cms_account_role: targetAccount.cms_account_role,
      device_type: deviceType,
      device_version: deviceVersion,
      device_UUID: deviceUUID
    }
    result = {
      accessToken: jwt.sign(payload, config.thisServer.jwtSecret, config.thisServer.jwtOption)
    }
    return { error: error, data: result };
  },


  setRefreshToken: async (cms_aid, refreshToken, deviceInfo, ip) => {
    let result = null, error = null, DBCode = null, DBData = null, refreshTokenInfo = null
    const deviceType = _.get(deviceInfo.split(':'), [0], null)
    const deviceVersion = _.get(deviceInfo.split(':'), [1], null)
    const deviceUUID = _.get(deviceInfo.split(':'), [2], null)
    const query = `CALL USP_CMS_ACCOUNT_SET_REFRESH_TOKEN(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [cms_aid, refreshToken, deviceType, deviceVersion, deviceUUID, ip]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])
    refreshTokenInfo = _.get(RS[2], [0], null)
    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = {
      cms_account: DBData,
      refreshTokenInfo: refreshTokenInfo,
      additionalInfo: `test`,
    }
    return { error: error, data: result };
  },

}



