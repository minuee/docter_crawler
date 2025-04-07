const config = require(`${global.appRoot}/server/config/configuration`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const https = require('https');

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const path = require('path');
const _ = require('lodash');

module.exports = {

  /* 
  * *********************************************************************************************
  * timeStamp
  * *********************************************************************************************
  * 
  * *********************************************************************************************/
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


  
  // pubmed 주소는 있지만 해당 주소가 논문의 본문을 가르키지 않고 리스트로 떨어질때 확인용
  pubmedCheck1: async (pUrl) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let pmid = null, types = null
    let Response = { status: null, data: null }
    const url = `${pUrl}`;
    console.log(`pubmedCheck1 > ${pUrl}`)
    try {
      Response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        }
      })
    } catch (error) {
      // Error = error
      console.log(`error on ${url} API return: ${error}`);
    } finally {
      try {
        if(Response.data){
          let $ = null
          let heading = null
          let matchingCitations = null
          let pmidElement = null

          $ = cheerio.load(Response.data)

          heading = $('h1.heading-title').first().text().trim()
          matchingCitations = $('.matching-citations').first().text().trim()

          if (heading) {
            // 논문인경우
            pmidElement = $('.identifier.pubmed .current-id')
            pmid = pmidElement.text().trim()
            pmid = pmid.substring(0, 8)

            types = 1
          }
          if(matchingCitations){
            // 리스트에서 매칭이 된경우 pmid 찾아서 줄것
            // pmid = $('a.docsum-title').first().attr('href').replace(/\//g, '');
            pmid = $('span.docsum-pmid').first().text();
            pmid = pmid.substring(0, 8)
            types = 2
          }
        }
      } catch (error) {
        error = error
        types = 3
      }
    }
    return { error: error, data: {pmid:pmid, types:types}};
  },

  

  puppeteerLoad2: async (pUrl) => {
    let result = null, error = null, DBCode = null
    let DBData1 = null
    let Response = { status: null, data: null }
    const url = `${pUrl}`;
    console.log(`puppeteerLoad2 > ${pUrl}`)
    // Launch a headless browser
    //const pathToExtension1 = path.join(__dirname, './extensions/npblmhpjbopmmaadpmheopjelggjnogh/6.1_0');
    //const pathToExtension2 = path.join(__dirname, './extensions/aiblhpjnljidffmannejhglkiolpecpi/0.20_0');
    console.log(`before 77777`);
    const ops = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ] 
    };
    const browser = await puppeteer.launch(ops);
    try{
      const page = await browser.newPage();
    // User-Agent 설정 (실제 브라우저처럼 보이도록)
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      );

      // WebGL 등 브라우저 속성을 실제처럼 보이게 하기
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });
      await page.setViewport({ width: 1080, height: 1024 });
      await page.goto(url,{ timeout: 3000, waitUntil: "domcontentloaded" });
      await CS.wait(3000)
      console.log(`before start`);

      let content1 = null
      let content2 = null
      try {
        content1 = await page.$eval('#div_lit_results', el => el.innerHTML);
      } catch (error) {
        content1 = null;
        console.log(`try 1 : ${error}`);
      }
      try {
        content2 = await page.$eval('.if', el => el.innerHTML);
      } catch (error) {
        content2 = null;
        console.log(`try 2 : ${error}`);
      }

      const content0 = await page.content(); // 웹 페이지의 HTML 내용을 가져옴
      
      let $ = null
      let item = {}
      let authors = [];
      try {
        $ = cheerio.load(content0);
        title = $('h1.heading-title').first().text().trim();
        if (title) {
          item.title = title
        }
        // 저널명 추출
        const journalName = $('#full-view-journal-trigger').text().trim().split('(')[0].trim();
        item.journalName = journalName;
        // 쿼터(quartile) 추출
        const quartile = $('.quartile b').first().text().trim();
        item.quartile = quartile;

        const publication_type = $('#heading div.article-citation div.publication-type').first().text().trim().replace(/\t/g, '').replace(/\n/g, '');
        if(publication_type){
          item.publication_type = publication_type
        }else{
          item.publication_type = null
        }
        const pmidElement = $('.identifier.pubmed .current-id');
        const pmid = pmidElement.first().text().trim();
        item.PMID = pmid;
        const dois = $('a.id-link').text().trim();
        const doiRegex = /\b10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+\b/g;
        const extractedDois = dois.match(doiRegex);
        const uniqueDois = [...new Set(extractedDois)]; // 중복 제거
        const firstDoi = uniqueDois[0]; // 첫 번째 값 가져오기
        item.DOI = firstDoi? firstDoi : null

        const keywordsElement = $('#eng-abstract + p');
        const keywords = keywordsElement.text().trim().replace(/\t/g, '').replace(/\n/g, '').replace('Keywords:                    ', '');
        item.keywords = keywords
        // 초록 추출
        const abstract = $('#abstract .abstract-content.selected').text().trim().replace(/\t/g, '').replace(/\n/g, '').replace('                    ', '');
        item.abstract = abstract ? abstract : null;
      
        $('.authors-list-item').each((index, element) => {
          const authorName = $(element).find('.full-name').text().trim();
          authors.push(authorName);
        });
        const set = new Set(authors);
        const uniqueAuthors = [...set];
        item.authors = uniqueAuthors.join(', ');
        item.firstAuthors = null
        try {
          const equalContribAuthors = new Set();
          $('.authors-list-item').each((index, element) => {
              const hasEqualContrib = $(element).find('a.equal-contrib[title="Contributed equally"]').length > 0;
              if (hasEqualContrib) {
                  const authorName = $(element).find('a.full-name').text().trim();
                  if (authorName) {
                      equalContribAuthors.add(authorName);
                  } else {
                      console.warn(`Warning: Author name not found for element at index ${index}`);
                  }
              }
          });
          console.log(Array.from(equalContribAuthors).join(', '));
          item.firstAuthors = Array.from(equalContribAuthors).join(', ')

        } catch (error) {
            console.error(`Error processing HTML: ${error.message}`);
            console.log(`try 3: ${error}`);
        }
      } catch (error) {
        $ = null;
        console.log(`try 4: ${error}`);
      }
      result = {
        content1: content1,
        content2: content2,
        items: item
      }
      await browser.close();
      return { error: error, data: result };
    }catch(e){
      console.error('eeee',e)
      await browser.close();
      return { error: error, data: result };
    }
  },


  getCitesCount: async (pUrl) => {
    let url = null
    let citesCount = 0
    let error = null

    if (pUrl) {
      const match = pUrl.match(/\/(\d+)\/?$/);
      if (match) {
        url = `https://pubmed.ncbi.nlm.nih.gov/?linkname=pubmed_pubmed_citedin&from_uid=${match[1]}`;
      }
    }
    if (url) {
      try {
        Response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
          }
        })
      } catch (error) {
        // Error = error
        console.log(`error on ${url} API return: ${error}`);
      }
      try {
        const $ = cheerio.load(Response.data);
        // 쓰레기 태그 날림
        // $('span').empty(); // 못날림 (이름과 진료과가 붙어있음)
        citesCount = $('div.results-amount h3 span.value').first().text().trim();
      } catch (error) {
        citesCount = 0
        return { error: error, data: citesCount };
      }
      return { error: error, data: citesCount };
    } else {
      return { error: error, data: citesCount };
    }
  },

  
  set_pubmed: async (p_paper_id, p_publication_type, p_title, p_journalName, p_quartile, p_pmid, p_doi, p_1stAuthors, p_authors, p_abstract, p_keywords, p_impactFactor, p_totalCitations, p_doctorName) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL update_doctor_paper(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(
      query, [p_paper_id, p_title, p_publication_type, p_journalName, p_quartile, p_pmid, p_doi, p_1stAuthors,p_authors, p_abstract, p_keywords, p_impactFactor, p_totalCitations]);
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



