
const crawlingCtrl = require(`${global.appRoot}/services/crawling_pubmed/controller`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const TS = require(`${global.appRoot}/server/middleware/message.handler`);
const express = require('express');
const asyncify = require('express-asyncify');
const crypto = require('crypto');
const _ = require('lodash');
const router = asyncify(express.Router());
const functions = require(`${global.appRoot}/server/util/function`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const mybatisMapper = require("mybatis-mapper");
module.exports = router;

const TMP_PASSWORD = "1234";
const DATA_VERSION_ID = process.env.DATA_VERSION_ID ?  parseInt(process.env.DATA_VERSION_ID) : 2;
console.log("DATA_VERSION_ID", DATA_VERSION_ID)


/**
 * @swagger
 *  /v1/c/pubmed_crawling/pubmed:
 *    post:
 *      summary: "병월별 의사논문 정보 수집"
 *      description: "의사 눈문의 타이틀을 기준하여  수집 "
 *      tags: [논문 데이터 크롤링]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *             - hid
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *      responses:
 *        "200":
 *          description: 병월별 의사 상세정보 체크
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    ok:
 *                      type: boolean
 *                    users:
 *                      type: object
 *                      example:    
 *                            { "code": 1000, "message": "접속성공" }
 */


router.post('/pubmed', async (req, res, next) => {
  const PASSWORD_KEY = TMP_PASSWORD;
  const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
  if ( ret.success === false ) {
      return res.send(ret);
  }
  const hid = req.query.hid;
  let totalCount = 0
  let processCount = 0
  const data = [];

  try{
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_pubmed/sql.xml`]);

    const param = {
      version_id : DATA_VERSION_ID,
      hid : req.body.hid
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
      "sql",
      "select_doctor_treatise",
      param,
      format
    );
    //console.log(`query : ${query}`)
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    //console.log(`RS : ${RS}`)
    totalCount = _.size(RS);
    console.log(`totalCount : ${totalCount}`)
    let SP0 = null;
    const P1 = {
      data : RS
    };
    for (let i = 0; i < totalCount; i++) {

      processCount = processCount + 1;
      const paper_id = P1.data[i].paper_id;
      const doctorName = P1.data[i].doctorName;
      console.log(`P1.data[i] > ${P1.data[i].paper_id}-${P1.data[i].paper_url}`)
      // const url = "http://www.ncbi.nlm.nih.gov/pubmed/25476661";
      let url = null;
      
      let regex = /pubmed\/(\d+)/;
      let match = functions.isEmpty(P1.data[i].paper_url) ? [] : (P1.data[i].paper_url).match(regex);
      if (match && match[1]) {
        const pmid = match[1];
        // url = `https://pubmed.ncbi.nlm.nih.gov/33124087/`
        url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      }
      console.log(`step 1 > ${url}`)
      if(!url) {
        regex = /nlm.nih.gov\/(\d+)/;
        match = functions.isEmpty(P1.data[i].paper_url) ? [] : (P1.data[i].paper_url).match(regex);
        if (match && match[1]) {
          url = P1.data[i].paper_url;
        }
      }
      console.log(`step 2 > ${url}`)
      if(functions.isEmpty(url) ) {

        await CS.wait(1000)
        console.log(`wait for 1000ms`);

        if( !functions.isEmpty(P1.data[i].paper_url) ) {
          const SPX = await crawlingCtrl.pubmedCheck1(P1.data[i].paper_url);
          console.log(`SPX.data.pmid > ${SPX?.data?.pmid}`)
          if(SPX?.data?.pmid) {
            url = `https://pubmed.ncbi.nlm.nih.gov/${SPX.data.pmid}/`
            console.log('Treatise contents or found in the list: ', SPX.data.types, SPX.data.pmid, url);
          } 
        }
        
        /* 타이틀만으로 pubmed에서 눈문정보를 찾는다 */
        if(functions.isEmpty(url) ) {
          console.log(`P1.data[i].title > ${P1.data[i].title}`)
          const queryUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURI(P1.data[i].title)}`
          const SPX = await crawlingCtrl.pubmedCheck1(queryUrl)
          if(SPX.data.pmid) {
            url = `https://pubmed.ncbi.nlm.nih.gov/${SPX.data.pmid}/`
            console.log('Treatise contents or found in the list: ', SPX.data.types, SPX.data.pmid, url);
          }
        }
      }
      console.log(`step 3 > ${url}`)
      if(functions.isEmpty(url) ) {
        console.log('Treatise not found - paper_id:', paper_id);
        const param2 = {
          version_id : DATA_VERSION_ID,
          paper_id : paper_id
        }; 
        const format2 = { language: "sql", indent: "  " };
        const update_query = mybatisMapper.getStatement(
          "sql",
          "update_doctor_paper_updatedate",
          param2,
          format2
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS2 = null } = await daoMysql.spCall(update_query);
        //console.log(`RS : ${RS}`)
        
        continue;
      }

      await CS.wait(700)
      SP0 = await crawlingCtrl.puppeteerLoad2(url);
      if (SP0.data) {
        if (_.get(SP0, 'data.content1', null)) {
          const TS1 = await CS.parseHTMLToCitationInfo(SP0.data.content1)
          console.log(`Citation Stauts: ${JSON.stringify(TS1, null, 2)}`);
        }
        const content2 = _.get(SP0, 'data.content2', null)
        const items = _.get(SP0, 'data.items', null)
        let impactFactor = 0
        let citedCount = 0
        let PMID = null
        let publication_type = null
        let DOI = null
        let abstract = null
        let keywords = null
        let title = null
        let authors = null
        if (content2) {
          const content2Temp = content2.replace(/<\/?u>/g, '');
          if (!content2Temp || content2Temp.trim() === '') {
            impactFactor = 0;
          }
          const number = parseFloat(content2Temp);
          if (!isNaN(number)) {
            impactFactor = number
          } else {
            impactFactor = 0
          }
          items.impactFactor = impactFactor
          console.log(`>>> ImpactFactor: `, impactFactor)
        }
        if(items){
          PMID = items.PMID
          DOI = items.DOI
          abstract = items.abstract
          keywords = items.keywords
          title = items.title
          authors = items.authors
          firstAuthors = items.firstAuthors
          const authorList = items.authors.split(',').map(author => author.trim());
          const firstAuthorss = authorList[0];
          if (firstAuthorss) {
              if (items.firstAuthors.length === 0) {
                items.firstAuthors = firstAuthorss
              }
          } else {
              console.warn('No authors found.');
          }
        }
        await CS.wait(700)
        console.log(`wait for 1500ms`);
        const TS2 = await crawlingCtrl.getCitesCount(url)
        if(TS2.data){
          citedCount = TS2.data
          items.citedCount = citedCount
          console.log(`>>> Cited count: `, TS2.data)
        }
        // DB insert 
        console.log(`item >>>>>>>> `, items)
        if(items){
            const TX1 = await crawlingCtrl.set_pubmed(
              paper_id, 
              items.publication_type,
              title,
              items.journalName,
              items.quartile,
              items.PMID,
              items.DOI,
              items.firstAuthors,
              items.authors?.substring(0,1000),
              items.abstract?.substring(0,1000),
              items.keywords,
              impactFactor,
              citedCount=parseInt(citedCount),
              doctorName
            )
            if(TX1.data){
              console.log(`TX1.data: ${TX1.data}`)
            }
        }
      }

    } // for loop end
    console.log(`processCount : ${processCount}`)
    return res.json(TS.success(processCount));
  }catch(e){
    console.error(`error 1111: ${e}`)
    return res.json(TS.fail("논문 수집 DB fail."));
  }
});
