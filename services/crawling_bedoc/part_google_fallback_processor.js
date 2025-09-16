// This script is a guide for the Gemini assistant to perform the automated, multi-phase parsing process.
// It codifies the logic for handling the single, stateful JSON file for each doctor.

const fs = require('fs');
const path = require('path');

/**
 * this is a sample of the doctorData object
 {
  "aiga_hid": "H11KR-11000002",
  "hospital_name": "분당서울대학교병원",
  "bedoc_deptname": "신경과",
  "bedoc_doctorname": "김지수",
  "hospital_site": "https://www.snubh.org/medical/drIntroduce.do?DP_CD=NR&sDrSid=1000245",
  "site_enable": "OK",
  "alright": "OK",
  "is_access_ok": "1",
  "isExist": true,
  "isSearchType": "html",
  "error": null,
  "doctorDetailUrl": "https://www.snubh.org/medical/drIntroduce.do?DP_CD=NR&sDrSid=1000245",
  "profileUrl": null,
  "specialty": "어지럼증, 눈운동질환, 복시",
  "학력": [
    { "date": "~ 2003", "content": "서울대학교 의과대학 박사" },
    { "date": "~ 1997", "content": "서울대학교 의과대학 석사" },
    { "date": "~ 1992", "content": "서울대학교 의과대학 학사" }
  ],
  "경력": [
    { "date": "2013 ~ 2020", "content": "분당서울대학교병원 신경과 교수" },
    { "date": "2008 ~ 2013", "content": "분당서울대학교병원 신경과 부교수" },
    { "date": "2004 ~ 2008", "content": "분당서울대학교병원 신경과 조교수" },
    { "date": "2003 ~ 2004", "content": "분당서울대학교병원 신경과 전임의" },
    { "date": "1993 ~ 1997", "content": "분당서울대학교병원 신경과 전공의" },
    { "date": "1992 ~ 1993", "content": "분당서울대학교병원 인턴" }
  ],
  "수상": [
    { "date": "2019", "content": "불곡의학상 장려상 - 서울의대/분당서울대학교병원" },
    { "date": "2019", "content": "뉴로프런티어 학술상 - 대한신경과학회" },
    { "date": "2018", "content": "이원상 평형의학상 - 대한평형의학회" }
  ],
  "학술": [
    { "date": "2019 ~ 2021", "content": "대한안신경의학회 회장" },
    { "date": "2017 ~ 2019", "content": "대한안신경의학회 부회장" },
    { "date": "2015 ~ 2017", "content": "대한평형의학회 회장" }
  ],
  "언론": [
    { "targetDate": "2023.02.10", "type": "방송", "text": "EBS 명의 '내가 어지러운 진짜 이유는?'", "url": null, "issuer": "EBS" },
    { "targetDate": "2025.02.25", "type": "기사", "text": "옥스퍼드대 어지럼증 교과서 집필", "url": null, "issuer": "주간조선" }
  ],
  "저서": [
    { "date": "2017", "content": "간략형 전정재활치료와 맞춤전정운동 (푸른솔)" },
    { "date": "2014", "content": "신경안과증례집 (E*Public)" },
    { "date": "2010", "content": "어지럼과 이명. 그림으로 보다. (푸른솔)" }
  ],
  "논문": [
    "Kim JS, Zee D. Clinical Practice. Benign Paroxysmal Positional Vertigo. N Engl J Med 2014 370(12):1138-47.",
    "Choi JY, Kim JH, Kim HJ, Glasauer S, Kim JS. Central Paroxysmal Positional Nystagmus: Characteristics and Possible Mechanisms. Neurology 84(22), 2238-2246.",
    "Huh Y, Kim JS. Patterns of spontaneous and head-shaking nystagmus in cerebellar infarction: Imaging correlations. Brain 2011;134(Pt 12):3659-3668."
  ],
  "isAttend": true
}
 */

/**
 * ==================================================================================================
 *                                    OVERALL WORKFLOW
 * ==================================================================================================
 *
 * 1.  **Phase 1: Initial Parsing (Initiated via API Call)**
 *     - An external system calls the `/v1/c/crawling_bedoc/collect2` API endpoint.
 *     - This triggers `gemini_parser.js` to perform a fast, Cheerio-based parse attempt on each doctor's profile page.
 *     - SUCCESS: Writes a JSON file with `isSearchType: 'html'` and all extracted data. The process ends here for this doctor.
 *     - FAILURE: Writes a JSON file with `isSearchType: 'html_failed'`, queuing it for the enhanced fallback process.
 *
 * 2.  **Phase 2: Enhanced Fallback Processing (Orchestrated by the Gemini Assistant)**
 *     - After Phase 1, Gemini finds all JSON files marked as `html_failed`.
 *     - For each file, Gemini executes a robust, multi-step fallback strategy to ensure data is captured even from difficult sites.
 *     - This process is detailed in the "GEMINI EXECUTION PLAN FOR ENHANCED FALLBACK" section below.
 *
 * 3.  **Phase 3: Final Verification**
 *     - After all fallbacks are attempted, Gemini performs a final check for any remaining `html_failed` files and reports the results.
 *
 */

/**
 * ==================================================================================================
 *                  GEMINI EXECUTION PLAN FOR ENHANCED FALLBACK (PHASE 2)
 * ==================================================================================================
 */
