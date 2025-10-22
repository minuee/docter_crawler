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

      $('div.index-department-list').find('div.index-department-area').each((index, element) => {

        const deptName = $(element).find('a > span.group > span').text() ? $(element).find('a > span.group > span').text().trim() : '';
        const tmpLink = $(element).find('a').attr('') ? $(element).find('a').attr('href') : '';

        const onclickAttr = tmpLink;

        const match = onclickAttr.match(/fn_goLink\('([^']+)'\)/);

        if (match) {
          const extractedValue = match[1];
          console.log('📌 추출된 값:', extractedValue); // IG
        } else {
          console.log('❌ 값 추출 실패');
        }
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

  crwalingProcess01_new : async (r_url) => {
    let DoctorLists = [];
    let DepthLists = [];
    try {
      const browser = await puppeteer.launch({ headless: true }); // headless: false로 실제 동작 확인 가능
      const page = await browser.newPage();
      await page.goto(r_url);
    
      const links = await page.$$('div.index-department-area');

      for (let i = 0; i < links.length ; i++) {
        try {
          const link = links[i];

          const anchor = await link.$('a');
          if (!anchor) continue;

          const deptName = await link.$eval('strong', el => el.textContent.trim());
          const onclickAttr = await link.$eval('a', el => el.getAttribute('onclick'));

          if (deptName && onclickAttr) {
            const hrefCode = onclickAttr.match(/fn_goLink\('(.+?)'\)/)?.[1];
            DepthLists.push({
              deptName,
              hrefCode
            })
            if (hrefCode) {
              console.log(`▶️ ${deptName} 이동 시도 (code: ${hrefCode})`);

              // 1차 이동 (서브페이지)
              await page.evaluate((code) => fn_goLink(code), hrefCode);
              await page.waitForNavigation({ waitUntil: 'networkidle0' });

              const title = await page.title();
              //console.log(`📄 1차 페이지 제목: ${title}`);
              await CS.wait(500);
              try {
                // 2차 이동 가능 여부 확인 (서브-서브)
                const doctorAnchors = await page.$$('div.doctor-information-wrapper');

                for (const block of doctorAnchors) {
                  try {
                    //const subOnclick = await page.$eval("div.doctor-information dl > dt > a", el => el.getAttribute("onclick"));
                    //const subOnclick = await anchor.evaluate(el => el.getAttribute("onclick"))
                    const anchor = await block.$('dl > dt > a');
                    if (!anchor) continue;

                    const subOnclick = await anchor.evaluate(el => el.getAttribute('onclick'));
                    const subHrefCode = subOnclick?.match(/fn_goDtl\('(.+?)'\)/)?.[1];
                    //console.log(`✅ subHrefCode: ${subHrefCode}`);

                    // 정보 추출
                    const depth1DocName = await page.$eval("div.doctor-information dl > dd > strong > span", el => el.textContent.trim());
                    const docLink = await page.$eval("div.doctor-information dl > dd a", el => el.getAttribute("href"));
                    console.log(`✅ ${deptName} 의사명: ${depth1DocName}, 링크: ${docLink}`);

                    if (subHrefCode) {
                      const doctorAnchors = await page.$$('div.doctor-information dl > dd a');
                      //console.log(`➡️ 서브페이지 내부 이동 감지, 재이동 (code: ${subHrefCode})`);
                      // 새 페이지 열릴 준비 (targetcreated 감지)
                      const existingTargets = await browser.targets(); // 기존 targets 미리 저장
                      await page.evaluate((code) => fn_goDtl(code), subHrefCode);

                      const newTarget = await browser.waitForTarget(
                        target => (
                          !existingTargets.includes(target) &&
                          target.url().includes('smc.skku.edu/doctor/main/main.do') &&
                          target.type() === 'page'
                        ),
                        { timeout: 10000 }
                      );
                      const newPage = await newTarget.page();

                      // 새 창 활성화
                      await newPage.bringToFront();
                      await newPage.waitForSelector('#section1', { timeout: 10000 });

                      const htmlContent = await newPage.$eval('div.contents', el => el.outerHTML);
                      const $ = cheerio.load(htmlContent);

                      const depth2DocName = $("div.doctor-information-box h2 strong").text();
                      const depth2Speciality = $("div.doctor-information-box dl").find("dd").find("span:eq(0)").text();
                      const depth2ProfileUrl = $("div.doctor-information-area").find("img").attr("src");
                      const depth2DoctorUrl = `https://smc.skku.edu/doctor/main/main.do?mId=1&doctorNo=${subHrefCode}`
                      
                      console.log(`📄 [2차 서브페이지] 진료과 ${deptName} 의사명: ${depth2DocName} 프사: ${depth2ProfileUrl} 진료명: ${depth2Speciality} 세부링크 ${depth2DoctorUrl}`);
            
                      let specialtyJson = depth2Speciality.split(",");
                      let tmpProfileImgUrlSe = "";
                      if ( !functions.isEmpty(depth2ProfileUrl)) {
                        tmpProfileImgUrlSe = `https://smc.skku.edu${depth2ProfileUrl}`;
                      } 
                      let item = {
                        specialty: depth2Speciality.replaceAll(/\n|\r|/g, ''),
                        specialtyJson: specialtyJson,
                        profileImgUrl: tmpProfileImgUrlSe,
                        biography: [],
                        paper : []
                      };

                      $('#career-box1').find("div.scroll-wrapper").find("h3:contains('학력')").next('ul').find("li").each((index, dtElement) => {
            
                        const dtYearText =  '';
                        const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
                        console.log(`학력 ${dtText}`);
                        if ( !functions.isEmpty(dtText) ) {
                          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                          item.biography.push({
                            targetDate : dtYearText,
                            type: "학력",
                            text: tmpText,
                            url: null,
                            issuer:null
                          });
                        }
                      });

                      $('#career-box1').find("div.scroll-wrapper").find("h3:contains('경력')").next('ul').find("li").each((index, dtElement) => {
            
                        const dtYearText =  '';
                        const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
                        console.log(`경력 ${dtText}`);
                        if ( !functions.isEmpty(dtText) ) {
                          const tmpText = dtText.replace("- ","").replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                          item.biography.push({
                            targetDate : dtYearText,
                            type: "경력",
                            text: tmpText,
                            url: null,
                            issuer:null
                          });
                        }
                      });

                      $('#career-box1').find("div.scroll-wrapper").find("h3:contains('연수')").next('ul').find("li").each((index, dtElement) => {
            
                        const dtYearText =  '';
                        const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
                        //console.log(`연수 ${dtText}`);
                        if ( !functions.isEmpty(dtText) ) {
                          const tmpText = dtText.replace("- ","").replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                          item.biography.push({
                            targetDate : dtYearText,
                            type: "연수",
                            text: tmpText,
                            url: null,
                            issuer:null
                          });
                        }
                      });

                      $('#career-box3').find("div.scroll-wrapper").find("h3:contains('학회 및 기타활동')").next('ul').find("li").each((index, dtElement) => {
            
                        const dtYearText =  '';
                        const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
                        //console.log(`학회 ${dtText}`);
                        if ( !functions.isEmpty(dtText) ) {
                          const tmpText = dtText.replace("- ","").replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                          item.biography.push({
                            targetDate : dtYearText,
                            type: "학회",
                            text: tmpText,
                            url: null,
                            issuer:null
                          });
                        }
                      });

                      $('#career-box5').find("div.scroll-wrapper").find("h3:contains('논문')").next('ul').find("li").each((index, dtElement) => {
            
                        const dtYearText =  '';
                        const dtText = $(dtElement).text() ? $(dtElement).text().trim() : '';
                        console.log(`논문 ${dtText}`);
                        if ( !functions.isEmpty(dtText) ) {
                          const tmpText = dtText.replace("- ","").replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                          item.paper.push({
                            targetDate : dtYearText,
                            type: "논문",
                            text: tmpText,
                            url: null,
                            issuer:null
                          });
                        }
                      });
                      
                      if ( !functions.isEmpty(deptName) && !functions.isEmpty(depth2DocName) && !functions.isEmpty(depth2DoctorUrl)) {
                        const saveDoctorName = depth2DocName.replace("교수","").trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                        const saveDepthName = deptName.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');

                        DoctorLists.push({
                          doctorName: saveDoctorName,
                          deptName: saveDepthName,
                          url: depth2DoctorUrl,
                          career : item
                        });
                      }
                      await CS.wait(500);
                      await newPage.close(); // 새 창 닫기
                    }
                  } catch (err) {
                    console.log(`❗️ 2차 이동 실패 또는 누락: ${err.message}`);
                  }
                }
              } catch (e) {
                console.log(`❗️ 의사 정보 추출 실패 또는 서브-서브 페이지 없음: ${e.message}`);
              }

              // 뒤로 돌아가기 (메인페이지로)
              await page.goBack({ waitUntil: 'networkidle0' });
              await page.waitForSelector('div.index-department-area');

              // 링크 갱신 (DOM 재변경 대응)
              links.length = 0;
              links.push(...await page.$$('div.index-department-area'));
              await CS.wait(1000);
            }
          }
        } catch (err) {
          console.error(`❗ 에러 발생 (index ${i}):`, err.message);
        }
      }
    console.log(`✅ 수집된 진료과 수: ${DepthLists.length} 수집된 의사 수: ${DoctorLists.length}`);
    await browser.close();
    return { error: null, data: DoctorLists };

    } catch (error) {
    console.log(`❌ Error on ${r_url}: ${error}`);
    return { error, data: [] };
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



