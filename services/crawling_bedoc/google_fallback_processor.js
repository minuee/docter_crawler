/**
 * ==================================================================================================
 *                                    ** 중요 시작 규칙 **
 * ==================================================================================================
 *
 * 모든 작업은 항상 여기서 시작해야 합니다.
 *
 * 별도의 지시가 없는 한, 가장 먼저 수행해야 할 작업은 1단계 수집을 시작하는 것입니다.
 * 이 작업은 '/v1/c/crawling_bedoc/collect2' 엔드포인트를 호출하여 수행됩니다.
 *
 * 셸 명령어 예시:
 * curl http://localhost:1100/v1/c/crawling_bedoc/collect2
 *
 * 1단계가 완료된 후에만 2단계(Playwright Fallback)로 진행해야 합니다.
 *
 */
// This script is a guide for the Gemini assistant to perform the automated, multi-phase parsing process.
// It codifies the logic for handling the single, stateful JSON file for each doctor.

const fs = require('fs');
const path = require('path');

/**
 * this is a sample of the doctorData object
 {
  "hospital_cid": 53,
  "bedoc_doctorname": "김기환",
  "bedoc_deptname": "간담췌외과",
  "bedoc_doctor_site": "https://www.cmcujb.or.kr/page/doctor/doctor_view.asp?p_sqno=54",
  "site_type": "single", // Can be 'single', 'list', or 'popup'
  "bedoc_hospitalname": "가톨릭대학교의정부성모병원",
  "hospital_tel": "1661-7500",
  "hospital_name": "가톨릭대학교의정부성모병원",
  "hospital_addr": "경기도 의정부시 천보로 271, 의정부성모병원 (금오동)",
  "aiga_hid": "H11KR-31000003",
  "hospitalsite": "http://www.cmcujb.or.kr/",
  "hospital_site": "http://www.cmcujb.or.kr/",
  "isExist": true,
  "isSearchType": "google",
  "error": null,
  "doctorDetailUrl": "https://www.cmcujb.or.kr/page/doctor/doctor_view.asp?p_sqno=54",
  "profileUrl": "https://www.cmcujb.or.kr/DATA/doctor/20190319104849_1.jpg",
  "specialty": "간암, 담도암, 췌장암, 담낭암, 담석, 간이식, 로봇 및 복강경 수술",
  "학력": [
    { "date": "1984 ~ 1990", "content": "조선대학교 의학 학사" },
    { "date": "1998 ~ 2003", "content": "가톨릭대학교 외과학 석사" },
    { "date": "2003 ~ 2010", "content": "가톨릭대학교 외과학 박사" }
  ],
  "경력": [
    { "date": "1993 ~ 1994", "content": "지방공사강남병원 인턴" },
    { "date": "1995 ~ 1999", "content": "의정부성모병원 외과 레지던트" },
    { "date": "1999 ~ 2002", "content": "의정부성모병원 외과 임상강사" },
    { "date": "2015", "content": "의정부성모병원 외과 임상과장" },
    { "date": "2017 ~ 현재", "content": "의정부성모병원 외과 교수" },
    { "date": "2007", "content": "Univ. of Pittsburgh (방문 또는 연수 추정)" }
  ],
  "약력": [
    // '약력'은 '학력'과 '경력'을 통합한 정보입니다.
    // '약력' 내에서 '학력'을 구분하는 기준: 내용에 '학사', '석사', '박사', '졸업' 등의 키워드가 포함된 경우
    // 예시: { "date": "YYYY ~ YYYY", "content": "내용 (학력)" }
    // 그 외의 내용은 '경력'으로 분류합니다.
    // 예시: { "date": "YYYY ~ 현재", "content": "내용 (경력)" }
  ],
  "수상": [
    { "date": "2025.02.20", "content": "로봇수술 700례 달성" },
    { "date": null, "content": "경기 동북부 병원 최초 간이식 성공" }
  ],
  "학술": [
    { "date": "2021 ~ 현재", "content": "한국 간담췌외과학회 경인지회 회장" },
    { "date": null, "content": "대한중환자의학회 정회원" },
    { "date": null, "content": "대한임상종양학회 평생회원" },
    { "date": null, "content": "대한외과학회 평생회원" }
  ],
  "언론": [
    { "targetDate": "2025.02.20", "type": "기사", "text": "병원신문에 로봇수술 700례 달성 관련 기사 보도", "url": null, "issuer": "병원신문" },
    { "targetDate": null, "type": "유튜브", "text": "로봇수술 어떻게 활용되고 있을까? (가톨릭대학교 의정부성모병원)", "url": null, "issuer": "가톨릭대학교 의정부성모병원" },
    { "targetDate": null, "type": "기사", "text": "의정부성모병원 외과, 단일공 복강경수술 1000례 돌파 관련 기사", "url": null, "issuer": null }
  ],
 "저서": [
    { "date": "2025", "content": "「오늘부터 변비탈출」 2022년","issuer": "병원신문" },
    {"date": "2025","content": "「알고먹자 유산균」 2021년","issuer": "병원신문" },
  ]
  "논문": [
    "Robotic surgery enables safe and comfortable single-incision cholecystectomy: A comparison of robotic and laparoscopic approaches for single-incision surgery (JOURNAL OF MINIMAL ACCESS SURGURY, 2020년 9월, 공동저자)",
    "Serum level of visfatin can reflect the severity of inflammation in patients with acute cholecystitis (ANNALS OF SURGICAL TREATMENT AND RESEARCH, 2020년 7월, 공동저자)",
    "Greater Saphenous Vein Graft Revascularization of the Left Hepatic Arterty after Resection of Intrahepatic Cholangiocarcinoma with Common Hepatic Artery Resection (ARCHIVES OF HAND AND MICROSURGERY, 2020년 6월, 공동저자)",
    "A novel antifibrotic strategy utilizing conditioned media obtained from miR-150-transfected adipose-derived stem cells: validation in an animal model of liver fibrosis (EXPERIMENTAL AND MOLECULAR MEDICINE, 2020년 3월, 공동저자)",
    "A Novel Way of Preventing Postoperative Pancreatic Fistula by Directly Injecting Profibrogenic Materials into the Pancreatic Parenchyma (INTERNATIONAL JOURNAL OF MOLECULAR SCIENCES, 2020년 3월, 공동저자)",
    "Generation of induced secretome from adipose-derived stem cells specialized for disease-specific treatment: An experimental mouse model (WORLD JOURNAL OF STEM CELLS, 2020년 1월, 공동저자)",
    "A Novel Hepatic Anti-Fibrotic Strategy Utilizing the Secretome Released from Etanercept-Synthesizing Adipose-Derived Stem Cells (INTERNATIONAL JOURNAL OF MOLECULAR SCIENCES, 2019년 12월, 공동저자)",
    "A Comparative Study of Needlescopic Grasper Assisted Single Incision versus Three-Port versus Pure Single Incision Laparoscopic Cholecystectomy (JOURNAL OF MINIMALLY INVASIVE SURGERY, 2019년 12월, 교신저자)",
    "Enhanced Therapeutic Potential of the Secretome… (INTERNATIONAL JOURNAL OF MOLECULAR SCIENCES, 2019년 11월, 공동저자)"
  ],
  "searchHospitalName": "가톨릭대학교의정부성모병원",
  "isSameHospital": true,
  "isAttend": true,
  "found_hospital_aiga_hid": "H11KR-31000003",
  "searchHospitalAddress": "경기도 의정부시 천보로 271, 의정부성모병원 (금오동)"
}
 */

