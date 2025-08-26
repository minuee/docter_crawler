// This script is a guide for the Gemini assistant to perform the automated, multi-phase parsing process.
// It codifies the logic for handling the single, stateful JSON file for each doctor.

const fs = require('fs');
const path = require('path');

/**
 * ==================================================================================================
 *                                    OVERALL WORKFLOW
 * ==================================================================================================
 *
 * 1.  **Phase 1: On-Site Parsing (Executed by Node.js via the /collect2 API call)**
 *     - The `gemini_parser.js` script attempts to parse the hospital website.
 *     - SUCCESS: It writes `{doctorName}.json` with `isSearchType: 'html'` and all extracted data.
 *     - FAILURE: It writes `{doctorName}.json` with `isSearchType: 'html_failed'` to queue it for Phase 2.
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
        // Gemini, please find all outes*.jsonoutes files in the outesservices/crawling_bedoc/data/outes subdirectories.
        // For each file, read its content and check if the value of the outesisSearchTypeoutes field is outes'html_failed'outes.
        // Create a list of file paths for all files that match this condition.
    `;

    // For each task file found, perform the following actions:

    // Gemini Action 2: Read the file to get the original doctorData.
    // const doctorData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

    // Gemini Action 3: Construct the Google Search query and execute it.
    const promptForGoogleSearch = `
        // Gemini, please construct the search query using the doctorData variables.
        // const query = outes$outes{doctorData.hospital_name} outes$outes{doctorData.bedoc_doctorname} outes$outes{doctorData.bedoc_deptname} 프로필 경력 학력 사진outes`;
        // Then, execute the google_web_search tool with this query.
    `;

    // Gemini Action 4: Synthesize the final JSON from the original data and Google results.
    const promptForSynthesis = `
        // Gemini, please analyze the Google Search results to find the doctor's profile.
        // Extract education, experience, specialty, and the URL of a profile picture (profileUrl).
        // Look for publications/theses under keywords like "논문", "발표자료", "연구업적" and add them to the 'thesis' array.
        // Combine this with any useful data from the original doctorData object.
        // For the 'doctorSiteUrl', if a specific detail page URL is found, use it.
        // If not, construct a URL by appending `?depthname=${department}&doctorName=${doctorName}` to the main 'hospital_site' URL.
        // Create the final JSON object.
    `;

    // Gemini Action 5: Update the JSON file with the new data.
    const promptForFileUpdate = `
        // Gemini, overwrite the existing JSON file with the newly synthesized data.
        // - If data was found: set outesisExist: trueoutes and outesisSearchType: 'google'outes.
        // - If no data was found after the search: set outesisExist: falseoutes and outesisSearchType: 'google'outes.
    `;

    // This is a summary of the prompts for Gemini to follow for each failed task.
    console.log("--- Gemini Execution Plan for Google Fallback ---");
    console.log("1. FIND all JSON files where isSearchType == 'html_failed'.");
    console.log("2. For each file, READ its content.");
    console.log("3. GOOGLE SEARCH using prompt:", promptForGoogleSearch.trim());
    console.log("4. SYNTHESIZE final JSON object using prompt:", promptForSynthesis.trim());
    console.log("5. UPDATE the original JSON file using prompt:", promptForFileUpdate.trim());
}

module.exports = { processGoogleFallback };