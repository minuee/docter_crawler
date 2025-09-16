/**
 * @file find_fallback_processor.js
 * @description This file serves as a guide for the Gemini assistant.
 * It outlines the procedure for finding doctor profile URLs and summarizes the debugging process.
 */

/**
 * ==================================================================================================
 *                      CURRENT TASK: FINDING DOCTOR PROFILE URLs (Naver Search)
 * ==================================================================================================
 *
 * **Goal:** For a given list of doctors, find their specific profile URL using Naver search
 *           and save the collected information to a JSON file.
 *           이 과정의 대상은 `foundProfileUrl` 파라미터가 없는 `doctorname.json` 파일입니다.
 *
 * **Current Status:** This process has been successfully established and tested on a batch of 5 doctors.
 *                 The next step is to apply this process to the rest of the doctors in the database.
 *
 * **Established Workflow:**
 *
 * 1.  **API Call to get Doctor List & Initial Data Save:**
 *     - The `find-detailurl` API in `services/crawling_bedoc/route.js` is called.
 *     - This API queries the database (`select_bedoc_hospital_detaill`) for a batch of doctors.
 *     - **Crucially, it first saves the complete `doctorData` for each doctor to `services/crawling_bedoc/data_detail/{hid}/{doctorname}.json`.**
 *
 * 2.  **Fetch Naver Search HTML & Extract Links:**
 *     - For each doctor, a search query is constructed: `"${deptname}" "${doctorname}"`. (Hospital name excluded for broader results).
 *     - The `naver_search.js` script (which internally uses Playwright) is called to fetch the raw HTML of the Naver search results page.
 *     - The raw HTML is saved to `services/crawling_bedoc/data_detail/{hid}/{doctorname}.html`.
 *     - Additionally, `naver_search.js` extracts `href` and `text` from `<a>` tags within the relevant HTML section using `cheerio`, and this structured link data is saved to `services/crawling_bedoc/data/{hid}/{doctorname}_links.json`.
 *
 * 3.  **AI-based Link Analysis and URL Extraction:**
 *     - The AI (Gemini) primarily reads the saved `{doctorname}_links.json` file for efficient analysis.
 *     - If needed for deeper analysis or debugging, the AI can refer to the raw `{doctorname}.html` file.
 *     - The AI analyzes the extracted link data to identify the most relevant doctor profile URL.
 *     - This has proven effective with Naver's search results.
 *
 * 4.  **Update JSON with Found URL & Extracted Details:**
 *     - The AI reads the corresponding `.json` file that was saved in step 1.
 *     - It adds a new key, `foundProfileUrl`, with the extracted URL to the JSON object.
 *     - Additionally, it extracts `findHospitalName` and `findDeptname` from the `foundProfileUrl` content.
 *     - If extraction of these details is successful, they are added to the JSON. Otherwise, `baseName` and `deptname` from the original `doctorData` are used as fallbacks.
 *     - The AI then overwrites the `.json` file with the updated data.
 *
 * **AI Parsing Guidelines:**
 * When analyzing the Naver search result HTML, the AI must follow these rules:
 * 1.  **Prioritize Official Profiles:** The top priority is to find search results with titles like "강인수 교수" (Professor Kang In-soo) or "강인수 의사" (Doctor Kang In-soo) that introduce a homepage. These are most likely to be official profiles.
 * 2.  **Exclude Irrelevant Content:** Results from news articles, blogs, online cafes (e.g., Naver Cafe), images, or Q&A sites (like 지식iN) should be ignored.
 * 3.  **Focus on Website Links:** Only consider `http` or `https` links as potential candidates.
 * 4.  **Use Context as a Tie-Breaker:** If multiple potential profile URLs are found, use the `hospital_name` and `doctor_url` from the original `doctorData` as reference points to select the single best match.
 * 5.  병원 홈페이지 URL 내에서 `/doctor`, `/staff`, `/의료진소개`와 같은 특정 경로를 포함하는 링크를 우선적으로 고려합니다.
 * 6.  병원 도메인 내에서 뉴스 기사 등 프로필이 아닌 링크가 발견된 경우, 해당 도메인이 병원 웹사이트인지 확인하고 `site:도메인 의사명 진료과 교수 OR 의사 OR 프로필` 형식으로 Google 검색을 통해 상세 프로필 페이지를 추가로 탐색합니다.
 * 7.  프로필 URL을 찾기 어렵거나 실패한 경우, `foundProfileUrl` 값을 `'notFound'`로 업데이트합니다.
 *
 * ==================================================================================================
 *                      DEBUGGING HISTORY & LESSONS LEARNED
 * ==================================================================================================
 *
 * **Initial Problem:** Reliably finding doctor profile URLs.
 *
 * **Attempt 1 & 2 (Failed):** `google_web_search` tool and `playwright_parser.js` were attempted and failed due to reasons outlined in previous versions of this document (unusable links, timeouts, navigation errors).
 *
 * **Attempt 3 (Failed): `google_search.js` with Google Search**
 * - **Method:** Used `axios` to scrape Google search results.
 * - **Issue:** Google's bot detection blocked the requests, returning a Javascript challenge page instead of actual search results.
 * - **Lesson:** Direct scraping of Google is not a viable strategy.
 *
 * **Attempt 4 (Successful): `naver_search.js` with Naver Search (Initial)**
 * - **Method:** Switched to Naver search using `naver_search.js` (previously `google_search.js` in documentation).
 * - **Result:** Successfully retrieved HTML, but often contained "no results" messages or irrelevant content.
 * - **Lesson:** Naver's bot detection or specific search query issues were still present.
 *
 * **Problem Solved 1: Incorrect Search Query (Too Specific)**
 * - **Issue:** Initial Naver search queries included `baseName` (hospital name), making the query too specific and often yielding no results or irrelevant ones.
 * - **Fix:** The `searchQuery` in `services/crawling_bedoc/route.js` was corrected to exclude `"${baseName}"`, focusing only on `"${deptname}" "${doctorname}"`.
 *
 * **Problem Solved 2: Playwright Optimization & Bot Detection Evasion**
 * - **Issue:** Even with a refined search query, `naver_search.js` was still returning "no results" pages or truncated HTML, suggesting ongoing bot detection or inefficient page loading.
 * - **Fix 1 (Page Load Strategy):** In `services/crawling_bedoc/naver_search.js`, `waitUntil` option for `page.goto` was changed from `networkidle` to `domcontentloaded` to speed up page loading and reduce bot detection time. `waitForTimeout(10000)` was removed.
 * - **Fix 2 (User Agent):** A standard Chrome user agent (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`) was added to `playwright`'s `newPage` options in `naver_search.js` to make requests appear more like a regular browser.
 * - **Fix 3 (Targeted HTML Fetch):** To improve parsing efficiency and focus on relevant content, `naver_search.js` was modified to fetch only the `innerHTML` of the `<div id="content" class="pack_group">` element using `page.$eval('#content.pack_group', element => element.innerHTML)`. This significantly reduces the amount of HTML to process.
 *
 * **Problem Solved 3: Multi-page Search Capability**
 * - **Issue:** `naver_search.js` was always fetching only the first page of search results (`start=1`), even if relevant results were on subsequent pages.
 * - **Fix:** The `getNaverHtml` function in `services/crawling_bedoc/naver_search.js` was updated to accept a `page` parameter, allowing it to calculate the correct `start` value for Naver's pagination (`start = (page - 1) * 15 + 1`).
 * - **Current Status:** `route.js` is currently configured to explicitly request `page=2` for testing purposes. This needs to be adjusted for full multi-page crawling if necessary.
 *
 * 
 * 의사명.json 샘플
 * {
  "rid_long" : "fdfdddfdd.......dddddddd" //의사 ID
  "hid": "H31KR-11000016", //병원 ID
  "baseName": "(의)성광의료재단 차여성의원", //병원명
  "deptname": "산부인과", //진료과목명 
  "doctorname": "윤태기", //의사명 
  "doctor_url": "https://seoul.chamc.co.kr/reservation/reserve.aspx?menuCode=3455&deptname=산부인과&doctorName=윤태기", //의사 주소 참고용
  "foundProfileUrl": "https://seoul.chamc.co.kr/professor/professor.cha?idx=257", //수집된 의사상세 url
  "findHospitalName": "(의)성광의료재단 차여성의원",  //수집된 의사상세 url 기준 병원명 
  "findDeptname": "산부인과" //수집된 의사상세 url 기준 진료과목명 
 * 
 */