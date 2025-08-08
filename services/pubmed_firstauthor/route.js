
const crawlingCtrl = require(`${global.appRoot}/services/pubmed_firstauthor/controller`);
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

router.get('/healthcheck', async function(req, res) {    
  const result = true;
  if ( result ) { 
    res.send({
      'code': 200,
      'message': '제1저자 업데이트 접속테스트',
      'desc': 'success',
      'data' : null 
    });
  }else{
    res.send({
      'code': 200,
      'message': '제1저자 업데이트 접속테스트',
      'desc': 'failed',
      'data' : result
    });
  }
});

/**
 * @swagger
 *  /v1/c/pubmed_firstauthor/healthcheck:
 *    get:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [논문 데이터 크롤링]
 *      responses:
 *        "200":
 *          description: 접속 테스트
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



router.get('/test', async (req, res, next) => {
  
  let totalCount = 0
  let processCount = 0
  const data = [];

  try{
    const P1 = await crawlingCtrl.updateTest();
  }catch(e){
    console.error(`error 1111: ${e}`)
    return res.json(TS.fail("논문 수집 DB fail."));
  }
});


/**
 * @swagger
 *  /v1/c/pubmed_firstauthor/test:
 *    get:
 *      summary: "제1저자 업데이트 작업"
 *      description: "의사이름과 1stAuthors 매핑 작업 "
 *      tags: [논문 데이터 크롤링]
 *      produces:
 *      responses:
 *        "200":
 *          description: 의사이름과 1stAuthors 매핑 작업 
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



module.exports = router;