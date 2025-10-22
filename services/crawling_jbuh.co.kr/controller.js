const config = require(`${global.appRoot}/server/config/configuration`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;


module.exports = {


  crwalingProcess01: async (r_url) => {
    
    try {
 
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
      const iconElements = $('#sort').find('div.obj div.col').find('div.item').toArray();
      for (const element of iconElements) {
       
        const deptName = $(element).find('a').find("div.inner").find('div.card--body').find('strong.title').text() ? $(element).find('a').find("div.inner").find('div.card--body').find('strong.title').text().trim() : '';
        const tmpLink = $(element).find("a").attr('href') ? $(element).find("a").attr('href')  : '';
        
        
        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const link = `https://www.jbuh.co.kr${tmpLink}`;
          let reDeptname = deptName;
          if (deptName.includes("간담췌이식혈관외과(간담췌외과)")) {
            reDeptname = "간담췌·이식혈관외과(간담췌이식외과)";
          } else if (deptName.includes("간담췌이식혈관외과(혈관이식외과)")) {
            reDeptname = "간담췌·이식혈관외과(혈관이식외과)";
          } else if (deptName.includes("내분비대사내과")) {
            reDeptname = "내분비 · 대사내과";
          } else if (deptName.includes("소화기외과(대장항문외과)")) {
            reDeptname = "소화기(대장항문)외과";
          } else if (deptName.includes("소화기외과(위장관외과)")) {
            reDeptname = "소화기(위장관)외과";
          } else if (deptName.includes("유방갑상선외과")) {
            reDeptname = "유방 · 갑상선외과";
          } else if (deptName.includes("혈액종양내과")) {
            reDeptname = "혈액 · 종양내과";
          } else if (deptName.includes("호흡기알레르기내과")) {
            reDeptname = "호흡기 · 알레르기내과";
          }
          console.log(`deptName: ${reDeptname} ${link}`);
          dept.push({ 
            deptName : reDeptname,
            link,
          });
        }
      }
      console.log(`size of doctors: `,_.size(dept));
      await browser.close();
      return { error: null, data: dept };
    } catch (error) {
      console.log(`error on ${r_url} API return: ${error}`);
      await browser.close();
      return { error: error, data: [] };
    }
  },
  crwalingProcess01_old: async (r_url) => {
    
    try {
 
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

      const iconElements = $('#sort').find('div.obj div.col').find('div.item').toArray();
      const doctors = [];
      for (const element of iconElements) {
       
        const deptName = $(element).find('a').find("div.inner").find('div.card--body').find('strong.title').text() ? $(element).find('a').find("div.inner").find('div.card--body').find('strong.title').text().trim() : '';
        const tmpLink = $(element).find("a").attr('href') ? $(element).find("a").attr('href')  : '';
        
        console.log(`deptName: ${deptName} ${tmpLink}`);
        if ( !functions.isEmpty(tmpLink) && !functions.isEmpty(deptName) ) {
          const regex = /doctorsearch_dept\('([^\']+)'\);/;
          const match = tmpLink.match(regex);
          
          if (match) {
            const deptCode = match[1]; // IMID가 dept에 저장됩니다.
            //console.log(`deptCode: ${deptCode}`); // IMID 출력
         
            await page.waitForFunction(() => typeof doctorsearch_dept === 'function');

            // 브라우저 콘텍스트에서 함수 실행
            await page.evaluate((code) => {
              doctorsearch_dept(code);
            }, deptCode);
            // form 전송 후 페이지가 로딩되도록 기다리기
            //await page.waitForNavigation();
            await page.waitForSelector('table.tab_style02', { timeout: 10000 });
            // 페이지 내용 크롤링
            await CS.wait(300);
            const content = await page.content();
            const $_Sub = cheerio.load(content);
            const iconElements = $_Sub('div.text_content').find("div.detail_view").find('h4.h4_tit01').text();
            //console.log(`iconElements: ${iconElements}`); // IMID 출력

            const depthElements = $_Sub('div.text_content').find("caption:contains('의료진／진료일정')").parent('table').find("tbody > tr").toArray();
    
            for (const liElement of depthElements) {
              let doctorUrl = null;
              const doctorName = $(liElement).find('td:eq(1)').find('table > tbody > tr > td:eq(0) > p > strong > a').text() ? $(liElement).find('td:eq(1)').find('table > tbody > tr > td:eq(0) > p > strong > a').text().trim() : '';
              const detailLink = $(liElement).find('td:eq(1)').find('table > tbody > tr > td:eq(0) > p > strong').find('a').attr('onclick') ? $(liElement).find('td:eq(1)').find('table > tbody > tr > td:eq(0) > p > strong').find('a').attr('onclick') : '';
              const doctorProfileUrl = $(liElement).find('td:eq(0)').find('a > img').attr('src') ? $(liElement).find('td:eq(0)').find('a > img').attr('src') : '';
              if ( !functions.isEmpty(doctorName) && !functions.isEmpty(detailLink) ) {
                //console.log(`doctorName: ${doctorName}, detailLink: ${detailLink}, doctorProfileUrl: ${doctorProfileUrl}`); // IMID 출력
                //console.log(`detailLink: ${detailLink}`); // detailLink 값 확인
                const regex2 = /openpopN\('([^\']+)',\'([^\']+)',\'([^\']+)',\'([^\']+)',\'([^\']+)'\)/; // ; 제거
                const match2 = detailLink.match(regex2);
               // detailLink 값 확인
                if (match2) {
                  const valuesArray = match2.slice(1); // 첫 번째 요소는 전체 매치이므로 제외
                  console.log(`valuesArray: ${valuesArray}`); // ['../dept/dept_doctor_Career.jsp', '96304', '감염내과', 'IMID', 'N']
                  const valuesArrayLink = valuesArray[0]; 
                  const valuesArrayDOCT = valuesArray[1]; 
                  const valuesArrayDeptName = valuesArray[2]; 
                  const valuesArrayDeptNo = valuesArray[3]; 
                  const valuesArrayType = valuesArray[4]; 
                  
                  doctorUrl = `https://www.jbuh.co.kr/cuh/main/dept/dept_doctor.jsp?docNo=${valuesArrayDOCT}`;

                  if ( !functions.isEmpty(doctorUrl) ) {
                    const newPagePromise = new Promise((resolve) => {
                      browser.once('targetcreated', async (target) => {
                        const newPage = await target.page();
                        resolve(newPage);
                      });
                    });

                    const codeArray = {
                      valuesArrayLink,valuesArrayDOCT,valuesArrayDeptName,valuesArrayDeptNo,valuesArrayType
                    }
                    await page.waitForFunction(() => typeof openpopN === 'function');
                    // 브라우저 콘텍스트에서 함수 실행
                    await page.evaluate((codeArray) => {
                      openpopN(codeArray.valuesArrayLink,codeArray.valuesArrayDOCT,codeArray.valuesArrayDeptName,codeArray.valuesArrayDeptNo,codeArray.valuesArrayType);
                    }, codeArray);
                    const newPage = await newPagePromise
                    await CS.wait(500);
                    await newPage.waitForSelector('div.blogDoctor', { timeout: 10000 });
                    await CS.wait(300);
                    const docContent = await newPage.content();
                    const $_DocSub = cheerio.load(docContent);
                    let specialtyJson = null;
                    let specialty = null;
                    const tmpSpecialty = $_DocSub('div.doctorInfo').find("#pdoct1").find('p').find('strong').remove().end().find('br').remove().end().text();

                    if ( !functions.isEmpty(tmpSpecialty) ) {
                      specialty = tmpSpecialty.replaceAll(/\n|\r|/g, '').trim();
                      console.log(`specialty: ${specialty}`); // IMID 출력
                      specialtyJson = specialty.split(",");
                    }

                    const doctor = {
                      doctorName,
                      deptName,
                      url: doctorUrl,
                      specialty,
                      specialtyJson,
                      profile_url: !functions.isEmpty(doctorProfileUrl) ? `https://www.jbuh.co.kr${doctorProfileUrl}` : null,
                      biography: [],
                      paper: [],
                    };

                    $_DocSub('#Menu_02').find('div').each((index, dtElement) => {

                      const categoryCheck = $(dtElement).find("table > caption").text();
                      if ( !functions.isEmpty(categoryCheck) ) {
                        if ( categoryCheck.includes('학력') ) {
                          $(dtElement).find('tbody > tr').each((liIndex, liElement) => {
                            const dtYearText = $(liElement).find('td:eq(0)').text() ? $(liElement).find('td:eq(0)').text() : '';
                            const dtText = $(liElement).find('td:eq(1)').text() ? $(liElement).find('td:eq(1)').text() : '';
                    
                            //console.log(`학력: ${dtYearText} ${dtText}`);
                            if ( !functions.isEmpty(dtText) ) {
                              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                              doctor.biography.push({
                                targetDate : dtYearText,
                                type: "학력",
                                text: tmpText,
                                url: null,
                                issuer:null
                              });
                            }
                          })
                        }else if ( categoryCheck.includes('경력') ) {
                          $(dtElement).find('tbody > tr').each((liIndex, liElement) => {
                            const dtYearText = $(liElement).find('td:eq(0)').text() ? $(liElement).find('td:eq(0)').text() : '';
                            const dtText = $(liElement).find('td:eq(1)').text() ? $(liElement).find('td:eq(1)').text() : '';
                    
                            //console.log(`경력: ${dtYearText} ${dtText}`);
                            if ( !functions.isEmpty(dtText) ) {
                              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                              doctor.biography.push({
                                targetDate : dtYearText,
                                type: "경력",
                                text: tmpText,
                                url: null,
                                issuer:null
                              });
                            }
                          })
                        }
                      }
                    });

                    $_DocSub('#Menu_03').find('div').each((index, dtElement) => {

                      const categoryCheck = $(dtElement).find("table > caption").text();
                      if ( !functions.isEmpty(categoryCheck) ) {
                        if ( categoryCheck.includes('저서') ) {
                          $(dtElement).find('tbody > tr').each((liIndex, liElement) => {
                            const dtYearText = '';
                            const dtText = $(liElement).find('td:eq(1)').text() ? $(liElement).find('td:eq(1)').text() : '';
                    
                            console.log(`저서/논문: ${dtYearText} ${dtText}`);
                            if ( !functions.isEmpty(dtText) && dtText?.length > 10 ) {
                              const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
                              doctor.biography.push({
                                targetDate : dtYearText,
                                type: "저서",
                                text: tmpText,
                                url: null,
                                issuer:null
                              });

                              doctor.paper.push({
                                publicationDate : dtYearText,
                                type: "논문",
                                title: tmpText,
                                url: null,
                                journalName:null
                              });
                            }
                          })
                        }
                      }
                    });

                    doctors.push(doctor); 

                    await CS.wait(1000);
                    await newPage.close();
                  }
                }
              }
            }
            await CS.wait(1000);
            await page.goBack({ waitUntil: 'domcontentloaded' });
          }
        }
      };

      console.log(`size of doctors: `,_.size(doctors));
      await browser.close();
      return { error: null, data: doctors };
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

    console.log(`url: ${url} ${deptName}`);
    try{

      const browser = await puppeteer.launch();
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);

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
      $('div.doctor-list > div.dl-inner').find('div.dl-item').each((index, element) => {
        const doctorName = $(element).find('div.dl-top').find("div.dl-text-box").find('div.dl-name-wrap').find('strong.dl-name').text() ? $(element).find('div.dl-top').find("div.dl-text-box").find('div.dl-name-wrap').find('strong.dl-name').text().trim() : '';
        const detailLink = $(element).find('div.dl-bottom').find('div.dl-buttonBox').find("div.dl-buttonbox-item:first-child").find('a').attr('href') ? $(element).find('div.dl-bottom').find('div.dl-buttonBox').find("div.dl-buttonbox-item:first-child").find('a').attr('href') : '';
        const doctorProfileUrl = $(element).find('div.dl-top').find('div.img-inner').find('img').attr('src') ? $(element).find('div.dl-top').find('div.img-inner').find('img').attr('src') : '';
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://www.jbuh.co.kr${detailLink}`;
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `https://www.jbuh.co.kr${doctorProfileUrl}`;
        }
        const doctorName2 = doctorName.replace("교수","").trim();
        console.log(`Adding doctor list: ${doctorName2} ${deptName} ${tmpProfileUrl} ${tmpLink}`); // 디버
        if ( !functions.isEmpty(doctorName2) && !functions.isEmpty(tmpLink) ) {
          const doctor = {
            doctorName : doctorName2,
            deptName,
            url: tmpLink,
            profile_url : tmpProfileUrl
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
  crwalingProcess02_old: async (url,deptName) => {
    let result = null, error = null, DBCode = null;
    if (functions.isEmpty(url)) {
      return { error: true, data: [] };
    }

    console.log(`url: ${url} ${deptName}`);
    try{

      const browser = await puppeteer.launch();
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);

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
      $('div.mediteam_wrap').find('ul.dr_list > li').each((index, element) => {
        const doctorName = $(element).find('div.info_area > div.d_info').find('span.name').text() ?$(element).find('div.info_area > div.d_info').find('span.name').text().trim() : '';
        const detailLink = $(element).find('div.img_area').find('a').attr('href') ? $(element).find('div.img_area').find('a').attr('href') : '';
        const doctorProfileUrl = $(element).find('div.img_area').find('img').attr('src') ? $(element).find('div.img_area').find('img').attr('src') : '';
        let tmpLink = null;
        let tmpProfileUrl = null;
        if ( !functions.isEmpty(detailLink) ) {
          tmpLink =  `https://www.wkuh.org${detailLink}`;
        }
        if ( !functions.isEmpty(doctorProfileUrl) ) {
          tmpProfileUrl =  `https://www.wkuh.org${doctorProfileUrl}`;
        }
        const doctorName2 = doctorName.replace("교수","").trim();
        console.log(`Adding doctor list: ${doctorName2} ${deptName} ${tmpProfileUrl} ${tmpLink}`); // 디버
        if ( !functions.isEmpty(doctorName2) && !functions.isEmpty(tmpLink) ) {
          const doctor = {
            doctorName : doctorName2,
            deptName,
            url: tmpLink,
            profile_url : tmpProfileUrl
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
    let browser;
    //const url = params.url;
    console.log(`crwalingProcess03: ${url}`); 
   
    if (!url) {
      return { error: true, data: null };
    }
    try {
      browser = await puppeteer.launch();
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

      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);
      let tmpSpecialty = $('div.mtInfo').find('div.info-con').find('p.conText').text() ? $('div.mtInfo').find('div.info-con').find('p.conText').text().trim() : '';
      console.log(`specialtyJson: ${tmpSpecialty}`);
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");

      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, ''),
        specialtyJson: specialtyJson,
        biography: [],
      };

      $('div.content-area').find('#group1').find('ul.content-list').find('li').each((j, pEl) => {
        const dtText = $(pEl).find('p.tit').text() ? $(pEl).find('p.tit').text().trim().substring(0,500): '';
        const dtYearText = '';

        if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {

          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`학력 ${dtYearText} ${tmpText}`);
          item.biography.push({
            targetDate : dtYearText,
            type: "학력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('div.content-area').find('#group2').find('ul.content-list').find('li').each((j, pEl) => {
        const dtText = $(pEl).find('p.tit').text() ? $(pEl).find('p.tit').text().trim().substring(0,500): '';
        const dtYearText = '';

        if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {

          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`경력 ${dtYearText} ${tmpText}`);
          item.biography.push({
            targetDate : dtYearText,
            type: "경력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });
      console.log('group3 count:', $('div.content-area').find('#group3').find('ul.content-list').find('li').length);
      $('div.content-area').find('#group3').find('ul.content-list').find('li').each((j, pEl) => {
        const dtText = $(pEl).find('p.tit').text() ? $(pEl).find('p.tit').text().trim() : '';
        console.log(`학회 ${dtText}`);
        const dtYearText = '';

        if ( dtText) {

          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`학회 ${dtYearText} ${tmpText}`);
          item.biography.push({
            targetDate : dtYearText,
            type: "학회",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      console.log('group4 count:', $('div.content-area').find('#group4').find('ul.content-list').find('li').length);
      $('div.content-area').find('#group4').find('ul.content-list').find('li').each((j, pEl) => {
        const dtText = $(pEl).find('p.tit').text() ? $(pEl).find('p.tit').text().trim().substring(0,500): '';
        const dtYearText = '';

        if ( dtText ) {

          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`저서 ${dtYearText} ${tmpText}`);
          item.biography.push({
            targetDate : dtYearText,
            type: "저서",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      await browser.close();
      return { error: error, data: item };

    } catch (error) {
      console.log(`error on ${url} API return: ${error}`);
      if (browser) {
        await browser.close();
      }
      return { error: error, data: [] };
    }
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
      const browser = await puppeteer.launch({ headless: true });
        // Open a new page
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      //await page.waitForSelector('.inner');
      // Navigate to the website
      await page.goto(url,{waitUntil: "networkidle2"});
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36');
      await page.setViewport({
          width: 1200,
          height: 800
      });
      const ua = await page.evaluate(() => navigator.userAgent);
      console.log(ua);
      await functions.puppeteerSleep(2000);
      let prevHeight;
      while (true) {
        prevHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await functions.puppeteerSleep(1000);
        let newHeight = await page.evaluate('document.body.scrollHeight');
        if (newHeight === prevHeight) break; // 더 이상 로딩 안됨
      }
      const lis = await page.$$eval('#group4 li', els => els.map(el => el.textContent));
      console.log(lis.length); // 15
      //await page.keyboard.press('ArrowDown')
      await page.waitForSelector("#group4");
      //await CS.wait(1000);
      //await page.keyboard.press('ArrowUp');
      const isReact = await page.evaluate(() => !!window.React || !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
      const isVue = await page.evaluate(() => !!window.Vue);
      const isAngular = await page.evaluate(() => !!window.angular);

      console.log({ isReact, isVue, isAngular });
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      
      let item = {
        biography: [],
      };

      console.log('group4 count:', $('div.content-area').find('#group4').find('ul').find('li').length);
      $('div.content-area').find('#group4').find('ul').find('li').each((j, pEl) => {
        const dtText = $(pEl).find('p.tit').text() ? $(pEl).find('p.tit').text().trim().substring(0,500): '';
        const dtYearText = '';
        
        if ( !functions.isEmpty(dtText)  && dtText?.length > 6) {
          
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`논문 ${dtYearText} ${tmpText}`);
          item.biography.push({
            publicationDate : dtYearText,
            type: "논문",
            title: tmpText,
            url: null,
            journalName:null
          });
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


  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url,profile_url,p_hName,originalUrl) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_basic_v3(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url,profile_url,p_hName,originalUrl]);
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
    DBData = _.get(RS, [1_0], [])

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