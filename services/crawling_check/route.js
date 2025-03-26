
const config = require(`${global.appRoot}/server/config/configuration`);
const express = require('express');
const asyncify = require('express-asyncify');
const TS = require(`${global.appRoot}/server/middleware/message.handler`);
const _ = require('lodash');
const functions = require(`${global.appRoot}/server/util/function`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const mybatisMapper = require("mybatis-mapper");
const router = asyncify(express.Router());
module.exports = router;

const TMP_PASSWORD = '1234';

router.post('/check_doctor_name', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_name",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_name:
 *    post:
 *      summary: "의사이름 체크"
 *      description: "2자이상이면서 교수란 명칭이 포함되어 있는 경우의 수만 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *        - name: "passwd"
 *          in: "body"
 *          description: "input passwd"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              passwd:
 *                type: string
 *                description: "input passwd"
 * 
 *      responses:
 *        "200":
 *          description: 의사이름 체크
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


router.post('/check_doctor_siteurl', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_siteurl",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_siteurl:
 *    post:
 *      summary: "의사개별소개사이트 체크"
 *      description: "결과가 있으면 안됨 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *        - name: "passwd"
 *          in: "body"
 *          description: "input passwd"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              passwd:
 *                type: string
 *                description: "input passwd"
 * 
 *      responses:
 *        "200":
 *          description: 의사개별소개사이트 체크
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



router.post('/check_doctor_siteurl_http', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_siteurl_http",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_siteurl_http:
 *    post:
 *      summary: "의사개별소개사이트 URL 정상여부체크"
 *      description: "의사 개별소개페이지가 http 또는 https로 제대로 들어가지 않은거 , 결과는 0이 나와야 함"
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *        - name: "passwd"
 *          in: "body"
 *          description: "input passwd"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              passwd:
 *                type: string
 *                description: "input passwd"
 * 
 *      responses:
 *        "200":
 *          description: 의사개별소개사이트 URL 정상여부체크
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



router.post('/check_doctor_siteurl_ishospital', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_siteurl_ishospital",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_siteurl_ishospital:
 *    post:
 *      summary: "의사개별소개사이트 URL 정상여부체크"
 *      description: "의사 개별소개페이지가 병원 기본주소만 있는거 , 결과는 0이 나와야 함"
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *        - name: "passwd"
 *          in: "body"
 *          description: "input passwd"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              passwd:
 *                type: string
 *                description: "input passwd"
 * 
 *      responses:
 *        "200":
 *          description: 의사개별소개사이트 URL 정상여부체크
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



router.post('/check_doctor_specialties_isnull', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_specialties_isnull",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_specialties_isnull:
 *    post:
 *      summary: "의사개별 진료분야 체크"
 *      description: "병원별 의사의 진료분야값이 들어간 비율 조사 비율이 높을수록 문제임"
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *        - name: "passwd"
 *          in: "body"
 *          description: "input passwd"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              passwd:
 *                type: string
 *                description: "input passwd"
 * 
 *      responses:
 *        "200":
 *          description: 의사개별 진료분야 체크
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



router.post('/check_doctor_profileurl_http', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_profileurl_http",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_profileurl_http:
 *    post:
 *      summary: "의사개별 프로필사진 URL 정상여부체크"
 *      description: "의사 프로필사진 URL이 http 또는 https로 제대로 들어가지 않은거 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *        - name: "passwd"
 *          in: "body"
 *          description: "input passwd"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              passwd:
 *                type: string
 *                description: "input passwd"
 * 
 *      responses:
 *        "200":
 *          description: 의사개별 프로필사진 URL 정상여부체크
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



router.post('/check_doctor_profileurl_ishospital', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_profileurl_ishospital",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_profileurl_ishospital:
 *    post:
 *      summary: "의사개별 프로필사진 URL 정상여부체크"
 *      description: "의사 프로필주소가 병원 기본주소만 있는거 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *        - name: "passwd"
 *          in: "body"
 *          description: "input passwd"
 *          required: true
 *          type: "object"
 *          schema:
 *            type: object
 *            properties:
 *              passwd:
 *                type: string
 *                description: "input passwd"
 * 
 *      responses:
 *        "200":
 *          description: 의사개별 프로필사진 URL 정상여부체크
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


router.post('/check_doctor_carrer_isnull_ratio', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_career_isnull_ratio",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_carrer_isnull_ratio:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 경력정보의 비율"
 *      description: "의사의  상세정보중 경력 항목의 없는 비율"
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
 *      responses:
 *        "200":
 *          description: "병월별 의사 상세정보 체크"
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



router.post('/check_doctor_career_isnull', async function(req, res) {   
    console.log(`dddddddd : ${JSON.stringify(req.body)}`)
    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
  
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_career_isnull",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_career_isnull:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 경력정보가 없는 비율"
 *      description: "의사의  상세정보중 경력항목의 없는 의사별/병원별 조회"
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
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



router.post('/check_doctor_school_isnull_ratio', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_school_isnull_ratio",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_school_isnull_ratio:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 학력 정보가 없는 비율"
 *      description: "의사의  상세정보중 학력 항목의 없는 비율"
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
 *      responses:
 *        "200":
 *          description: "병월별 의사 상세정보 체크"
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



router.post('/check_doctor_school_isnull', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_school_isnull",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_school_isnull:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 학력정보가 없는 비율"
 *      description: "의사의  상세정보중 학력항목의 없는 의사별/병원별 조회"
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
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



router.post('/check_doctor_treatise_isnull', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_treatise_isnull",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_treatise_isnull:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 눈문이 없는 비율"
 *      description: "의사중 눈문이 없는 비율 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
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


router.post('/check_doctor_treatise_ishangul', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
        }; 
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_doctor_treatise_ishangul",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_treatise_ishangul:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 눈문타이틀 한글여부"
 *      description: "의사 전체눈문중 한글이 포함된  비율 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
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



router.post('/check_doctor_treatise_ispubmed', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        };
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_treatise_pubmed_id_ratio",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_treatise_ispubmed:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 눈문중 pubmed수집기준 "
 *      description: "의사 전체눈문중 pubmed 정보가 적용된 비율 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
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



router.post('/check_doctor_treatise_paper_per', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        };
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_treatise_pubmed_paper_ratio",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_treatise_paper_per:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 눈문중 pubmed수집기준 "
 *      description: "병원별 눈문중 pubmed 정보가 적용된 비율 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
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




router.post('/check_doctor_treatise_pubmed_journal_check', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        };
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_treatise_pubmed_journal_ratio",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_treatise_pubmed_journal_check:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 저널명 비율"
 *      description: "의사 전체눈문중 pubmed 정보중 저널명이 수집된 비율 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
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


router.post('/check_doctor_treatise_pubmed_title_check', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        };
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_treatise_pubmed_title_ratio",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_treatise_pubmed_title_check:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - 타이틀 비율 "
 *      description: "의사 전체눈문중 pubmed 정보중 타이틀명이 수집된 비율 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
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


router.post('/check_doctor_treatise_pubmed_dio_check', async function(req, res) {   

    const PASSWORD_KEY = TMP_PASSWORD;
    const ret = await functions.checkLocalPassWord(PASSWORD_KEY, req, res);
    if ( ret.success === false ) {
        return res.send(ret);
    }
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_check/controler.xml`]);
    
    try {

        const param = {
            hid : functions.isEmpty(req.body.hid) ? null : req.body.hid
        };
        const format = { language: "sql", indent: "  " };
        const query = mybatisMapper.getStatement(
            "controler",
            "select_check_treatise_pubmed_dio_ratio",
            param,
            format
        );
        //console.log(`query : ${query}`)
        const { DBError = null, RS = null } = await daoMysql.spCall(query);
        //console.log(`RS : ${RS}`)
        const ret = await  functions.myBatisResult(DBError,RS)
        return res.send(ret)
    }catch(e){
        console.error(`error : ${e}`)
        return res.json(TS.fail("SP4 DB fail."));
    }
    
});

/**
 * @swagger
 *  /v1/c/crawling_check/check_doctor_treatise_pubmed_dio_check:
 *    post:
 *      summary: "병월별 의사 상세정보 체크 - dio비율"
 *      description: "의사 전체눈문중 pubmed 정보중 dio가 수집된 비율 "
 *      tags: [데이터 검증]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "passwd는 필수, hid는 병원별 조회시 옵션"
 *         schema:
 *           type: object
 *           required:
 *             - passwd
 *           properties:
 *             passwd:
 *               type: string
 *             hid:
 *               type: string
 *               default : null
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