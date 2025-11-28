
const crawlingCtrl = require(`${global.appRoot}/services/crawling_reprocessing/controller`);
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
const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');
module.exports = router;

const TMP_PASSWORD = "1234";
const DATA_VERSION_ID = process.env.DATA_VERSION_ID ?  parseInt(process.env.DATA_VERSION_ID) : 2;
console.log("DATA_VERSION_ID", DATA_VERSION_ID)


/**
 * @swagger
 *  /v1/c/crawling_reporcessing/make-resume:
 *    post:
 *      summary: "병원데이터 후가공 - 경력분리"
 *      description: "수집된 의사 경력을 경력/학력/기타로 분리 "
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "data_version_id, hid는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - data_version_id
 *             - hid
 *           properties:
 *             data_version_id:
 *               type: string
 *             hid:
 *               type: string
 *      responses:
 *        "200":
 *          description: 병원데이터 후가공 
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


router.post('/make-resume', async (req, res, next) => {
 
  const data_version_id = req.body.data_version_id;
  const hid = req.body.hid;

  console.log(`data_version_id : ${data_version_id}, hid : ${hid}`)

  let totalCount = 0;
  let processCount = 0;
  let processNullCount = 0;
  let processFailCount =0;
  const successData = [];
  const failData = [];
  const nullData = [];
  // 유사 type 그룹
  const typeValueGroups = [
    ['학력', '학력사항'], //학력 education
    ['경력', '경력 및 연수', '연수', '교육 및 연구경력'], // 경력 career
    ['수상','수상내역', '수상', '수상경력'], // 그외 etc
    ['학술','학술활동',  '기타 학술 관련 경력'],// 그외 etc
    ['언론','TV/방송',  '언론보도', '언론기사'],// 그외 etc
    ['저서', '집필저서','저서/논문','논문/저서'],// 그외 etc
    ['학회','학회활동'],// 그외 etc
    ['논문','논문저서','논문/저서','논문'],// 그외 etc
    ['연구','연구분야'],// 그외 etc
    ['참고','참고사항'],// 그외 etc
    ['진료', '진료분야'],// 그외 etc
  ]

  // 유사 키 그룹
  const keyGroups = [
    ['type', 'title'],
    ['action','text', 'description'],
    ['url', 'url'],
    ['period','startYear',  'staYear', 'endYear', 'targetDate', 'TargetDate','date', 'startDate', 'endDate' ],
  ]
  const keyDescription = {
    "type" : "분류",  // 필수값으로 위의 typeValueGroups 이걸 참고 
    "targetDate" : "일자", // 이 key는 일괄 date로 변경
    "date" : "일자",
    "text" : "내용", //
    "title" : "내용", // 내용과 동일한 key로 일괄 text로 변경
    "url" : "사이트주소",
    "issuer"  : "발행처"

  }
  try{
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);

    const param = {
      search_rid_long : null,//'1FB50436AB3F03B126FBE3C89166EA1638A34E0CA7FA1EE0D89451A4AD25DB2A96B7C94DFD500E99FE3F793374EC418D138594572CA3B50B5712D9F91A90D9ABB4F67A5695BD5EEF417CEDA64AF3EC03',
      search_version_id : data_version_id,
      search_hid : hid
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
      "sql",
      "select_doctor_career_data",
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
      const rid_long = P1.data[i].rid_long;
      const doctorName = P1.data[i].doctorname;
      const jsondata = P1.data[i].jsondata;
      console.log(`target ${i}번째 doctorName > ${doctorName}`)

      
      if(!functions.isEmpty(jsondata) && jsondata != '[]' ) {

        // jsondata의 값을 읽어서 배열화하고 순회
        const historyList = JSON.parse(jsondata);
        let educationList = [];
        let careerList = [];
        let etcList = [];

        for (let j = 0; j < historyList.length; j++) {
          const eachCareerObject = historyList[j]
          if ( eachCareerObject?.type == undefined ) { // type 키값이 없으면 스킵처리 
            continue;
          }
          
          //여기서 json데이터를 분리작업한다  목표 경력(career), 학력(education), 기타(etc)         
          // 1. Determine the category
          const rawType = eachCareerObject.type;
          let category = 'etc'; // Default category
          if (typeValueGroups[0].includes(rawType)) {
            category = 'education';
          } else if (typeValueGroups[1].includes(rawType)) {
            category = 'career';
          }
          
          // 사용자가 요청한 로직 : type가 경력인데 text의 내용중에 졸업, 학사, 박사, 석사 이런 문구가 있으면 이건 학력으로 옮겨야 되거든
          /* if (category === 'career') {
            const educationKeywords = ['졸업', '학사', '박사', '석사'];
            const textContent = eachCareerObject.text || eachCareerObject.title || '';
            if (educationKeywords.some(keyword => textContent.includes(keyword))) {
              console.log(`career to education > ${doctorName}, textContent : ${textContent}`)
              category = 'education';
              eachCareerObject.type = '학력';
            }
          } */

          // 2. Normalize the object keys based on comments
          const normalizedObject = {};
          for (const key in eachCareerObject) {
            const value = eachCareerObject[key];
            let newKey = key; // 기본적으로 원래 키를 사용

            // keyGroups에서 일치하는 키를 찾아 첫 번째 키로 변경
            for (const group of keyGroups) {
              if (group.includes(key)) {
                newKey = group[0];
                break;
              }
            }
            normalizedObject[newKey] = value;
          }

          // 3. Standardize the 'type' value itself to the representative value
          for (const group of typeValueGroups) {
            if (group.includes(normalizedObject.type)) {
              normalizedObject.type = group[0]; // Set to the first item in the group
              break;
            }
          }
          
          // 4. Push the normalized object to the correct list
          switch (category) {
            case 'education':
              educationList.push(normalizedObject);
              break;
            case 'career':
              careerList.push(normalizedObject);
              break;
            case 'etc':
            default:
              etcList.push(normalizedObject);
              break;
          }        
        }

        let educations_str = educationList;//JSON.stringify(educationList);
        let careers_str = careerList;//JSON.stringify(careerList);
        let etcs_str = etcList;//JSON.stringify(etcList);
        const param2 = {
          educations_str,
          careers_str,
          etcs_str,
          target_rid_long : rid_long
        }; 
        const format2 = { language: "sql", indent: "  " };
        const update_query = mybatisMapper.getStatement(
          "sql",
          "update_doctor_career_updatedate",
          param2,
          format2
        );

        const { DBError: updateCareerDBError, RS: updateCareerRS } = await daoMysql.spCall(update_query);
        const updateCareerRet = await functions.myBatisResult(updateCareerDBError, updateCareerRS);
        if (updateCareerRet.success) {
          console.log(`sucess doctorName > ${doctorName}`)
          processCount++;
          successData.push({
            hid,
            data_version_id,
            doctorName,
            rid_long
          })
        } else {
          console.log(`fail doctorName > ${doctorName}`)
          processFailCount++;
          failData.push({
            hid,
            data_version_id,
            doctorName,
            rid_long
          })
        }
      }else{
        console.log(`null doctorName > ${doctorName}`)
        processNullCount++;
        nullData.push({
          hid,
          data_version_id,
          doctorName,
          rid_long
        })
      }
      await CS.wait(1000); // 1초 딜레이 시킨다 
    } // for loop end

    const outputDir = path.join(__dirname, 'completedata');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `list_${hid}.json`);
    const outputData = {
      successData,
      failData,
      nullData
    };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log(`processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`)
    return res.send({
      code: 200,
      success: true,
      message:`processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`
    });
  }catch(e){
    console.error(`error 1111: ${e}`)
    return res.json(TS.fail("논문 수집 DB fail."));
  }
});



