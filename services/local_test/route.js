'use strict';
let express = require('express');
const path = require('path')

let route = express.Router();

/**
 * @swagger
 * paths:
 *  /v1/c/localtest/test:
 *    get:
 *      summary: "접속 테스트"
 *      description: "서버에 접속이 됬는데 "
 *      tags: [LocalTest]
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

route.get('/test', async function(req, res) {    
    const result = true;
    if ( result ) { 
        res.send({
            'code': 200,
            'message': '접속테스트',
            'desc': 'success',
            'data' : null 
        });
    }else{
        res.send({
            'code': 200,
            'message': '접속테스트',
            'desc': 'failed',
            'data' : result
        });
    }
});

module.exports = route;