function processEnhancedFallback() {

    // Gemini Action 1: Find all tasks.
    // Find all `{doctorName}.json` files and filter to find where `isSearchType` is `html_failed`.
    const promptForFindingTasks = `
        // Gemini, please find all *.json files in the services/crawling_bedoc/data/ subdirectories.
        // IMPORTANT: Exclude files ending with _saved.json.
        // For each file, read its content and check if the value of the isSearchType field is 'html_failed'.
        // Create a list of file paths for all files that match this condition.
    `;

    // For each task file found, perform the following multi-step parsing attempts:

    // Gemini Action 2: Read the file to get the doctorData for the current task.
    // const doctorData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

    // Gemini Action 3, Step 1: Attempt Direct Fetch (web_fetch).
    // This is a fast attempt for static HTML sites.
    const promptForWebFetch = `
        // Gemini, use the web_fetch tool on doctorData.hospital_site.
        // If you successfully extract the required data (specialty, education, career, etc.),
        // update the JSON file with the new data, set isSearchType to 'html', and isExist to true.
        // Then, stop and move to the next doctor.
    `;

    // Gemini Action 3, Step 2: Attempt Dynamic Rendering (Playwright) if Step 1 fails.
    // This handles sites that rely on JavaScript to render content.
    const promptForPlaywright = `
        // Gemini, since web_fetch failed, the site is likely dynamic.
        // Use the playwright library to launch a headless browser, navigate to doctorData.hospital_site,
        // and wait for the page to fully render (e.g., waitUntil: 'networkidle').
        // Extract the complete HTML content after JavaScript execution.
        // Analyze this HTML to find the required data.
        // If successful, update the JSON file, set isSearchType to 'html_playwright', and isExist to true.
        // Then, stop and move to the next doctor.
        // EXCEPTION HANDLING: If analyzing the extracted HTML causes a token limit error due to its large size, abandon this step and proceed directly to the Google Search fallback (Step 3).
    `;

    // Gemini Action 3, Step 3: Use Google Search as the Final Fallback.
    // This is the last resort when direct parsing is not possible.
    const promptForGoogleSearch = `
        // Gemini, use the google_web_search tool as a fallback.
        // This step is triggered if:
        // 1. Direct fetch (Step 1) failed, AND
        // 2. Playwright (Step 2) also failed to extract data OR resulted in a token limit error due to excessively large HTML content.
        //
        // Construct the query: {doctorData.hospital_name} {doctorData.bedoc_doctorname} {doctorData.bedoc_deptname} 최신 프로필 경력 학력 사진 수상 학술 학회 언론 저서 논문.
        // Synthesize the final JSON from the search results, following the detailed synthesis prompt.
    `;

    // Gemini Action 4: Synthesize the final JSON (used for Google Search results).
    const promptForSynthesis = `
        // Gemini, please analyze the Google Search results to find the doctor's profile.
        //
        // **Data Synthesis Rule**: Create the most complete profile possible by merging information from all available sources.
        // 1. Start with the useful data from the original doctorData object.
        // 2. Add any partial data that may have been collected from the web_fetch or Playwright steps (e.g., a list of publications from a university page).
        // 3. Overwrite or supplement with the more accurate and complete data found via Google Search (e.g., current career info, specialty).
        // 4. Ensure all required fields from the sample JSON are present, even if empty ([] or null).
        //
        // IMPORTANT: Ensure all extracted text content is properly formatted to prevent JSON parsing issues, especially by handling double quotes.
        //
        // Extract the following fields:
        // - `doctorDetailUrl`: The specific detail page URL for the doctor. This field must NEVER be null.
        // - `profileUrl`: The URL of a profile picture.
        // - `specialty`: A single string with values separated by commas.
        // - `학력`, `경력`, `수상`, `학술`, `언론`, `저서`: Arrays of objects with the specified structure.
        // - `논문`: An array of strings.
        // - `searchHospitalName`, `searchHospitalAddress`, `isSameHospital`, `found_hospital_aiga_hid`: As per the original logic.
    `;

    // Gemini Action 5: Check doctor's attendance at the hospital.
    const promptForIsAttend = `
        // Gemini, using the 'doctorDetailUrl' from the synthesized data,
        // verify if 'doctorData.bedoc_doctorname' and 'doctorData.bedoc_deptname' are present on the page.
        // Set 'isAttend' to true if both are found, false otherwise.
        // Add this 'isAttend' field to the final JSON data.
    `;

    // Gemini Action 6: Update the JSON file with the new data.
    const promptForFileUpdate = `
        // Gemini, overwrite the existing JSON file with the newly synthesized data.
        // - If data was found (from any step): set isExist: true and update isSearchType to 'html', 'html_playwright', or 'google' based on the successful method.
        // - If no data was found after all attempts: set isExist: false and isSearchType: 'google_failed'.
        // Note: For files within 'services/crawling_bedoc/data/', do not ask for confirmation before overwriting.
    `

    // This is a summary of the prompts for Gemini to follow for each failed task.
    console.log("--- Gemini Execution Plan for Enhanced Fallback ---");
    console.log("1. FIND all JSON files where isSearchType == 'html_failed'.");
    console.log("2. For each file, READ its content.");
    console.log("3. ATTEMPT PARSING in the following order:");
    console.log("   a. Direct Fetch (web_fetch)");
    console.log("   b. Dynamic Rendering (Playwright)");
    console.log("   c. Google Search (Final Fallback)");
    console.log("4. SYNTHESIZE final JSON object if required (from Google Search).");
    console.log("5. CHECK doctor attendance.");
    console.log("6. UPDATE the original JSON file with the result.");
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
// If `doctorDetailUrl` is null, generate it using `doctorData.hospital_site` as the base.
// If any files are found with `isSearchType: 'html_failed'`, report them to the user.
// If no such files are found, report that all 'html_failed' files have been processed.

module.exports = { processGoogleFallback };