/**
 * @swagger
 *  /v1/c/crawling_reporcessing/make-standard:
 *    post:
 *      summary: "병원데이터 후가공 - 진료과목과세부진료분야 설정(부사장님 작업영역 사용중지)"
 *      description: "수집된 의사 진료과목과세부진료분야 설정 "
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "data_version_id, hid는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - data_version_id
 *             - hid
 *           properties:
 *             data_version_id:
 *               type: string
 *             hid:
 *               type: string
 *      responses:
 *        "200":
 *          description: 병원데이터 후가공 
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


router.post('/make-standard', async (req, res, next) => {
 
  const data_version_id = req.body.data_version_id;
  const hid = req.body.hid;

  console.log(`data_version_id : ${data_version_id}, hid : ${hid}`)

  let totalCount = 0;
  let processCount = 0;
  let processNullCount = 0;
  let processFailCount =0;
  const successData = [];
  const failData = [];
  const nullData = [];
  // 유사 type 그룹
  const standard_list = {
    "가정의학과" : ["골다공증", "당뇨병", "암경험자건강관리", "지방간", "비만", "대사증후군", "두통", "피로", "고혈압", "이상지질혈증", "건강증진", "암성통증", "고지혈증", "만성질환관리"],
    "간담도췌외과" : ["췌장낭종", "담도질환", "혈관종", "간이식", "간질환", "담관암", "전이성간암", "양성간종양", "췌장질환", "간절제술", "담도암", "담석", "간암", "췌장암", "십이지장암", "담낭암", "췌담도암", "담석증", "간세포암"],
    "감염내과":["요로감염", "폐외결핵", "패혈증", "임파선염", "에이즈", "폐렴", "감염질환", "불명열", "발열질환", "면역저하자감염"],
    "갑상선내분비외과" : ["갑상선기능항진증", "부갑상선질환", "갑상선질환", "갑상선암", "부신종양", "악성흑색종", "갑상선결절", "부신질환"],
    "내과" : ["신장질환", "간이식", "대동맥질환", "간경화", "관상동맥질환", "협심증"],
    "내분비내과":["골다공증", "당뇨병", "갑상선기능항진증", "지방간", "비만", "대사증후군", "부갑상선질환", "갑상선질환", "갑상선암", "내분비질환", "이상지질혈증", "뇌하수체질환", "고지혈증", "갑상선결절", "부신질환"],
    "노년내과":["당뇨병", "비만", "내분비질환"],
    "대장항문외과":["전이성대장암", "궤양성대장염", "탈장", "직장암", "염증성장질환", "유전성대장암", "결장암", "항문질환", "대장암", "항문암", "베체트병", "대장질환", "크론병", "변비"],
    "류마티스내과":["골다공증", "류마티스질환", "쇼그렌증후군", "류마티스관절염", "관절염", "타카야수동맥염", "혈관염", "강직성척추염", "베체트병", "루푸스", "퇴행성관절염", "통풍"],
    "마취통증의학과":["오십견", "관절염", "복합부위통증증후군", "척추관협착증", "간이식", "위암", "류마티스관절염", "뇌신경마취", "고관절질환", "암성통증", "두통", "대상포진", "안면마비", "삼차신경통", "퇴행성관절염", "만성통증", "패혈증", "허리통증", "척추협착증", "디스크"],
    "방사선종양학과":["육종", "갑상선암", "위암", "흑색종", "전이성뇌종양", "부인암", "뇌종양", "피부암", "뇌전이암", "켈로이드", "해면상혈관종", "혈액암", "원발부위불명암", "담도암", "구강암", "간암", "췌장암", "비뇨기암", "림프종", "식도암", "대장암", "직장암", "소화기암", "췌담도암", "다발성골수종", "유방암", "후두암", "흉부종양", "두경부암", "폐암"],
    "비뇨의학과":["방광암", "요관암", "신경인성방광", "수신증", "전립선비대증", "배뇨장애", "전립선레이저수술", "전립선암", "부신종양", "탈장", "요로결석", "비뇨기암", "신장질환", "신우요관암", "신장암", "요로감염", "혈뇨", "고환암", "요실금", "신장이식", "불임", "비뇨기과"],
    "산부인과":["가임력보존", "질암", "다낭성난소증후군", "육종", "면역치료", "항암치료", "월경이상/월경통", "자궁내막암", "부인암", "외음부암", "난소암", "폐경", "무월경", "자궁내막증", "자궁경부암", "난임", "태아기형", "난소종양", "조산", "자궁근종", "골다공증", "고위험임신", "난소암/난소종양", "요실금", "정상임신", "불임", "임신중독증"],
    "성형외과":["피부암", "흉터", "유방암", "관절염", "미용성형", "혈관종", "두경부암", "당뇨발", "코성형", "악성흑색종", "켈로이드", "두경부재건", "유방재건및유방성형", "안면마비", "림프부종", "흑색종", "두개골조기유합증"],
    "소아내분비과":[],
    "소아비뇨의학과":[],
    "소아소화기영양과":["소아궤양성대장염", "소아혈변", "소아영양", "소아간염", "소아변비", "소아구토", "소아내분비질환", "소아헬리코박터감염", "소아내시경", "소아설사", "소아간이식", "소아복통", "소아황달", "소아거대결장", "소아크론병"],
    "소아신경외과":["소아수두증", "소아모야모야병", "소아뇌종양"],
    "소아심장외과":["소아심장외과질환", "소아선천성심장병", "소아심장이식", "소아폐이식"],
    "소아외과":["소아복강경수술", "소아변비", "소아암", "소아탈장"],
    "소아재활의학과":["소아뇌종양", "소아재활"],
    "소아정신건강의학과":["소아틱장애", "소아청소년심층상담", "소아주의력결핍과잉행동장애(ADHD)"],
    "소아정형외과":["소아팔/다리변형교정", "소아팔/다리연장"],
    "소아청소년 감염면역결핍분과":["소아감염성질환", "소아면역결핍증", "소아결핵"],
    "소아청소년 내분비유전대사분과":["소아내분비질환"],
    "소아청소년 신경분과":["소아뇌전증"],
    "소아청소년 신생아분과":["신생아", "기타신생아질환", "미숙아"],
    "소아청소년 신장분과":["소아폐동맥고혈압", "소아선천성심장병", "소아가와사끼병", "소아태아심장질환", "소아심장질환", "소아심도자치료술(비수술적치료)"],
    "소아청소년 알레르기호흡기분과":["소아식품알레르기", "소아호흡기질환", "소아면역결핍증", "소아아토피피부염", "소아천식", "소아호흡기알레르기질환", "소아알레르기비염"],
    "소화기내과":["췌장낭종", "기능성소화불량", "담도질환", "간염", "혈관종", "만성간염", "간이식", "간질환", "결장암", "담낭염", "항암치료", "베체트장염", "담관암", "위암", "베체트병", "담관염", "황달", "소장", "지방간", "양성간종양", "췌장질환", "담낭용종", "유전성대장암", "대장질환", "담도암", "담석", "궤양성대장염", "간암", "췌장암", "염증성장질환", "식도암", "대장암", "장결핵", "급성간"],
    "수부정형외과":["말초신경질환"],
    "순환기내과":["아밀로이드증", "심장판막질환", "심장혈관중재시술", "심근질환", "고혈압", "심부전", "관상동맥질환", "부정맥", "심방세동", "혈관질환", "타카야수동맥염", "협심증", "폐고혈압", "수면무호흡증", "대사증후군", "실신", "심장돌연사", "이상지질혈증", "정맥혈전증", "고지혈증", "흉통", "심근병증", "복부대동맥류", "심근경색", "대동맥질환", "심장이식"],
    "신경과":["하지불안증후군", "시신경염", "불면증", "어지럼증", "코골이", "척수염", "렘수면행동장애", "뇌염", "혈관성치매", "시신경척수염", "경동맥협착증", "경도인지장애", "수면무호흡증", "수면장애", "실신", "두통", "파킨슨병", "안면마비", "알츠하이머병", "삼차신경통", "뇌혈관협착", "신경근육질환", "다발성경화증", "근긴장이상증", "수두증", "척수질환", "뇌혈관질환", "손떨림", "모야모야병", "뇌출혈"],
    "신경외과":["뇌수막종", "복합부위통증증후군", "척추관협착증", "어지럼증", "흉추", "척추측만증", "감마나이프", "두개저종양", "후종인대골화증", "전이성뇌종양", "뇌종양", "악성뇌종양", "뇌전이암", "뇌동정맥루", "뇌하수체종양", "해면상혈관종", "암성통증", "골다공증", "경동맥협착증", "두통", "파킨슨병", "뇌성마비", "뇌동맥류", "척추외상", "척추질환", "삼차신경통", "뇌혈관협착", "척추종양", "두부외상"],
    "신장내과":["사구체신질환", "아밀로이드증", "단백뇨", "다낭성신장", "당뇨병성신장질환", "혈뇨", "신장질환", "투석", "급성신부전", "신장이식", "만성콩팥병", "고혈압", "복막투석", "당뇨병성신질환", "사구체신염"],
    "심장혈관흉부외과":["심장판막질환", "심부전", "관상동맥질환", "부정맥", "심방세동", "간질성폐질환", "종격동종양", "협심증", "경동맥협착증", "식도암", "식도질환", "위식도역류질환", "폐이식", "기흉", "심근경색", "대동맥질환", "흉부종양", "하지정맥류", "대동맥수술", "심장이식", "폐암"],
    "안과":["시신경염", "미용성형", "성형안과", "사시", "근시", "베체트병", "미숙아망막병증", "포도막질환", "백내장", "안와종양", "녹내장", "당뇨망막병증", "망막질환", "림프종", "각막이식", "황반변성", "포도막염", "망막박리", "각막질환"],
    "알레르기내과":["알레르기비염", "알레르기", "간질성폐질환", "기관지확장증", "두드러기", "만성폐쇄성폐질환", "면역치료", "수면무호흡증", "폐렴", "만성기침", "아토피피부염", "폐결절", "결핵", "천식", "약물알레르기", "비염", "폐암", "호산구증가증"],
    "외과":["담도질환", "부갑상선질환", "혈관종", "갑상선암", "간이식", "간질환", "결장암", "항문암", "비만대사수술", "담관암", "위암", "혈관질환", "비만", "췌장질환", "복막투석", "난소종양", "담도암", "변비", "담석", "갑상선결절", "탈장", "간암", "경동맥협착증", "췌장암", "궤양성대장염", "염증성장질환", "갑상선질환", "식도암", "대장암", "항문질환", "췌장양성종양", "직장암", "담낭암"],
    "위장관외과":["탈장", "비만", "비만대사수술", "위암", "소화기암"],
    "유방외과": ["유방암", "갑상선암", "내분비질환", "유방악성질환", "부신질환"],
    "이비인후과":["알레르기", "어지럼증", "갑상선암", "코성형", "두개저종양", "코골이", "비염", "비중격만곡증", "중이염", "부비동염", "코종양", "구강암", "알레르기비염", "수면무호흡증", "인공와우이식", "이명", "축농증", "안면마비", "두경부재건", "난청", "후두암", "보청기", "음성질환", "두경부암", "인두암"],
    "이식외과":["경동맥협착증", "간암", "췌장이식", "혈관질환", "복부대동맥류", "폐이식", "신장이식", "간이식", "간경화", "하지정맥류", "복막투석", "급성간부전", "심장이식"],
    "재활의학과":["오십견", "관절염", "견관절질환", "흉추", "척추측만증", "뇌종양", "골다공증", "뇌성마비", "파킨슨병", "당뇨발", "척추질환", "경추", "뇌손상", "신경근육질환", "근골격계질환", "척수질환", "만성통증", "유방암", "뇌출혈", "루게릭병", "뇌경색", "허리통증", "강직성척추염", "척추협착증", "뇌졸중", "말초신경질환", "림프부종", "디스크", "당뇨병성족부질환"],
    "정신건강의학과":["우울증", "수면무호흡증", "경도인지장애", "불면증", "렘수면행동장애", "불안장애", "수면장애", "치매", "강박증", "하지불안증후군", "기면증", "두통", "기분장애", "알츠하이머병", "코골이", "공황장애", "조울증", "조현병"],
    "정형외과":["오십견", "관절염", "육종", "척추관협착증", "흉추", "대퇴골두무혈성괴사", "척추측만증", "후종인대골화증", "관절경", "고관절질환", "골다공증", "뇌성마비", "당뇨발", "척추질환", "척추외상", "척추종양", "퇴행성관절염", "스포츠손상", "류마티스질환", "인공관절", "허리통증", "척추협착증", "강직성척추염", "말초신경질환", "경추", "디스크", "당뇨병성족부질환", "인대손상"],
    "종양내과":["방광암", "육종", "갑상선암", "결장암", "항문암", "항암치료", "위암", "흑색종", "부인암", "뇌종양", "난소암", "피부암", "다발골수종", "전립선암", "악성흑색종", "원발부위불명암", "소장암", "담도암", "간암", "췌장암", "비뇨기암", "림프종", "식도암", "대장암", "흉선종양", "신장암", "맞춤치료", "직장암", "소장암(십이지장)", "췌담도암", "십이지장암", "소화기암", "유방암"],
    "피부과":["백반증", "피부암", "알레르기", "흉터", "손발톱질환", "두드러기", "혈관질환", "혈관종", "여드름", "아토피피부염", "악성흑색종", "켈로이드", "대상포진", "루푸스", "흑색종", "베체트병", "건선"],
    "혈관외과":["경동맥협착증", "혈관질환", "복부대동맥류", "당뇨발", "대동맥질환", "하지정맥류", "정맥혈전증", "당뇨병성족부질환"],
    "혈액내과":["아밀로이드증", "빈혈", "육종", "CAR-T세포치료", "흑색종", "혈소판감소증", "뇌종양", "다발골수종", "골수형성이상증후군", "혈액암", "골수이식", "백혈병", "비뇨기암", "림프종", "정맥혈전증", "맞춤치료", "다발성골수종", "유방암", "조혈모세포이식", "재생불량성빈혈", "두경부암"],
    "호흡기내과":["호흡기질환", "폐고혈압", "간질성폐질환", "기관지확장증", "만성폐쇄성폐질환", "수면무호흡증", "패혈증", "폐이식", "폐렴", "비결핵항산균폐질환", "폐결핵", "만성기침", "폐결절", "흉선종양", "결핵", "기관지내시경", "천식", "폐암"]
  }

  try{
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);

    const param = {
      search_rid_long : null,//'1FB50436AB3F03B126FBE3C89166EA1638A34E0CA7FA1EE0D89451A4AD25DB2A96B7C94DFD500E99FE3F793374EC418D138594572CA3B50B5712D9F91A90D9ABB4F67A5695BD5EEF417CEDA64AF3EC03',
      search_version_id : data_version_id,
      search_hid : hid
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
      "sql",
      "select_doctor_basic_standard",
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
      const rid_long = P1.data[i].rid_long;
      const deptname = P1.data[i].deptname;
      const doctorName = P1.data[i].doctorname;
      const specialties = P1.data[i].specialties;
      console.log(`target ${i}번째 doctorName > ${doctorName}, deptname : ${deptname}, specialties : ${specialties}`)

      if(!functions.isEmpty(deptname) && standard_list[deptname] && !functions.isEmpty(specialties)) {
      
        // 표준 세부진료분야 목록
        const standardSpecialtiesForDept = standard_list[deptname];
        // 의사의 세부진료분야를 배열로 변환
        const doctorSpecialties = specialties.split(',').map(s => s.trim()).filter(s => s);

        // 두 배열을 크로스 비교하여 일치하는 항목만 추출
        const matchedSpecialties = doctorSpecialties.filter(docSpec => standardSpecialtiesForDept.includes(docSpec));

        if (matchedSpecialties.length > 0) {
          const param2 = {
            target_find_depth : [deptname],//JSON.stringify([deptname]),
            target_specialties: matchedSpecialties,//JSON.stringify(matchedSpecialties),
            target_rid_long: rid_long
          }; 
          const format2 = { language: "sql", indent: "  " };
          const update_query = mybatisMapper.getStatement(
            "sql",
            "update_doctor_basic_standard",
            param2,
            format2
          );
  
          const { DBError: updateDBError, RS: updateRS } = await daoMysql.spCall(update_query);
          const updateRet = await functions.myBatisResult(updateDBError, updateRS);
          
          if (updateRet.success) {
            console.log(`[SUCCESS] doctor: ${doctorName}, matched: ${JSON.stringify(matchedSpecialties)}`);
            processCount++;
            successData.push({
              rid_long,
              doctorName,
              deptname,
              origin_specialties: specialties,
              matched_specialties: matchedSpecialties
            });
          } else {
            console.log(`[FAIL-DB] doctor: ${doctorName}`);
            processFailCount++;
            failData.push({
              rid_long,
              doctorName,
              deptname,
              specialties
            });
          }
        } else {
          console.log(`[FAIL-NO_MATCH] doctor: ${doctorName}`);
          processNullCount++;
          nullData.push({
            rid_long,
            doctorName,
            deptname,
            specialties,
            reason: "No matching specialties found"
          });
        }
      } else {
        console.log(`[FAIL-NO_DATA] doctor: ${doctorName}`);
        processNullCount++;
        nullData.push({
          hid,
          deptname,
          doctorName,
          rid_long,
          specialties,
          reason: "Department name or specialties are missing or not in standard list"
        });
      }
      await CS.wait(1000); // 1초 딜레이 시킨다 
    } // for loop end

    const outputDir = path.join(__dirname, 'completedata4');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `list_${hid}.json`);
    const outputData = {
      successData,
      failData,
      nullData
    };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log(`processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`)
    return res.send({
      code: 200,
      success: true,
      message:`processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`
    });
  }catch(e){
    console.error(`error 1111: ${e}`)
    return res.json(TS.fail("논문 수집 DB fail."));
  }
});




/**
 * @swagger
 *  /v1/c/crawling_reporcessing/make-doctor-specialty:
 *    post:
 *      summary: "병원데이터 후가공 - doctor id에 specialty id 부여 작업"
 *      description: "수집된 의사 doctor id에 specialty id 부여 작업 "
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "data_version_id, hid는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - data_version_id
 *             - hid
 *           properties:
 *             data_version_id:
 *               type: string
 *             hid:
 *               type: string
 *      responses:
 *        "200":
 *          description: 병원데이터 후가공 
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


router.post('/make-doctor-specialty', async (req, res, next) => {
 
  const { data_version_id, hid } = req.body;
  console.log(`data_version_id : ${data_version_id}, hid : ${hid}`);

  let totalCount = 0;
  let processCount = 0;
  let processNullCount = 0;
  let processFailCount = 0;
  let doctorCount = 0; // doctorCount 초기화
  const processedDoctorIds = new Set(); // 처리된 의사를 추적하기 위한 Set
  const successData = [];
  const failData = [];
  const nullData = [];

  const parseSpecialties = (specialties) => {
    if (!specialties) return [];
    // Define characters considered 'valid': Korean, English, numbers, whitespace
    const validCharRegex = /^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9\s]*$/;

    let parsedSpecs = [];
    try {
      const parsed = JSON.parse(specialties);
      if (Array.isArray(parsed)) {
        parsedSpecs = parsed;
      } else if (typeof parsed === 'string') {
        parsedSpecs = parsed.split(',');
      }
    } catch (e) {
      if (typeof specialties === 'string') {
        parsedSpecs = specialties.split(',');
      }
    }

    return parsedSpecs
      .map(s => s.trim()) // Trim whitespace from each specialty
      .filter(s => {
        // Apply the new filtering rules
        if (!s) return false; // Filter out empty strings
        if (s.length >= 10) return false; // Filter out strings 10 characters or longer
        if (!validCharRegex.test(s)) return false; // Filter out strings with special characters
        return true; // Keep strings that pass all filters
      });
  };
  
  try {
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);
    const format = { language: "sql", indent: "  " };

    // 1. Fetch all doctors for the given hospital
    const param = { search_version_id: data_version_id, search_hid: hid };
    const query = mybatisMapper.getStatement("sql", "select_doctor_basic_specialty", param, format);
    const { DBError, RS } = await daoMysql.spCall(query);
    if (DBError) throw new Error(DBError);

    totalCount = _.size(RS);
    console.log(`Total doctors fetched: ${totalCount}`);
    const doctors = RS;

    // 2. Collect all unique specialty names from all doctors
    const allSpecialtyNames = new Set();
    doctors.forEach(doctor => {
      if (doctor.specialties) {
        const specs = parseSpecialties(doctor.specialties);
        specs.forEach(spec => allSpecialtyNames.add(spec));
      }
    });

    if (allSpecialtyNames.size === 0) {
      console.log("No specialties found to process.");
      return res.send({ code: 200, success: true, message: "No specialties found to process." });
    }

    // 3. Bulk fetch existing specialty IDs
    const specialtyNamesArray = Array.from(allSpecialtyNames);
    const selectParam = { specialty_names: specialtyNamesArray };
    const selectQuery = mybatisMapper.getStatement("sql", "select_specialties_by_names", selectParam, format);
    const { RS: existingSpecialtiesRS } = await daoMysql.spCall(selectQuery);

    const specialtyNameToIdMap = new Map();
    existingSpecialtiesRS.forEach(spec => {
      specialtyNameToIdMap.set(spec.specialty, spec.specialty_id);
    });

    // 4. Identify new specialties and bulk-insert them
    const newSpecialtyNames = specialtyNamesArray.filter(name => !specialtyNameToIdMap.has(name));

    if (newSpecialtyNames.length > 0) {
      console.log(`Found ${newSpecialtyNames.length}`);
      const insertNewParam = { new_specialty_names: newSpecialtyNames, data_version_id };
      const insertNewQuery = mybatisMapper.getStatement("sql", "insert_new_specialties", insertNewParam, format);
      const { DBError: insertNewDBError } = await daoMysql.spCall(insertNewQuery);
      if (insertNewDBError) throw new Error("Failed to bulk-insert new specialties.");

      // 5. Fetch the new IDs and add them to the map
      const selectNewParam = { specialty_names: newSpecialtyNames };
      const selectNewQuery = mybatisMapper.getStatement("sql", "select_specialties_by_names", selectNewParam, format);
      const { RS: newSpecialtiesRS } = await daoMysql.spCall(selectNewQuery);
      newSpecialtiesRS.forEach(spec => {
        specialtyNameToIdMap.set(spec.specialty, spec.specialty_id);
      });
    }

    // 6. Prepare all doctor-specialty mappings
    const mappings = [];
    let num = 0;
    for (const doctor of doctors) {
      num++;
      if (!doctor.doctor_id) {
        console.log(`${num}/${totalCount} [FAIL-NO_DATA 1] Doctor ${doctor.doctorname} has no doctor_id.`);
        nullData.push({ doctor_id: null, doctorName: doctor.doctorname, reason: "Doctor has no doctor_id." });
        await CS.wait(1000); // 1초 딜레이
        continue;
      }
      const specs = parseSpecialties(doctor.specialties);
      if (specs.length === 0) {
        console.log(`${num}/${totalCount} [FAIL-NO_DATA 2] doctorname: ${doctor.doctorname},doctor_id: ${doctor.doctor_id}`);
        nullData.push({ doctor_id: doctor.doctor_id, doctorName: doctor.doctorname, reason: "specialties is empty for this doctor." });
        await CS.wait(1000); // 1초 딜레이
        continue;
      }

      specs.forEach(specialtiesTitle => {
        const specialty_id = specialtyNameToIdMap.get(specialtiesTitle);
        if (specialty_id) {
          mappings.push({ doctor_id: doctor.doctor_id, specialty_id });
          if (!processedDoctorIds.has(doctor.doctor_id)) {
            processedDoctorIds.add(doctor.doctor_id);
            doctorCount++;
          }
        } else {
          console.log(`${num}/${totalCount}  [FAIL-NOT_FOUND] Specialty '${specialtiesTitle}' for doctor '${doctor.doctorname}' could not be found or created.`);
          failData.push({ doctor_id: doctor.doctor_id, doctorName: doctor.doctorname, specialtiesTitle, reason: "Specialty ID could not be resolved." });
        }
      });
      console.log(`${num}/${totalCount} [SUCCESS] doctorname: ${doctor.doctorname},doctor_id: ${doctor.doctor_id}`);
      await CS.wait(1000); // 1초 딜레이
    }

    processNullCount = nullData.length;
    processFailCount = failData.length;

    // 7. Bulk insert all mappings
    if (mappings.length > 0) {
      console.log(`Preparing to insert ${mappings.length} doctor-specialty mappings.`);
      const mappingParam = { mappings ,data_version_id};
      const mappingQuery = mybatisMapper.getStatement("sql", "insert_doctor_specialty_mappings", mappingParam, format);
      const { DBError: mappingDBError, RS: mappingRS } = await daoMysql.spCall(mappingQuery);

      if (mappingDBError) {
        throw new Error("Failed to bulk-insert doctor-specialty mappings.");
      }
      
      // Since ON DUPLICATE KEY does not increment affectedRows for existing keys,
      // we'll count the number of intended mappings as the success count.
      processCount = mappings.length; 
      mappings.forEach(m => {
        successData.push({ doctor_id: m.doctor_id, specialty_id: m.specialty_id });
      });
    }

    const outputDir = path.join(__dirname, 'completedata5');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `list_${hid}.json`);
    const outputData = { 
      counting : {
        totalCount,
        doctorCount, // doctorCount 추가
        processCount,
        processNullCount,
        processFailCount
      },
      newSpecialtyNames,
      successData, 
      failData, nullData 
    };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));

    const message = `totalCount : ${totalCount}, doctorCount : ${doctorCount}, processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`;
    console.log(message);
    return res.send({ code: 200, success: true, message });

  }catch(e){
    console.error(`error in make-doctor-specialty: ${e}`)
    return res.json(TS.fail("Processing doctor specialties failed."));
  }
});


/**
 * @swagger
 *  /v1/c/crawling_reporcessing/sns-match-doctor:
 *    post:
 *      summary: "병원데이터 후가공 - sns평가 정보의 dodctor정보 매칭"
 *      description: "수sns평가 정보의 dodctor정보 매칭 "
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "data_version_id필수"
 *         schema:
 *           type: object
 *           required:
 *             - data_version_id
 *           properties:
 *             data_version_id:
 *               type: string
 *      responses:
 *        "200":
 *          description: 병원데이터 후가공 
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


router.post('/sns-match-doctor', async (req, res, next) => {
 
  const data_version_id = req.body.data_version_id;

  console.log(`data_version_id : ${data_version_id}`);

  let totalCount = 0;
  let processCount = 0;
  let processNullCount = 0;
  let processFailCount =0;
  const successData = [];
  const failData = [];
  const nullData = [];
  const hospitalCache = new Map();
  
  try{
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);

    const param = {
      search_version_id : data_version_id
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
      "sql",
      "select_sns_match_doctor",
      param,
      format
    );
    //console.log(`query : ${query}`)
    const { DBError = null, RS = null } = await daoMysql.spCall(query);
    //console.log(`RS : ${RS}`)
    totalCount = _.size(RS);
    console.log(`totalCount : ${totalCount}`)
    const P1 = {
      data : RS
    };
    for (let i = 0; i < totalCount; i++) {
      let doctorname = P1.data[i].doctorname;
      let hospital = P1.data[i].hospital;
      let department = P1.data[i].department;
      const review_eval_id = P1.data[i].review_eval_id;
      console.log(`target ${i+1}번째 doctorname > ${doctorname}, hospital : ${hospital}, review_eval_id : ${review_eval_id}`)

      if(!functions.isEmpty(doctorname) && !functions.isEmpty(hospital) ) {
        const hospitalKey = hospital.replace(/\s/g, '').replace(/[^a-zA-Z0-9가-힣]/g, '');
        let matchedHospitalInfo = hospitalCache.get(hospitalKey);

        if (matchedHospitalInfo === undefined) {
          const selectSpecParam = {
            search_hospital : hospitalKey
          }; 
          const selectSpecFormat = { language: "sql", indent: "  " };
          const selectSpecQuery = mybatisMapper.getStatement(
              "sql",
              "select_hospital_hid",
              selectSpecParam,
              selectSpecFormat
          );
  
          const { DBError: selectSpecDBError, RS: selectSpecRS } = await daoMysql.spCall(selectSpecQuery);
          const selectSpecRet = await functions.myBatisResult(selectSpecDBError, selectSpecRS);
        
          matchedHospitalInfo = selectSpecRet.data?.length > 0 ? selectSpecRet.data : null;
          hospitalCache.set(hospitalKey, matchedHospitalInfo);
        }
      
        if (matchedHospitalInfo) { // Null 체크 강화
          //const standard_name = matchedHospitalInfo[0]?.standard_name;
          //const standard_hid= matchedHospitalInfo[0]?.hid;

          if (matchedHospitalInfo?.length > 0  ) {

            const hidArray = matchedHospitalInfo.map(item => item?.hid).filter(Boolean); // undefined, null 제거
            //const hidNameArray = matchedHospitalInfo.map(item => item?.standard_name).filter(Boolean); // undefined, null 제거
            const selectDoctorBasicParam = {
              search_hospital : hidArray,
              search_doctorname : doctorname
            }; 
            const selectDoctorBasicFormat = { language: "sql", indent: "  " };
            const selectDoctorBasicQuery = mybatisMapper.getStatement(
              "sql",
              "select_doctor_basic_info",
              selectDoctorBasicParam,
              selectDoctorBasicFormat
            );
    
            const { DBError: selectDoctorBasicDBError, RS: selectDoctorBasicRS } = await daoMysql.spCall(selectDoctorBasicQuery);
            const selectDoctorBasicRet = await functions.myBatisResult(selectDoctorBasicDBError, selectDoctorBasicRS);
          
            const matchedDoctorInfo = selectDoctorBasicRet.data?.length > 0 ? selectDoctorBasicRet.data : null;
            let bestMatchDoctor = null;

            if (matchedDoctorInfo) {
              
              if (matchedDoctorInfo.length > 1) {
                console.log(`[INFO] 다중 의사 발견 (${matchedDoctorInfo.length}명). 진료과 유사도 비교 시작...`);
              }

              let highestScore = -1;
              for (const doctor of matchedDoctorInfo) {
                const snsDepartment = department || '';
                const dbDeptName = doctor.deptname || '';

                // 진료과 정보가 둘 다 있을 때만 유사도 계산
                if (snsDepartment && dbDeptName) {
                  const score = stringSimilarity.compareTwoStrings(snsDepartment, dbDeptName);
                  console.log(`[DEBUG] 비교: '${snsDepartment}' vs '${dbDeptName}' -> 유사도: ${score}`);
                  if (score > highestScore) {
                    highestScore = score;
                    bestMatchDoctor = doctor;
                  }
                } else if (highestScore < 0) { // 진료과 정보가 하나라도 없으면, 아직 아무것도 선택되지 않았을 때만 기본 후보로 지정
                  bestMatchDoctor = doctor;
                }
              }
              
              const SIMILARITY_THRESHOLD = 0.5; // 유사도 임계값
              if (bestMatchDoctor && (highestScore >= SIMILARITY_THRESHOLD || highestScore === -1)) { // 점수가 임계값을 넘거나, 진료과 정보가 없어 점수계산을 안한 경우(-1)
                if (highestScore !== -1) {
                  console.log(`[INFO] 최종 선택된 의사: ${bestMatchDoctor.doctorname}, 진료과: '${bestMatchDoctor.deptname}' (유사도: ${highestScore})`);
                }

                const updateParam = {
                  match_rid: bestMatchDoctor.rid,
                  match_rid_long: bestMatchDoctor.rid_long,
                  match_hospital: bestMatchDoctor.hid, // hospital_alias의 standard_name
                  match_deptname : bestMatchDoctor.deptname, // 매칭된 의사의 deptname
                  target_review_eval_id: review_eval_id
                };
                const updateFormat = { language: "sql", indent: "  " };
                const updateQuery = mybatisMapper.getStatement(
                  "sql",
                  "update_sns_match_doctor",
                  updateParam,
                  updateFormat
                );
        
                const { DBError: updateDBError, RS: updateRS } = await daoMysql.spCall(updateQuery);
                const updateRet = await functions.myBatisResult(updateDBError, updateRS);
                
                if (updateRet.success) {
                  console.log(`[SUCCESS] Linked doctor: ${doctorname} with hospital: '${hospital}' (ID: ${review_eval_id})`);
                  processCount++;
                  successData.push({ review_eval_id, doctorname, hospital, matched_doctor: bestMatchDoctor.doctorname, matched_dept: bestMatchDoctor.deptname, score: highestScore });
                } else {
                  console.log(`[FAIL-DB_UPDATE] Doctor: ${doctorname}, hospital: ${hospital}`);
                  processFailCount++;
                  failData.push({ review_eval_id, doctorname, hospital });
                }
              } else {
                console.log(`[FAIL-LOW_SIMILARITY] ${doctorname} 의사 후보를 찾았으나 진료과 유사도가 너무 낮습니다. 최고점수: ${highestScore}`);
                processFailCount++;
                nullData.push({ review_eval_id, doctorname, hospital, reason: "Doctor found, but department similarity was too low.", score: highestScore });
              }
            } else {
                console.log(`[FAIL-DOCTOR_NOT_FOUND] Doctor '${doctorname}' not found at any of the matched hospitals.`);
                processFailCount++;
                nullData.push({ review_eval_id, doctorname, hospital, reason: "Doctor not found at the specified hospital" });
            }
          } else {
            console.log(`[FAIL-NO_HOSPITAL_ID] review_eval_id '${review_eval_id}', hospital '${hospital}' found but has no hid.`);
            processFailCount++;
            nullData.push({ review_eval_id, doctorname, hospital, reason: "Hospital found but standard_name or hid is missing" });
          }
        } else {
          console.log(`[FAIL-HOSPITAL_NOT_FOUND] review_eval_id '${review_eval_id}', hospital '${hospital}' not found in master DB.`);
          processFailCount++;
          nullData.push({ review_eval_id, doctorname, hospital, reason: "Hospital not found" });
        }
      
      } else {
        console.log(`[FAIL-NO_DATA] doctor or hospital name is empty for review_eval_id: ${review_eval_id}`);
        processNullCount++;
        nullData.push({
          review_eval_id,
          doctorname,
          hospital
        });
      }
      await CS.wait(500); // 0.5초 딜레이 시킨다
    } // for loop end

    const outputDir = path.join(__dirname, 'completedata6');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `list_ver_${data_version_id}.json`);
    const outputData = {
      counting : {
        totalCount,
        processCount,
        processNullCount,
        processFailCount
      },
      successData,
      failData,
      nullData
    };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log(`processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`)
    return res.send({
      code: 200,
      success: true,
      message:`processCount : ${processCount},processFailCount : ${processFailCount},processNullCount : ${processNullCount}`
    });
  }catch(e){
    console.error(`error 1111: ${e}`)
    return res.json(TS.fail("SNS 매칭 처리 DB fail."));
  }
});


/**
 * @swagger
 *  /v1/c/crawling_reporcessing/make-revert:
 *    post:
 *      summary: "병원데이터 후가공 - 경력합치기"
 *      description: "이미 수집된 의사의  경력/학력/기타를 하나의 jsondata로 merge"
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "rid는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - rid
 *           properties:
 *             rid:
 *               type: string
 *      responses:
 *        "200":
 *          description: 병원데이터 후가공 
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


router.post('/make-revert', async (req, res, next) => {
  const { rid } = req.body;

  if (!rid) {
    return res.status(400).json(TS.fail('rid_long is required in the request body.'));
  }

  try {
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);

    // 1. Select the data
    const selectParam = { search_rid_long: rid };
    const selectQuery = mybatisMapper.getStatement("sql", "select_doctor_revert_career_data", selectParam, { language: "sql", indent: "  " });
    const { DBError: selectDBError, RS: selectRS } = await daoMysql.spCall(selectQuery);

    if (selectDBError || !selectRS || selectRS.length === 0) {
      console.error(`Error selecting data for rid_long: ${rid}`, selectDBError);
      return res.status(404).json(TS.fail('Failed to fetch doctor career data or no data found.'));
    }

    const doctorData = selectRS[0];

    // 2. Merge the data from text columns
    const educationList = JSON.parse(doctorData.education || '[]');
    const careerList = JSON.parse(doctorData.career || '[]');
    const etcList = JSON.parse(doctorData.etc || '[]');
    const mergedList = [...educationList, ...careerList, ...etcList];

    // 3. Update the jsondata column
    const updateParam = {
      jsondata_str: mergedList, // Pass the array object directly, matching the SQL parameter name
      target_rid_long: rid
    };
    const updateQuery = mybatisMapper.getStatement("sql", "update_doctor_revert_career_updatedate", updateParam, { language: "sql", indent: "  " });
    const { DBError: updateDBError, RS: updateRS } = await daoMysql.spCall(updateQuery);
    const updateRet = await functions.myBatisResult(updateDBError, updateRS);

    if (updateRet.success) {
      return res.json(TS.success({ message: `Successfully reverted jsondata for rid_long: ${rid}` }));
    } else {
      console.error(`Error updating data for rid_long: ${rid}`, updateDBError);
      return res.status(500).json(TS.fail('Failed to update doctor career data.'));
    }

  } catch (e) {
    console.error(`Error in /make-revert: ${e}`);
    return res.status(500).json(TS.fail("An unexpected error occurred during the revert process."));
  }
});




/**
 * @swagger
 *  /v1/c/crawling_reporcessing/pubmed_authors_remove:
 *    post:
 *      summary: "논문 Authors의 중복 제거"
 *      description: "논문 Authors의 중복 제거"
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "hid, version_id는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - data_version_id
 *             - hid
 *           properties:
 *             data_version_id:
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


router.post('/pubmed_authors_remove', async (req, res, next) => {
 
  const search_hid = req.body.hid;
  const search_version_id = req.body.data_version_id;
  let totalCount = 0;
  let processSuccessCount = 0;
  let processFailCount = 0;
  let processSameCount = 0
  const successData = [];
  const failData = [];
  const sameData = [];
  console.log(`search_hid : ${search_hid}, search_version_id : ${search_version_id}`)

  try{
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);
    const param = {
      search_version_id,
      search_hid
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
      "sql",
      "select_doctor_pubmed_authors_treatise",
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

      const paper_id = P1.data[i].paper_id;
      const doctorName = P1.data[i].doctorName;
      const authors = P1.data[i].authors.replace("'","");
      console.log(`P1.data[i] > ${i+1}번째 ${doctorName}-${paper_id}`)
      console.log(`authors > ${i+1}번째 ${authors}`)
      const trimArr = authors.split(',').map(a => a.trim());

      const uniqueAuthors = new Set(trimArr);

      const strAuthors = [...uniqueAuthors].join(', ');
      console.log(`strAuthors > ${i}번째 ${strAuthors}`)
      if( strAuthors !== authors) {
       
        const updateParam = {
          str_athors: strAuthors, // Pass the array object directly, matching the SQL parameter name
          target_paper_id: paper_id
        };
        const updateQuery = mybatisMapper.getStatement("sql", "update_doctor_pubmed_authors_treatise", updateParam, { language: "sql", indent: "  " });
        const { DBError: updateDBError, RS: updateRS } = await daoMysql.spCall(updateQuery);
        const updateRet = await functions.myBatisResult(updateDBError, updateRS);

        if (updateRet.success) {
          console.log(`sucess doctorName > ${doctorName}`)
          processSuccessCount++;
          successData.push({
            paper_id,
            doctorName,
            authors,
            strAuthors
          })
        } else {
          console.log(`fail doctorName > ${doctorName}`)
          processFailCount++;
          failData.push({
            paper_id,
            doctorName,
            authors,
            strAuthors
          })
        }
        
      }else{
        console.log(`same doctorName > ${doctorName}`)
        processSameCount++;
        sameData.push({
          paper_id,
          doctorName,
          authors
        })
      }
      await CS.wait(500); // 0.5초 딜레이 시킨다 
     
    } // for loop end
    const outputDir = path.join(__dirname, 'completedata2');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `list_${search_hid}.json`);
    const outputData = {
      counting : {
        totalCount,
        processSuccessCount,
        processFailCount,
        processSameCount
      },
      successData,
      failData,
      sameData
    };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log(`processSuccessCount : ${processSuccessCount},processFailCount : ${processFailCount}, processSameCount : ${processSameCount}`)
    return res.send({
      code: 200,
      success: true,
      message:`processSuccessCount : ${processSuccessCount},processFailCount : ${processFailCount}, processSameCount : ${processSameCount}`
    });
  }catch(e){
    console.error(`error 1111: ${e}`)
    return res.json(TS.fail("논문 Authors 중복 제거 fail."));
  }
});





/**
 * @swagger
 *  /v1/c/crawling_reporcessing/pubmed_find_firstauthor:
 *    post:
 *      summary: "논문 제1저자 찾기"
 *      description: "논문 제1저자 찾기"
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "hid, version_id는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - data_version_id
 *             - hid
 *           properties:
 *             data_version_id:
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


router.post('/pubmed_find_firstauthor', async (req, res, next) => {
 
  const search_hid = req.body.hid;
  const search_version_id = req.body.data_version_id;
  let totalCount = 0;
  let processSuccessCount = 0;
  let processFailCount = 0;
  let processNullCount = 0;
  let processNotMatchCount = 0;
  const successData = [];
  const failData = [];
  const nullData = [];
  const notMatchData = [];
  console.log(`search_hid : ${search_hid}, search_version_id : ${search_version_id}`)

  try{
    //mapper 경로
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);
    const param = {
      search_version_id,
      search_hid
    }; 
    const format = { language: "sql", indent: "  " };
    const query = mybatisMapper.getStatement(
      "sql",
      "select_doctor_pubmed_find_first_authors",
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

      const paper_id = P1.data[i].paper_id;
      const doctorName = P1.data[i].doctorName;
      const firstAuthors = P1.data[i].firstAuthors.replace("'","");
      console.log(`find ${i+1}/${totalCount} ${doctorName}-${paper_id}, ${firstAuthors}`)
      
      if ( doctorName && !functions.isEmpty(firstAuthors)) {
        const candidates = await crawlingCtrl.generateNameCandidates(doctorName);
        if (candidates.length === 0) {
          console.log(`${doctorName} -> 영문 이름 후보를 생성할 수 없습니다.`);
          processFailCount++;
          failData.push({
            reason : "영문 이름 후보를 생성할 수 없습니다.",
            paper_id,
            doctorName,
            firstAuthors
          })
          continue;
        }

        const isMatchResult = await crawlingCtrl.isMatch(firstAuthors, candidates);

        if ( isMatchResult ) {
          
          const updateParam = {
            doctor_name_kor_to_eng_list : candidates.join(', '),
            str_firstAuthors: firstAuthors, // Pass the array object directly, matching the SQL parameter name
            target_paper_id: paper_id
          };
          const updateQuery = mybatisMapper.getStatement("sql", "update_doctor_pubmed_find_first_authors", updateParam, { language: "sql", indent: "  " });
          const { DBError: updateDBError, RS: updateRS } = await daoMysql.spCall(updateQuery);
          const updateRet = await functions.myBatisResult(updateDBError, updateRS);
  
          if (updateRet.success) {
            console.log(`sucess doctorName > ${doctorName}`)
            processSuccessCount++;
            successData.push({
              paper_id,
              doctorName,
              firstAuthors
            })
          } else {
            //console.log(`fail doctorName > ${doctorName}`)
            processFailCount++;
            failData.push({
              reason : "DB Update Fail",
              paper_id,
              doctorName,
              firstAuthors
            })
          }
        }else{
          console.log(`not match doctorName > ${doctorName}`)
          processNotMatchCount++;
          notMatchData.push({
            paper_id,
            doctorName,
            firstAuthors
          })
          const update2Param = {
            doctor_name_kor_to_eng_list : candidates.join(', '),
            target_paper_id: paper_id
          };
          const update2Query = mybatisMapper.getStatement("sql", "update_doctor_pubmed_find_first_authors_null", update2Param, { language: "sql", indent: "  " });
          const { DBError: updateDB2Error, RS: update2RS } = await daoMysql.spCall(update2Query);
          const update2Ret = await functions.myBatisResult(updateDB2Error, update2RS);
  
        }

      }else{
        //console.log(`same doctorName > ${doctorName}`)
        processNullCount++;
        nullData.push({
          paper_id,
          doctorName,
          firstAuthors
        })
      }

      await CS.wait(500); // 0.5초 딜레이 시킨다 
     
    } // for loop end
    const outputDir = path.join(__dirname, 'completedata3');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `list_${search_hid}.json`);
    const outputData = {
      counting : {
        totalCount,
        processSuccessCount,
        processFailCount,
        processNullCount,
        processNotMatchCount
      },
      successData,
      failData,
      notMatchData,
      nullData
    };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log(`processSuccessCount : ${processSuccessCount},processFailCount : ${processFailCount}, processNullCount : ${processNullCount}, processNotMatchCount : ${processNotMatchCount}`)
    return res.send({
      code: 200,
      success: true,
      message:`processSuccessCount : ${processSuccessCount},processFailCount : ${processFailCount}, processNullCount : ${processNullCount}, processNotMatchCount : ${processNotMatchCount}`
    });
  }catch(e){
    console.error(`error 1111: ${e}`)
    return res.json(TS.fail("논문 Authors 중복 제거 fail."));
  }
});





/**
 * @swagger
 *  /v1/c/crawling_reporcessing/pubmed_find_quartile:
 *    post:
 *      summary: "논문 quartile과 impactFactor 조회 "
 *      description: "논문 quartile과 impactFactor 조회"
 *      tags: [병원데이터 후가공]
 *      produces:
 *      parameters:
 *       - in: "body"
 *         name: "input"
 *         description: "hid, version_id는 필수"
 *         schema:
 *           type: object
 *           required:
 *             - data_version_id
 *             - hid
 *           properties:
 *             data_version_id:
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


router.post('/pubmed_find_quartile', async (req, res, next) => {
 
  const search_hid = req.body.hid;
  const search_version_id = req.body.data_version_id;
  let totalUniqueJournals = 0;
  let processSuccessCount = 0; // Number of unique journals successfully processed
  let processFailCount = 0;   // Number of unique journals that failed to process
  let processNullCount = 0;   // Number of unique journals where data was missing initially
  let processNotMatchCount = 0; // Number of unique journals where SCImago match failed

  const successData = [];
  const failData = [];
  const nullData = [];
  const notMatchData = [];

  console.log(`search_hid : ${search_hid}, search_version_id : ${search_version_id}`)

  try{
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_reprocessing/sql.xml`]);
    const format = { language: "sql", indent: "  " };

    // 1. Get distinct journal names that need quartile updates
    const param = {
      search_version_id,
      search_hid
    }; 
    const queryDistinctJournals = mybatisMapper.getStatement(
      "sql",
      "select_distinct_journal_names_for_quartile_update",
      param,
      format
    );
    const { DBError: dbErrorDistinctJournals, RS: rsDistinctJournals } = await daoMysql.spCall(queryDistinctJournals);

    if (dbErrorDistinctJournals) {
        throw new Error(`DB Error fetching distinct journals: ${dbErrorDistinctJournals}`);
    }

    const uniqueJournals = rsDistinctJournals || [];
    totalUniqueJournals = uniqueJournals.length;
    console.log(`Total unique journals to process: ${totalUniqueJournals}`);

    for (let i = 0; i < totalUniqueJournals; i++) {
      const uniqueJournalEntry = uniqueJournals[i];
      const journalName = uniqueJournalEntry.journalName;
      const hid = uniqueJournalEntry.hid; // The hid is from doctor_basic table for filtering
      const data_version_id_filter = uniqueJournalEntry.data_version_id; // For more precise filtering

      console.log(`${i+1}/${totalUniqueJournals} Processing journal: ${journalName} (HID: ${hid})`);

      if (!functions.isEmpty(journalName)) {
        const metrics = await crawlingCtrl.getJournalMetricsFromSCImago(journalName);

        if (metrics && metrics.quartile) {
          const updateParam = {
            quartile: metrics.quartile,
            impactFactor: metrics.impactFactor,
            full_journalName: metrics.full_journalName,
            journal_issn: metrics.journal_issn,
            journalName: journalName, // For WHERE clause
            search_version_id: data_version_id_filter, // For WHERE clause
            search_hid: hid // For WHERE clause
          };
          const updateQuery = mybatisMapper.getStatement("sql", "update_papers_by_journal_name_and_hid", updateParam, format);
          const { DBError: updateDBError, RS: updateRS } = await daoMysql.spCall(updateQuery);
          const updateRet = await functions.myBatisResult(updateDBError, updateRS);

          if (updateRet.success) {
            console.log(`[SUCCESS] Journal: ${journalName} (HID: ${hid}) updated.`);
            processSuccessCount++;
            successData.push({ journalName, hid, metrics });
          } else {
            console.log(`[FAIL-DB] Journal: ${journalName} (HID: ${hid}) failed DB update.`);
            processFailCount++;
            failData.push({ journalName, hid, reason: "DB Update Failed", metrics });
          }
        } else {
          console.log(`[NOT-MATCH] Journal: ${journalName} (HID: ${hid}) - SCImago match failed or no metrics.`);
          processNotMatchCount++;
          notMatchData.push({ journalName, hid });
        }
      } else {
        // This case should ideally not happen if select_distinct_journal_names_for_quartile_update filters out empty journalNames
        console.log(`[NULL-JOURNALNAME] Empty journalName found (HID: ${hid}).`);
        processNullCount++;
        nullData.push({ journalName, hid, reason: "Empty journal name" });
      }

      await CS.wait(5000); // 5초 딜레이
    } // for loop end

    const outputDir = path.join(__dirname, 'completedata_journal_batch'); // New directory for batch processing logs
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `list_hid_${search_hid}_ver_${search_version_id}.json`);
    const outputData = {
      counting : {
        totalUniqueJournals,
        processSuccessCount,
        processFailCount,
        processNullCount,
        processNotMatchCount
      },
      successData,
      failData,
      notMatchData,
      nullData
    };
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    const message = `Total unique journals: ${totalUniqueJournals}, Success: ${processSuccessCount}, Fail: ${processFailCount}, Null: ${processNullCount}, Not Match: ${processNotMatchCount}`;
    console.log(message);
    return res.send({
      code: 200,
      success: true,
      message: message
    });
  }catch(e){
    console.error(`Error in pubmed_find_quartile (batch processing): ${e}`)
    return res.json(TS.fail("논문 Quartile 및 ImpactFactor 일괄 조회 처리에 실패했습니다."));
  }
});
