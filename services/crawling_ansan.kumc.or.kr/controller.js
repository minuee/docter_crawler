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
      ///console.log(`r_url: ${r_url} ${$('div.medi_index_wrap').attr('class')}`);
      $('div.list_type02').find('ul > li').each((index, element) => {

        const deptName = $(element).find('div.imglist_outer').find('p').text() ? $(element).find('div.imglist_outer').find('p').text().trim() : '';
        let tmpLinkDepthNo = null;
        switch( deptName ) {
          case "가정의학과" :tmpLinkDepthNo = "ASFM"; break;
          case "간담췌외과" :tmpLinkDepthNo = "ASHPS"; break;
          case "감염내과" :tmpLinkDepthNo = "ASID"; break;
          case "내분비내과" :tmpLinkDepthNo = "ASEC"; break;
          case "대장항문외과" :tmpLinkDepthNo = "ASCRS"; break;
          case "류마티스내과" :tmpLinkDepthNo = "ASRH"; break;
          case "마취통증의학과" :tmpLinkDepthNo = "ASAN"; break;
          case "방사선종양학과" :tmpLinkDepthNo = "ASRO"; break;
          case "병리과" :tmpLinkDepthNo = "ASAP"; break;
          case "비뇨의학과" :tmpLinkDepthNo = "ASGU"; break;
          case "산부인과" :tmpLinkDepthNo = "ASOG"; break;
          case "성형외과" :tmpLinkDepthNo = "ASPS"; break;
          case "소아외과" :tmpLinkDepthNo = "ASPDS"; break;
          case "소아청소년과" :tmpLinkDepthNo = "ASPD"; break;
          case "소화기내과" :tmpLinkDepthNo = "ASGE"; break;
          case "순환기내과" :tmpLinkDepthNo = "ASCA"; break;
          case "신경과" :tmpLinkDepthNo = "ASNU"; break;
          case "신경외과" :tmpLinkDepthNo = "ASNS"; break;
          case "신장내과" :tmpLinkDepthNo = "ASNE"; break;
          case "심장혈관흉부외과" :tmpLinkDepthNo = "ASCS"; break;
          case "안과" :tmpLinkDepthNo = "ASOP"; break;
          case "영상의학과" :tmpLinkDepthNo = "ASDR"; break;
          case "위장관외과(상부)" :tmpLinkDepthNo = "ASGES"; break;
          case "유방내분비외과" :tmpLinkDepthNo = "ASBES"; break;
          case "응급의학과" :tmpLinkDepthNo = "ASED"; break;
          case "이비인후·두경부외과" :tmpLinkDepthNo = "ASOL"; break;
          case "재활의학과" :tmpLinkDepthNo = "ASRM"; break;
          case "정신건강의학과" :tmpLinkDepthNo = "ASPY"; break;
          case "정형외과" :tmpLinkDepthNo = "ASOS"; break;
          case "중환자의학과" :tmpLinkDepthNo = "ASDCCM"; break;
          case "직업환경의학과" :tmpLinkDepthNo = "ASOM"; break;
          case "진단검사의학과" :tmpLinkDepthNo = "ASCP"; break;
          case "치과구강악안면외과" :tmpLinkDepthNo = "ASDT"; break;
          case "치과보존과" :tmpLinkDepthNo = "ASDTC"; break;
          case "치과보철과" :tmpLinkDepthNo = "ASDTP"; break;
          case "치과치주과" :tmpLinkDepthNo = "202857"; break;
          case "피부과" :tmpLinkDepthNo = "ASDM"; break;
          case "핵의학과" :tmpLinkDepthNo = "ASNM"; break;
          case "혈액종양내과" :tmpLinkDepthNo = "ASHO"; break;
          case "호흡기내과" :tmpLinkDepthNo = "ASPU"; break;
          default: tmpLinkDepthNo = null; break;
        } 
       
        if ( !functions.isEmpty(deptName) && !functions.isEmpty(tmpLinkDepthNo) ) {
          const link = `https://ansan.kumc.or.kr/kr/doctor-department/department/view.do?deptCd=${tmpLinkDepthNo}`;
         
          dept.push({ 
            deptName,
            link,
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

  crwalingProcess02: async (url,deptName) => {
    let result = null, error = null, DBCode = null;

    if (functions.isEmpty(url)) {
      return { error: true, data: [] };
    }
    
    console.log(`url: ${url}, deptName: ${deptName}`);
    try {
      const browser = await puppeteer.launch();
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

      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  

      const checkelement = $("div.tab_col_3 > ul").attr("class");
      console.log(`checkelement: ${checkelement}`);

      const doctors = [];
      $('div.doctorList > div').find('div.profile_box').each((index, element) => {
        const doctorName = $(element).find('div.doctor_cont').find('p.doctor_name > span:first-child').text() ? $(element).find('div.doctor_cont').find('p.doctor_name > span:first-child').text() : '';
        const doctorNo = $(element).find('div.doctor_cont').find('div.doctor_cont_inner > a').attr('data-no') ? $(element).find('div.doctor_cont').find('div.doctor_cont_inner > a').attr('data-no') : 0;
        const tmpLink = `https://ansan.kumc.or.kr/kr/doctor-department/doctor/view.do?drNo=${doctorNo}`;
        const profileUrlTmp = $(element).find('div.doctor_img').find('img').attr('src');
        const profileUrl = profileUrlTmp ? `https://ansan.kumc.or.kr/kr${profileUrlTmp}` : "";
        console.log(`Adding doctor list: ${index} ${doctorName} ${doctorNo} ${tmpLink}`); // 디버깅을 위한 로그
        
        if ( doctorNo > 0 && !functions.isEmpty(doctorName) && !functions.isEmpty(deptName)) {
          const doctor = {
            doctorName,
            deptName,
            url: tmpLink,
            profileUrl
          };
          doctors.push(doctor); 

        }
      });
  
      console.log(`doctors:${doctors.length}`);
      return { error: error, data: doctors };
      
    } catch (error) {
      Error = error
      console.log(`error on ${link} API return: ${error}`);
    }

    
  },



  crwalingProcess03: async (url) => {

    console.log(`crwalingProcess03: ${url}`);
    let result = null, error = null, DBCode = null
 
    let Response = { status: null, data: null }
     
    if (!url) {
      return { error: true, data: null };
    }
   
    try {
      const browser = await puppeteer.launch();
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

      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');

      // 페이지에 있는 모든 '더보기' 버튼을 찾아 클릭합니다.
      console.log("페이지에 있는 모든 '더보기' 버튼을 찾아서 클릭합니다.");
      await page.evaluate(async () => {
          const allMoreButtons = Array.from(document.querySelectorAll("a")).filter(link => link.textContent.includes('더보기'));
          console.log(`총 ${allMoreButtons.length}개의 '더보기' 버튼을 찾았습니다.`);
          for (const button of allMoreButtons) {
              try {
                  button.click();
              } catch (e) {
                  console.log('사라졌거나 클릭할 수 없는 \'더보기\' 버튼입니다.');
              }
          }
      });
      // evaluate 내에서 발생한 클릭으로 인한 비동기 작업(네트워크 로드 등)이 완료되기를 기다리기 위해 추가 대기 시간을 줍니다.
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log("모든 '더보기' 버튼 클릭 시도를 완료했습니다.");
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  


      const profileImgUrl = $('div.container > div').find("img").attr('src') ? $('div.container > div').find("img").attr('src') : '';
      let tmpSpecialty = $('div.doctorwrap')
      .find('li.field_title')
      .filter((i, el) => $(el).text().trim() === '전문진료분야') // 정확히 매칭
      .parent('ul') // 부모 ul
      .find('li.field_contents') // ul 안의 field_contents만
      .first() // 혹시 여러개 있을 수 있으므로 첫 번째만
      .text() 
      ? $('div.doctorwrap')
      .find('li.field_title')
      .filter((i, el) => $(el).text().trim() === '전문진료분야') // 정확히 매칭
      .parent('ul') // 부모 ul
      .find('li.field_contents') // ul 안의 field_contents만
      .first() // 혹시 여러개 있을 수 있으므로 첫 번째만
      .text().trim()  
      : '';
      // 진료분야를 json화 한다
      let specialtyJson = tmpSpecialty.split(",");
      //console.log(`specialtyJson: ${JSON.stringify(specialtyJson)}`);
      // 학력 경력
      let item = {
        specialty: tmpSpecialty.replaceAll(/\n|\r|/g, '').substring(0,500),
        specialtyJson: specialtyJson,
        profileImgUrl: `https://ansan.kumc.or.kr/${profileImgUrl}`,
        biography: [],
      };
      //const smaple = $('#_careerContainer').find('._careerIem:first-child > td').text();
      console.log(`_press: ${JSON.stringify(item)}`);

      $('#line2').find("p.info_tit:contains('학력')").next("div.doc_info01_table").find('table > tbody > tr').each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('th').text() ? $(dtElement).find('th').text() : '';
        const dtText = $(dtElement).find('td').text() ? $(dtElement).find('td').text() : '';
 
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`학력 tmpText: ${tmpText}`)
          item.biography.push({
            targetDate : dtYearText,
            type: "학력",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#line2').find('div.tab_ui').find('div.tab_cont').find('table').each((index, dtTopElement) => {
        // caption 태그의 텍스트만 비교해야 함
        const captionText = $(dtTopElement).find('caption').text().trim();

        if (captionText === '의료진 경력 정보') {
          // 해당 caption이 "의료진 경력 정보"인 테이블만 탐색
          $(dtTopElement)
            .find('tbody > tr')
            .each((i, dtElement) => {
              const dtYearText = $(dtElement).find('th').text().trim();
              const dtText = $(dtElement).find('td').text().trim();

              if (dtText) {
                const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replace(/\r/g, '');
                console.log(`경력 tmpText: ${tmpText}`);

                item.biography.push({
                  targetDate: dtYearText,
                  type: '경력',
                  text: tmpText,
                  url: null,
                  issuer: null,
                });
              }
            });
        }
      });


      $('#line2').find("div.tab_ui").find("div.tab_cont > ul > li:nth-child(2)").find('table').find("tbody > tr").each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('th').text() ? $(dtElement).find('th').text() : '';
        const dtText = $(dtElement).find('td').text() ? $(dtElement).find('td').text() : '';

        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`학회 tmpText: ${tmpText}`)
          item.biography.push({
            targetDate : dtYearText,
            type: "학회",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      /* $('#line3').find("div.tab_ui").find("div.tab_cont > ul > li:first-child").find('table').find("tbody > tr").each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('th').text() ? $(dtElement).find('th').text() : '';
        const dtText = $(dtElement).find('td').find("a > span:nth-child(2)").text() ? $(dtElement).find('td').find("a > span:nth-child(2)").text() : '';

        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`눈문 tmpText: ${tmpText}`)
          item.biography.push({
            targetDate : dtYearText,
            type: "눈문",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      }); */

      $('#line3').find("div.tab_ui").find("div.tab_cont > ul > li:nth-child(2)").find('table').find("tbody > tr").each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('th').text() ? $(dtElement).find('th').text() : '';
        const dtText = $(dtElement).find('td > span').text() ? $(dtElement).find('td > span').text() : '';

        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`저서 tmpText: ${tmpText}`)
          item.biography.push({
            targetDate : dtYearText,
            type: "저서",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#line3').find("p.info_tit:contains('수상')").next('div.doc_info01_table').find('table').find("tbody > tr").each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('th').text() ? $(dtElement).find('th').text() : '';
        const dtText = $(dtElement).find('td > span').text() ? $(dtElement).find('td > span').text() : '';

        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`수상 tmpText: ${tmpText}`)
          item.biography.push({
            targetDate : dtYearText,
            type: "수상",
            text: tmpText,
            url: null,
            issuer:null
          });
        }
      });

      $('#line4').find("div.tab_ui").find("div.tab_cont > ul > li:first-child").find('table').find("tbody > tr").each((index, dtElement) => {
        
        const dtYearText = $(dtElement).find('th').text() ? $(dtElement).find('th').text() : '';
        const dtText = $(dtElement).find('td > a').text() ? $(dtElement).find('td > a').text() : '';
        const dtTextHref = $(dtElement).find('td > a').attr('href') ? $(dtElement).find('td > a').attr('href') : '';

        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          console.log(`언론 tmpText: ${tmpText}`)
          item.biography.push({
            targetDate : dtYearText,
            type: "언론",
            text: tmpText,
            url: dtTextHref,
            issuer:null
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

  crwalingtreatise: async (url) => {
    let result = null, error = null, DBCode = null
    if (!url) {
      return { error: true, data: null };
    }
    try {
      const browser = await puppeteer.launch();
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

      await page.keyboard.press('ArrowDown')
      //await page.waitForSelector("._careerIemContainer");
      await CS.wait(1000);
      await page.keyboard.press('ArrowUp');

      // 페이지에 있는 모든 '더보기' 버튼을 찾아 클릭합니다.
      console.log("페이지에 있는 모든 '더보기' 버튼을 찾아서 클릭합니다.");
      await page.evaluate(async () => {
          const allMoreButtons = Array.from(document.querySelectorAll("a")).filter(link => link.textContent.includes('더보기'));
          console.log(`총 ${allMoreButtons.length}개의 '더보기' 버튼을 찾았습니다.`);
          for (const button of allMoreButtons) {
              try {
                  button.click();
              } catch (e) {
                  console.log('사라졌거나 클릭할 수 없는 \'더보기\' 버튼입니다.');
              }
          }
      });
      // evaluate 내에서 발생한 클릭으로 인한 비동기 작업(네트워크 로드 등)이 완료되기를 기다리기 위해 추가 대기 시간을 줍니다.
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log("모든 '더보기' 버튼 클릭 시도를 완료했습니다.");
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);  
      
      let item = {
        biography: [],
      };

      $('#line3').find("div.tab_ui").find("div.tab_cont > ul > li:first-child").find('table').find("tbody > tr").each((index, dtElement) => {
        
        const dtText = $(dtElement).find('td').find("a > span:nth-child(2)").text() ? $(dtElement).find('td').find("a > span:nth-child(2)").text() : '';
        console.log(`논문: ${dtText}`);
        if ( !functions.isEmpty(dtText) ) {
          const tmpText = dtText.trim().replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');
          const etc = {
            type: '논문',
            title: (tmpText) ? tmpText : '',
            url: null,
          };
          item.biography.push(etc);
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

    console.log(`setCrawlingDoctorLink: ${rid.length} ${hid} ${deptName} ${doctorName} ${url}`);
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



