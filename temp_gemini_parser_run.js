const { parseWithGemini } = require('./services/crawling_bedoc/gemini_parser.js');
const doctorData = {
  "hospital_cid": 394,
  "bedoc_id": "A8224",
  "bedoc_hospitalsite": "http://www.dumc.or.kr/isom",
  "bedoc_doctorname": "이무용",
  "bedoc_deptname": "심장내과",
  "bedoc_hospitalname": "동국대일산병원",
  "hospital_name": "동국대일산병원",
  "aiga_hid": "H11KR-31000020",
  "hospital_site": "http://www.dumc.or.kr/medical/department/departmentDoctorDetail.jsp?act=deptDocInfo&nowPageInfo=ILSH&nowMenuId=00000060&deptCode=CCVSC&docCode=050915",
  "site_type": "single",
  "hospital_addr": "경기도 고양시 일산동구 동국로 27, (식사동, 동국대학교일산병원)",
  "isExist": null,
  "isSearchType": "html_failed",
  "error": "Cheerio parser could not extract education or experience."
};

(async () => {
    const result = await parseWithGemini(doctorData);
    console.log(JSON.stringify(result));
})();