/**
 * ==================================================================================================
 *                                    ** 중요 데이터 구조 규칙 **
 * ==================================================================================================
 *
 * '학력', '경력', '수상', '학술', '언론', '저서', '논문'과 같이 배열 형태의 데이터를 저장할 때는
 * 반드시 다음 한글 키(key)를 사용해야 합니다. 영문 키(예: 'education')는 허용되지 않습니다.
 *
 * 예시:
 * {
 *   "학력": [
 *     { "date": "YYYY ~ YYYY", "content": "내용" },
 *     ...
 *   ],
 *   "경력": [
 *     { "date": "YYYY ~ 현재", "content": "내용" },
 *     ...
 *   ],
 *   "수상": [
 *     { "date": "YYYY.MM.DD", "content": "내용" },
 *     ...
 *   ],
 *   "학술": [
 *     { "date": "YYYY ~ 현재", "content": "내용" },
 *     ...
 *   ],
 *   "언론": [
 *     { "targetDate": "YYYY.MM.DD", "type": "기사", "text": "내용", "url": null, "issuer": "발행처" },
 *     ...
 *   ],
 *   "저서": [
 *      { "date": "2025", "content": "「오늘부터 변비탈출」 2022년","issuer": "병원신문" },
      ]
 *     ...
 *   ],
 *   "논문": [
 *     "논문 내용",
 *     ...
 *   ]
 * }
 *
 * 이 규칙은 데이터 일관성과 시스템 전반의 호환성을 위해 필수적입니다.
 *
 */

