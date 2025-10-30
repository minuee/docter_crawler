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
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;

let browser = null;


module.exports = {

  crwalingProcess01: async () => {
    let error = null;
    const url01 = `https://seoul.hyumc.com/seoul/mediteam/mditeam.do`;
    console.log(`[START] crwalingProcess01 for url: ${url01}`);

    let browser = null;
    let page = null; // Declare page outside the try block
    let optionsArray = [];
    try {
        console.log('Launching puppeteer...');
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        console.log('Puppeteer launched.');

        page = await browser.newPage(); // Assign to the outer-scoped page
        
        // Set a common user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

        // Auto-dismiss dialogs
        page.on('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.dismiss();
        });

        console.log('Navigating to page...');
        await page.goto(url01, { waitUntil: 'domcontentloaded' });
        console.log('Page navigated.');

        console.log('Waiting for selector...');
        await page.waitForSelector('.categoryList_wrap', { timeout: 30000 });
        console.log('Selector found.');

        console.log('Evaluating page...');
        optionsArray = await page.evaluate(() => {
            const data = [];
            const departmentElements = document.querySelectorAll('.categoryList_wrap section.category .box ul li');
            departmentElements.forEach(elem => {
                const anchor = elem.querySelector('a');
                if (anchor) {
                    const onclickValue = anchor.getAttribute('onclick');
                    if (onclickValue) {
                        const pattern = /hospMediofCentClick\('([0-9]+)','(.*)'\)/;
                        const matches = onclickValue.match(pattern);
                        if (matches && matches.length >= 3) {
                            const dept_id = matches[1];
                            const dept_name = matches[2];
                            const link = `https://seoul.hyumc.com/seoul/mediteam/mditeam.do?action=detailList&searchCondition1=seqMediteam&searchCommonSeq=${dept_id}&searchHospCd=&searchKeyword=${dept_name}`;
                            data.push({ title: dept_name, link });
                        }
                    }
                }
            });
            return data;
        });
        console.log(`Evaluation complete. Found ${optionsArray.length} items.`);

    } catch (e) {
        console.error('An error occurred during crawling:', e);
        if (page) {
            try {
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const screenshotPath = `error_screenshot_${timestamp}.png`;
                const htmlPath = `error_page_${timestamp}.html`;
                
                console.log(`Saving screenshot to ${screenshotPath}`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                
                console.log(`Saving HTML content to ${htmlPath}`);
                const htmlContent = await page.content();
                fs.writeFileSync(htmlPath, htmlContent);
            } catch (debugError) {
                console.error('Error occurred during debug file saving:', debugError);
            }
        }
        error = e;
    } finally {
        if (browser) {
            console.log('Closing browser.');
            await browser.close();
        }
    }

    console.log('[END] crwalingProcess01');
    return { error: error, data: optionsArray };
  },


  crwalingProcess02: async (url) => {
    const MAX_RETRIES = 2;
    let lastError = null;

    if (!url) {
        return { error: 'URL is required', data: [] };
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[START] crwalingProcess02 for url: ${url} (Attempt ${attempt}/${MAX_RETRIES})`);
        let browser = null;
        let page = null;

        try {
            browser = await puppeteer.launch({ headless : false,args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            page = await browser.newPage();
            
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            await page.waitForSelector('.doctorList_wrap', { 
              visible: true,
              timeout: 30000 
            });

            await page.waitForFunction(() => {
              const el = document.querySelector('.doctorList_wrap');
              return el && el.children.length > 0; // Wait for the list to be populated
            }, { timeout: 30000 });

            const doctorArray = await page.evaluate((pageUrl) => {
                const doctors = [];
                let deptName = '';
                
                const deptNameElement = document.querySelector('.text_searchResult > span');
                if (deptNameElement) {
                    const match = deptNameElement.textContent.trim().match(/'(.*)'로 검색된 결과입니다./);
                    if (match) deptName = match[1];
                }

                document.querySelectorAll('.doctorList_wrap > section.box').forEach(item => {
                    const nameElement = item.querySelector('.profile > .text > h4 > a');
                    const imgElement = item.querySelector('.profile > a .pic_img img');

                    if (!nameElement) return;

                    const doctorName = nameElement.textContent.trim();
                    const onclickValue = nameElement.getAttribute('onclick');
                    
                    let profileUrl = null;
                    if (imgElement) {
                        const src = imgElement.getAttribute('src');
                        if (src) profileUrl = new URL(src, pageUrl).href;
                    }

                    if (doctorName && onclickValue) {
                        const pattern = /viewDoctor\('([0-9A-Za-z]+)', '([0-9A-Za-z]+)'\)/;
                        const matches = onclickValue.match(pattern);
                        if (matches && matches.length >= 3) {
                            const dr_id = matches[1];
                            const dept_id = matches[2];
                            const link = `https://seoul.hyumc.com/seoul/mediteam/mditeam.do?action=detail&returnAction=list&currentPageNo=1&recordCountPerPage=8&searchCondition1=seqMediteam&searchCommonSeq=1&searchCommonCd1=${dr_id}&searchCommonCd2=${dept_id}&searchCondition2=all&searchKeyword=${deptName}&searchHospCd=&empyId=&bbsId=bestPartner&nttSeq=`;
                            
                            doctors.push({
                                deptName,
                                doctorName,
                                link,
                                profileUrl
                            });
                        }
                    }
                });
                return doctors;
            }, url);

            console.log(`[END] crwalingProcess02. Found ${doctorArray.length} doctors on attempt ${attempt}.`);
            if (browser) await browser.close();
            return { error: null, data: doctorArray }; // Success

        } catch (e) {
            lastError = e;
            console.error(`Attempt ${attempt} failed: ${e.message}`);

            if (page) {
                try {
                    const timestamp = new Date().toISOString().replace(/:/g, '-');
                    const urlIdentifier = url.replace(/[^a-zA-Z0-9]/g, '_').slice(-50);
                    const screenshotPath = `error_p02_screenshot_${urlIdentifier}_${timestamp}_attempt${attempt}.png`;
                    console.log(`Saving screenshot to ${screenshotPath}`);
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                } catch (debugError) {
                    console.error('Error during screenshot:', debugError);
                }
            }

            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 3s before retrying
            }
        } finally {
            if (browser && browser.isConnected()) {
                await browser.close();
            }
        }
    }

    // If all retries fail, return the last error
    console.error(`All ${MAX_RETRIES} attempts failed for url: ${url}.`);
    return { error: lastError, data: [] };
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


  crwalingProcess03: async (url) => {
    const MAX_RETRIES = 2;
    let lastError = null;

    if (!url) {
        console.error('[ERROR] URL is required for Process03.');
        return { error: 'URL is required', data: null };
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[START] Process03 for url: ${url} (Attempt ${attempt}/${MAX_RETRIES})`);
        let browser = null;
        let page = null;
        let result = null;

        try {
            browser = await puppeteer.launch({ headless : false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            page = await browser.newPage();

            // Handle alerts automatically
            page.on('dialog', async dialog => {
                console.log(`Automatically dismissing dialog: ${dialog.message()}`);
                await dialog.dismiss();
            });

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

            // Set Referer to appear more human-like
            const urlParams = new URLSearchParams(new URL(url).search);
            const dept_id = urlParams.get('searchCommonCd2');
            if (dept_id) {
                const refererUrl = `https://seoul.hyumc.com/seoul/mediteam/mditeam.do?action=detailList&searchCondition1=seqMediteam&searchCommonSeq=${dept_id}`;
                await page.setExtraHTTPHeaders({
                    'Referer': refererUrl
                });
                console.log(`Set Referer to: ${refererUrl}`);
            }

            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('.medicalTeam3', { timeout: 30000 });

            const extractedData = await page.evaluate(() => {
                console.log('[EVAL] Starting extraction inside browser.');
                const basic = {};
                const detail = [];
                const treatise = [];

                try {
                    const doctorNameEl = document.querySelector('.medicalTeam3 .details div h1:first-child');
                    const deptNameEl = document.querySelector('.medicalTeam3 .details div h1:nth-of-type(2)');
                    const specialtyEl = document.querySelector('.medicalTeam3 .details p:nth-of-type(1)');
                    const imageEl = document.querySelector("#contents .doctorFixed .top_banner_img img");

                    basic.doctorName = doctorNameEl ? doctorNameEl.textContent.trim() : null;

                    if (deptNameEl) {
                        basic.deptName = deptNameEl.textContent.replace('교수', '').trim();
                    } else {
                        basic.deptName = null;
                    }

                    basic.specialty = specialtyEl ? specialtyEl.textContent.trim() : null;

                    if (imageEl) {
                        const src = imageEl.getAttribute('src');
                        if (src) {
                            basic.profileImgUrl = new URL(src, window.location.href).href;
                        }
                    }
                    document.querySelectorAll('section.doctorHistory .indi_resume .doctor_roadmap .scroll > section').forEach((section, index) => {
                        const typeEl = section.querySelector('h3');
                        const contentEl = section.querySelector('p');

                        if (typeEl && contentEl) {
                            let type = typeEl.textContent.trim();
                            const histories = contentEl.innerText.trim();

                            if (histories) {
                                const historyList = histories.split('\n').filter(line => line.trim() !== '');
                                historyList.forEach(historyText => {
                                    let cleanHistory = historyText.replace(/-\s/g, '').trim();
                                    if (type === '수상' && cleanHistory === '논문') {
                                        type = '논문';
                                        return;
                                    }
                                    
                                    if (type === '논문') {
                                        treatise.push({ type, targetDate: null, title: cleanHistory, url:'' });
                                    } else {
                                        detail.push({ type, targetDate: null, text: cleanHistory, url:'' });
                                    }
                                });
                            }
                        }
                    });
                } catch (e) {
                    console.error('[EVAL] An error occurred inside evaluate:', e.message);
                    return { error: e.message };
                }

                return { basic, detail, treatise };
            });

            if (extractedData.error) {
                throw new Error(`Error from page.evaluate: ${extractedData.error}`);
            }

            result = extractedData;
            console.log(`[END] Process03. Found basic info for ${result?.basic?.doctorName}.`);
            return { error: null, data: result }; // Success

        } catch (e) {
            lastError = e;
            console.error(`Attempt ${attempt} failed: ${e.message}`);
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s before retrying
            }
        } finally {
            if (browser) {
                console.log('[DEBUG] Force closing browser.');
                if (browser.process() != null) {
                    browser.process().kill('SIGKILL');
                }
            }
        }
    }

    // If all retries fail, return the last error
    console.error(`All ${MAX_RETRIES} attempts failed for url: ${url}.`);
    return { error: lastError, data: null };
  },

  crwalingProcess03_new: async (browser, url) => {
    if (!url) {
        return { error: 'URL is required', data: null };
    }

    let page = null;
    try {
        page = await browser.newPage();

        page.on('dialog', async dialog => {
            console.log(`Automatically dismissing dialog: ${dialog.message()}`);
            await dialog.dismiss();
        });

        page.on('console', msg => console.log(`[BROWSER LOG] ${msg.text()}`));
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

        const urlParams = new URLSearchParams(new URL(url).search);
        const dept_id = urlParams.get('searchCommonCd2');
        if (dept_id) {
            const refererUrl = `https://seoul.hyumc.com/seoul/mediteam/mditeam.do?action=detailList&searchCondition1=seqMediteam&searchCommonSeq=${dept_id}`;
            await page.setExtraHTTPHeaders({ 'Referer': refererUrl });
        }

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.medicalTeam3', { timeout: 30000 });

        const extractedData = await page.evaluate(() => {
            const basic = {};
            const detail = [];
            const treatise = [];
            try {
                const doctorNameEl = document.querySelector('.medicalTeam3 .details div h1:first-child');
                const deptNameEl = document.querySelector('.medicalTeam3 .details div h1:nth-of-type(2)');
                const specialtyEl = document.querySelector('.medicalTeam3 .details p:nth-of-type(1)');
                const imageEl = document.querySelector("#contents .doctorFixed .top_banner_img img");
                basic.doctorName = doctorNameEl ? doctorNameEl.textContent.trim() : null;
                if (deptNameEl) {
                    basic.deptName = deptNameEl.textContent.replace('교수', '').trim();
                } else {
                    basic.deptName = null;
                }
                basic.specialty = specialtyEl ? specialtyEl.textContent.trim() : null;
                if (imageEl) {
                    const src = imageEl.getAttribute('src');
                    if (src) {
                        basic.profileImgUrl = new URL(src, window.location.href).href;
                    }
                }
                document.querySelectorAll('section.doctorHistory .indi_resume .doctor_roadmap .scroll > section').forEach((section, index) => {
                    const typeEl = section.querySelector('h3');
                    const contentEl = section.querySelector('p');
                    if (typeEl && contentEl) {
                        let type = typeEl.textContent.trim();
                        const histories = contentEl.innerText.trim();
                        if (histories) {
                            const historyList = histories.split('\n').filter(line => line.trim() !== '');
                            historyList.forEach(historyText => {
                                let cleanHistory = historyText.replace(/-\s/g, '').trim();
                                if (type === '수상' && cleanHistory === '논문') {
                                    type = '논문';
                                    return;
                                }
                                if (type === '논문') {
                                    treatise.push({ type, targetDate: null, title: cleanHistory, url:'' });
                                } else {
                                    detail.push({ type, targetDate: null, text: cleanHistory, url:'' });
                                }
                            });
                        }
                    }
                });
            } catch (e) {
                return { error: e.message };
            }
            return { basic, detail, treatise };
        });

        if (extractedData.error) {
            throw new Error(`Error from page.evaluate: ${extractedData.error}`);
        }

        return { error: null, data: extractedData };

    } catch (e) {
        console.error(`crwalingProcess03_new failed for url: ${url}. Error: ${e.message}`);
        return { error: e, data: null };
    } finally {
        if (page) {
            await page.close();
        }
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

    console.log(`dddd`,rid, hid, deptName, doctorName, url,profile_url,p_hName)
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



