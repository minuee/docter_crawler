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
    { "date": "2002 ~ 2004", "content": "의정부성모병원 외과 전임강사" },
    { "date": "2004 ~ 2010", "content": "의정부성모병원 외과 조교수" },
    { "date": "2010 ~ 2017", "content": "의정부성모병원 외과 부교수" },
    { "date": "2015", "content": "의정부성모병원 외과 임상과장" },
    { "date": "2017 ~ 현재", "content": "의정부성모병원 외과 교수" },
    { "date": "2007", "content": "Univ. of Pittsburgh (방문 또는 연수 추정)" }
  ],
  "수상": [
    { "date": "2025.02.20", "content": "로봇수술 700례 달성" },
    { "date": null, "content": "경기 동북부 병원 최초 간이식 성공" }
  ],
  "학술": [
    { "date": "2021 ~ 현재", "content": "한국 간담췌외과학회 경인지회 회장" },
    { "date": null, "content": "대한중환자의학회 정회원" },
    { "date": null, "content": "대한임상종양학회 평생회원" },
    { "date": null, "content": "대한이식학회 정회원" },
    { "date": null, "content": "한국간담췌외과학회 평생회원" },
    { "date": null, "content": "분자생물학회 정회원" },
    { "date": null, "content": "대한내시경복강경외과학회 평생회원" },
    { "date": null, "content": "대한외과학회 평생회원" }
  ],
  "언론": [
    { "targetDate": "2025.02.20", "type": "기사", "text": "병원신문에 로봇수술 700례 달성 관련 기사 보도", "url": null, "issuer": "병원신문" },
    { "targetDate": null, "type": "유튜브", "text": "로봇수술 어떻게 활용되고 있을까? (가톨릭대학교 의정부성모병원)", "url": null, "issuer": "가톨릭대학교 의정부성모병원" },
    { "targetDate": null, "type": "기사", "text": "의정부성모병원 외과, 단일공 복강경수술 1000례 돌파 관련 기사", "url": null, "issuer": null }
  ],
  "저서": [],
  "논문": [
    "Robotic surgery enables safe and comfortable single-incision cholecystectomy: A comparison of robotic and laparoscopic approaches for single-incision surgery (JOURNAL OF MINIMAL ACCESS SURGERY, 2020년 9월, 공동저자)",
    "Serum level of visfatin can reflect the severity of inflammation in patients with acute cholecystitis (ANNALS OF SURGICAL TREATMENT AND RESEARCH, 2020년 7월, 공동저자)",
    "Greater Saphenous Vein Graft Revascularization of the Left Hepatic Artery after Resection of Intrahepatic Cholangiocarcinoma with Common Hepatic Artery Resection (ARCHIVES OF HAND AND MICROSURGERY, 2020년 6월, 공동저자)",
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
 * 2.  **Phase 2: Google Search Fallback (Orchestrated by the Gemini Assistant)**
 *     - After Phase 1 is complete, Gemini finds all JSON files where `isSearchType` is `html_failed`.
 *     - For each file, Gemini follows the "Gemini Execution Plan for Google Fallback" described below.
 *
 */

/**
 * ==================================================================================================
 *                  GEMINI EXECUTION PLAN FOR GOOGLE FALLBACK (PHASE 2)
 * ==================================================================================================
 */
function processGoogleFallback() {

    // Gemini Action 1: Find all tasks.
    // Find all `{doctorName}.json` files and filter them to find where `isSearchType` is `html_failed`.
    const promptForFindingTasks = `
        // Gemini, please find all outes*.jsonoutes files in the outesservices/crawling_bedoc/data/outes subdirectories.
        // IMPORTANT: Exclude files ending with outes_saved.jsonoutes, as these are already processed.
        // For each file, read its content and check if the value of the outesisSearchTypeoutes field is outes'html_failed'outes.
        // Create a list of file paths for all files that match this condition.
    `;

    // For each task file found, perform the following actions:

    // Gemini Action 2: Read the file to get the original doctorData.
    // const doctorData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

    // Gemini Action 3: Construct the Google Search query and execute it.
    const promptForGoogleSearch = `
        // Gemini, please construct the search query using the doctorData variables.
        // const query = outes$outes{doctorData.hospital_name} outes$outes{doctorData.bedoc_doctorname} outes$outes{doctorData.bedoc_deptname} outes$outes{doctorData.hospital_addr} 최신 프로필 경력 학력 사진 수상 학술 언론 저서 논문outes`;
        // Then, execute the google_web_search tool with this query.
    `;

    // Gemini Action 4: Synthesize the final JSON from the original data and Google results.
    const promptForSynthesis = `
        // Gemini, please analyze the Google Search results to find the doctor's profile.
        // Extract the following fields:
        // - `doctorDetailUrl`: The specific detail page URL for the doctor. This field must NEVER be null.
        //   - Prioritize finding a `doctorDetailUrl` from Google search results that shares the same domain as `doctorData.hospital_site`.
        //   - If no such specific URL is found, or if the found URL is just the main hospital site (e.g., ending in .kr, .com, .kr/, .com/), use `doctorData.hospital_site` as the base.
        //   - CRITICAL MANDATORY RULE: Always append the query string `?deptname=${doctorData.bedoc_deptname}&doctorName=${doctorData.bedoc_doctorname}` to the chosen `doctorDetailUrl`. The final URL must always include these parameters.
        // - `profileUrl`: The URL of a profile picture.
        // - `specialty`: The doctor's specialty. IMPORTANT: This must be a single string with values separated by commas (e.g., "Cardiology,Internal Medicine"). It must NOT be a JSON array.
        // - `학력`: An array of objects, each with `date` (YYYY.MM or null) and `content`.
        // - `경력`: An array of objects, each with `date` (YYYY.MM or null) and `content`.
        // - `수상`: An array of objects, each with `date` (YYYY.MM or null) and `content`.
        // - `학술`: An array of objects, each with `date` (YYYY.MM or null) and `content`.
        // - `언론`: An array of objects, each with `targetDate`, `type`, `text`, `url`, `issuer`.
        // - `저서`: An array of objects, each with `targetDate`, `type`, `text`, `url`, `issuer`.
        // - `논문`: An array of strings.
        // IMPORTANT: All the above fields (`학력` through `논문`) must use their Korean names as JSON keys.
        // - `searchHospitalName`: The name of the hospital found in the Google search results.
        // - `searchHospitalAddress`: The address of the hospital found in the Google search results.
        // - `isSameHospital`: Boolean, true if `searchHospitalName` is similar to `doctorData.hospital_name`, false otherwise.
        //
        // Determine `found_hospital_aiga_hid`:
        // - If `isSameHospital` is true, set `found_hospital_aiga_hid` to `doctorData.aiga_hid`.
        // - If `isSameHospital` is false, use `controller.getNewHospitalID(synthesizedData.searchHospitalName, synthesizedData.searchHospitalAddress)` to find the new hospital's AIGA ID.
        //   - If `getNewHospitalID` returns a valid ID, set `found_hospital_aiga_hid` to that ID.
        //   - Otherwise (if `getNewHospitalID` fails or returns no ID), set `found_hospital_aiga_hid` to `doctorData.aiga_hid`.
        //
        // Combine this with any useful data from the original doctorData object.
        // Create the final JSON object.
    `;

    // Gemini Action 5: Check doctor's attendance at the hospital.
    const promptForIsAttend = `
        // Gemini, using the 'doctorDetailUrl' (or 'profileUrl' if 'doctorDetailUrl' is null) from the synthesized data,
        // read the content of that URL.
        // Then, check if 'doctorData.bedoc_deptname' and 'doctorData.bedoc_doctorname' are present in the page content.
        // Set 'isAttend' to true if both are found, false otherwise.
        // Add this 'isAttend' field to the synthesized JSON data.
    `;

    // Gemini Action 6: Update the JSON file with the new data.
    const promptForFileUpdate = `
        // Gemini, overwrite the existing JSON file with the newly synthesized data.
        // - If data was found: set outesisExist: trueoutes and outesisSearchType: 'google'outes.
        // - If no data was found after the search: set outesisExist: falseoutes and outesisSearchType: 'google'outes.
        // Note: For files within 'services/crawling_bedoc/data/', do not ask for confirmation before overwriting. For other files, ask for confirmation.
    `

    // This is a summary of the prompts for Gemini to follow for each failed task.
    console.log("--- Gemini Execution Plan for Google Fallback ---");
    console.log("1. FIND all JSON files where isSearchType == 'html_failed'.");
    console.log("2. For each file, READ its content.");
    console.log("3. GOOGLE SEARCH using prompt:", promptForGoogleSearch.trim());
    console.log("4. SYNTHESIZE final JSON object using prompt:", promptForSynthesis.trim());
    console.log("5. CHECK doctor attendance using prompt:", promptForIsAttend.trim());
    console.log("6. UPDATE the original JSON file using prompt:", promptForFileUpdate.trim());
    console.log("7. FINAL VERIFICATION: Check for any remaining 'html_failed' files.");
}

/**
 * ==================================================================================================
 *                  GEMINI EXECUTION PLAN FOR FINAL VERIFICATION (PHASE 3)
 * ==================================================================================================
 */
// Gemini Action 7: Final Verification.
// After all Phase 2 tasks are attempted, perform a final check.
// Find all `{doctorName}.json` files in `services/crawling_bedoc/data/` subdirectories.
// For each file, read its content and check if the value of the `isSearchType` field is still `'html_failed'`.
// If any files are found with `isSearchType: 'html_failed'`, report them to the user.
// If no such files are found, report that all 'html_failed' files have been processed.

module.exports = { processGoogleFallback };