/**
 * ==================================================================================================
 *                                    OVERALL WORKFLOW
 * ==================================================================================================
 *
 * 1.  **Phase 1: On-Site Parsing (Initiated via API Call)**
 *     - The process starts when a user or automated system calls the `/v1/c/crawling_bedoc/collect2` API endpoint.
 *     - This endpoint retrieves a list of doctors and, for each one, calls the `gemini_parser.js` script.
 *     - The script attempts to parse the doctor's profile from their hospital's website.
 *     - SUCCESS: It writes a JSON file for the doctor with `isSearchType: 'html'` and all extracted data.
 *     - FAILURE: It writes a JSON file with `isSearchType: 'html_failed'` to queue the doctor for Phase 2.
 *
 * 2.  **Phase 2: Playwright Fallback (Orchestrated by the Gemini Assistant)**
 *     - After Phase 1 is complete, Gemini processes ALL JSON files from Phase 1, regardless of their 'isSearchType' status.
 *     - For each file, Gemini reads the `site_type` field and follows the corresponding advanced parsing plan described below.
 *
 */

/**
 * ==================================================================================================
 *                  GEMINI EXECUTION PLAN FOR PLAYWRIGHT FALLBACK (PHASE 2)
 * ==================================================================================================
 */
function processGoogleFallback() {

    // Gemini Action 1: Find all tasks.
    // Find all `{doctorName}.json` files from Phase 1.
    const promptForFindingTasks = `
        // Gemini, please find all outes*.jsonoutes files in the outesservices/crawling_bedoc/data/outes subdirectories.
        // IMPORTANT: Exclude files ending with outes_saved.jsonoutes, as these are already processed.
        // Create a list of all file paths found.
    `;

    // For each task file found, perform the following actions:

    // Gemini Action 2: Read the file to get the original doctorData, including the new 'site_type' field.
    // const doctorData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

    // Gemini Action 3: Advanced Parsing via Playwright based on 'site_type'
    const promptForAdvancedParsing = `
        // Gemini, for this 'html_failed' task, you will perform a targeted parsing routine with Playwright based on the 'site_type' provided in the doctor's data.
        //
        // ==================================================================================================
        // **매우 중요: PARSER.JS 사용 지침**
        // ==================================================================================================
        // 각 병원별로 'parser.js' 파일이 해당 병원의 데이터 디렉토리 내에 생성 및 유지되어야 합니다.
        // (예: services/crawling_bedoc/data/{aiga_hid}/parser.js).
        // 이 'parser.js' 파일은 해당 병원의 모든 의사에게 재사용 가능해야 합니다.
        // 이 파일은 의사별 데이터(bedoc_doctorname, bedoc_deptname, hospital_site, site_type 등)를
        // 명령줄 인자로 받아 처리해야 합니다.
        // **절대 범용 Playwright 스크립트를 사용하지 마십시오.** 각 병원별 'parser.js'를 사용해야 합니다.
        // 이 파일은 사용 후 삭제되어서는 안 됩니다.
        // ==================================================================================================
        //
        // ==================================================================================================
        // **주의: PARSER.JS 생성, 재사용 및 업데이트 절차**
        // ==================================================================================================
        // 1. **기존 파서 확인, 분석 및 실행:**
        //    - 작업을 시작할 때, 해당 병원 디렉토리(services/crawling_bedoc/data/{aiga_hid}/)에 'parser.js'가 이미 있는지 확인합니다.
        //    - 파일이 존재하면, **실행 전 반드시 파일을 먼저 읽어 어떤 인자(arguments)를 필요로 하는지 정확히 파악해야 합니다.**
        //    - 분석이 끝나면, 파악된 인자에 맞춰 스크립트를 실행하여 데이터 수집을 시도합니다.
        //
        // 2. **신규 파서 생성 (parser.js가 없을 경우):**
        //    - **2-1. HTML 구조 분석:** 'parser.js'가 없다면, 웹사이트 구조를 분석하기 위해 임시 'get_html.js' 스크립트를 생성하여 실행합니다. 
        //      **(중요: 이 스크립트는 page.content() 대신 page.evaluate(() => document.body.innerHTML)을 사용하여 <body> 태그 내부의 HTML만 가져와야 합니다. 이는 데이터 처리 용량 초과를 방지하기 위함입니다.)**
        //    - **2-2. 파서 작성:** 분석된 HTML 구조를 바탕으로, 해당 병원 전용의 새로운 'parser.js'를 작성합니다. 이 스크립트는 모든 상세 정보(학력, 경력, 논문 등)를 정확히 추출해야 합니다.
        //    - **2-3. 파서 실행:** 새로 생성된 'parser.js'를 실행하여 데이터 수집을 완료합니다.
        //
        // 3. **기존 파서 업데이트 (실행 실패 또는 결과 불만족 시):**
        //    - 기존 'parser.js' 실행 후, `isSearchType`이 `html_playwright_failed`로 변경되거나, 추출된 데이터가 비어있는 등 결과가 만족스럽지 않을 경우 파서 업데이트를 진행합니다.
        //    - **3-1. HTML 구조 재분석:** 신규 파서 생성 과정(2-1)과 동일하게, 'get_html.js'를 사용하여 현재 웹사이트의 최신 HTML 구조를 가져옵니다. 
        //      **(중요: 여기서도 마찬가지로 <body> 태그 내부의 HTML만 가져옵니다.)**
        //    - **3-2. 파서 디버깅 및 수정:** 가져온 최신 HTML과 기존 'parser.js'의 선택자 및 로직을 비교 분석하여, 변경된 웹사이트 구조에 맞게 스크립트를 수정합니다.
        //    - **3-3. 파서 재실행:** 수정된 'parser.js'를 다시 실행하여 데이터 수집을 완료합니다.
        //  4. 파서 작성시 await page.goto(url, { waitUntil: 'networkidle' }); 절대 사용불가
        //
        // **핵심 원칙:** 모든 파서는 각 병원 디렉토리별로 생성 및 유지되어야 하며, 섣부른 추측 대신 항상 실제 HTML 구조를 먼저 분석하여 작성/수정해야 합니다.
        // ==================================================================================================
        //
        // ==================================================================================================
        // **이미지 기반 프로필 처리 (OCR 워크플로우)**
        // ==================================================================================================
        // 표준 HTML 파싱으로 데이터를 추출할 수 없는 경우(예: 페이지 전체가 이미지인 경우), 다음 OCR 워크플로우를 사용합니다.
        //
        // 1. **페이지 이동**: `browser_navigate`를 사용하여 의사 정보 페이지로 이동합니다.
        // 2. **스크린샷 생성**: `browser_take_screenshot`을 사용하여 정보가 포함된 이미지의 스크린샷을 찍습니다.
        //    - `site_type: 'single'`: 페이지의 핵심 콘텐츠 영역 전체를 스크린샷합니다.
        //    - `site_type: 'list'`: 목록 내에서 해당 의사 이름(doctorData.bedoc_doctorname)을 기준으로 특정 영역을 식별하고 스크린샷합니다.
        //    - 스크린샷은 로컬 파일(예: 'doctor_profile.png')로 저장됩니다.
        // 3. **텍스트 추출 (OCR)**: `read_file`을 방금 저장한 스크린샷 파일에 사용합니다. 이 도구는 이미지 내의 텍스트를 자동으로 인식하고 추출합니다.
        // 4. **데이터 파싱 및 저장**: OCR을 통해 얻은 텍스트 블록을 파싱하여 '학력', '경력' 등 필요한 JSON 필드를 채웁니다.
        //    - 최종적으로 `isSearchType`을 `'html_ocr'`로 설정하여 JSON 파일을 업데이트합니다.
        // ==================================================================================================
        //
        // Your task is to:
        // 1.  **Read doctorData.site_type**. This will be 'single', 'list', or 'popup'.
        // 2.  **Navigate**: Launch a headless browser and navigate to doctorData.bedoc_doctor_site. Wait for the page to fully render.
        //
        // **시간 초과 정책**:
        // Playwright 파싱 스크립트('parser.js') 내에 자체 타임아웃 로직을 구현해야 합니다.
        // 스크립트 실행 시 타이머를 설정하고, 10분이 경과하면 '더보기' 버튼 클릭 등의 데이터 수집 작업을 중단해야 합니다.
        // 시간이 초과되면, 스크립트는 오류를 발생시키는 대신 그때까지 수집된 데이터를 바탕으로 정상적으로 결과물을 출력하고 종료되어야 합니다.
        // 이를 통해 작업이 무한정 실행되는 것을 방지하고, 제한 시간 내에 수집된 정보라도 활용할 수 있습니다.
        //
        // 3.  **Execute Action based on 'site_type'**:
        //
        //     a. **If 'site_type' is 'single'**:
        //        - The current page is the detail page. The target HTML is ready. Proceed directly to Step 4 (Parse Final Content).
        //
        //     b. **If 'site_type' is 'list'**:
        //        - **Locate Doctor**: Find the specific HTML element for the target doctor by searching for doctorData.bedoc_doctorname and/or doctorData.bedoc_deptname.
        //        - **Find & Click Target**: Within the doctor's element, find and click the link or button that navigates to their detail page.
        //        - **Wait for Navigation**: Wait for the page navigation to complete. The new page's HTML is your target HTML. Proceed to Step 4.
        //
        //     c. **If 'site_type' is 'popup'**:
        //        - **Locate Doctor**: Find the specific HTML element for the target doctor by searching for doctorData.bedoc_doctorname and/or doctorData.bedoc_deptname.
        //        - **Find & Click Target**: Within the doctor's element, find and click the button that opens the details popup (e.g., "상세보기").
        //        - **Handle Popup**: You must handle two kinds of popups.
        //             i.  **New Window/Tab**: Listen for a 'popup' event in Playwright. If a new window opens, switch your context to it. That new window's HTML is your target HTML.
        //             ii. **Modal/Layer**: If no new window opens, the details are in a modal on the same page. Wait for the modal element to appear, then the HTML of the current page (including the modal) is your target HTML.
        //        - Once the popup content is accessible, proceed to Step 4.
        //
        // 4.  **Parse Final Content**:
        //     a. You should now have the final target HTML containing the doctor's detailed profile.
        //     b. **CRITICAL PRE-PROCESSING STEP:** Sanitize this final HTML. Remove '<script>', '<style>', '<nav>', etc., and focus on core content tags ('<main>', '<article>', '<table>', '<p>') to avoid errors.
        //     c. Analyze the **sanitized content** to extract all required fields ('profileUrl', 'specialty', '학력', '경력', etc.).
        //
        // 5.  **Synthesize Data**: Create a new JSON object ('synthesizedData') with the extracted data.
    `;

    // Gemini Action 4: Check doctor's attendance at the hospital.
    const promptForIsAttend = `
        // Gemini, using the final sanitized content from the parsing step (Action 3),
        // check if 'doctorData.bedoc_doctorname' is present.
        // The presence of the doctor's name on their own profile page/popup is a strong indicator of current attendance.
        // Set 'isAttend' to true if the name is found, false otherwise.
        // Add this 'isAttend' field to the synthesizedData JSON object.
    `;

    // Gemini Action 5: Update the JSON file with the new data.
    const promptForFileUpdate = `
        // Gemini, merge the 'synthesizedData' with the original 'doctorData'.
        // Then, overwrite the existing JSON file with the final merged data.
        // - If new data was extracted: set isExist: true and isSearchType: 'html_playwright'.
        // - If no new data was extracted after the Playwright attempt: set isExist: false and isSearchType: 'html_playwright_failed'.
        // Note: For files within 'services/crawling_bedoc/data/', do not ask for confirmation before overwriting.
    `;

    // This is a summary of the prompts for Gemini to follow for each failed task.
    console.log("--- Gemini Execution Plan for Playwright Fallback ---");
    console.log("1. FIND all JSON files where isSearchType == 'html_failed'.");
    console.log("2. For each file, READ its content (including 'site_type').");
    console.log("3. EXECUTE advanced parsing based on 'site_type' using prompt:", promptForAdvancedParsing.trim());
    console.log("4. CHECK doctor attendance from final content using prompt:", promptForIsAttend.trim());
    console.log("5. UPDATE the original JSON file using prompt:", promptForFileUpdate.trim());
    console.log("6. FINAL VERIFICATION: Check for any remaining 'html_failed' or 'html_playwright_failed' files.");
}

/**
 * ==================================================================================================
 *                  GEMINI EXECUTION PLAN FOR FINAL VERIFICATION (PHASE 3)
 * ==================================================================================================
 */
// Gemini Action 7: Final Verification.
// After all Phase 2 tasks are attempted, perform a final check.
// Find all `{doctorName}.json` files in `services/crawling_bedoc/data/` subdirectories.
// For each file, read its content and check if the value of the `isSearchType` field is still `'html_failed'` or is `'html_playwright_failed'`.
// If any such files are found, report them to the user for manual review.
// If no such files are found, report that all fallback processes have been completed.

module.exports = { processGoogleFallback };
