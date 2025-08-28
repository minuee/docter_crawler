// This script is a guide for the Gemini assistant to perform the automated, multi-phase parsing process.
// It codifies the logic for handling the single, stateful JSON file for each doctor.

const fs = require('fs');
const path = require('path');

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
        // const query = outes$outes{doctorData.hospital_name} outes$outes{doctorData.bedoc_doctorname} outes$outes{doctorData.bedoc_deptname} outes$outes{doctorData.hospital_addr} 프로필 경력 학력 사진 수상 학술 언론 저서 논문outes`;
        // Then, execute the google_web_search tool with this query.
    `;

    // Gemini Action 4: Synthesize the final JSON from the original data and Google results.
    const promptForSynthesis = `
        // Gemini, please analyze the Google Search results to find the doctor's profile.
        // Extract the following fields:
        // - `doctorDetailUrl`: The specific detail page URL for the doctor. This field must NEVER be null.
        //   - Prioritize finding a `doctorDetailUrl` from Google search results that shares the same domain as `doctorData.hospital_site`.
        //   - If no such specific URL is found, or if the found URL is just the main hospital site (e.g., ending in .kr, .com, .kr/, .com/), use `doctorData.hospital_site` as the base.
        //   - Always append `?deptname=${doctorData.bedoc_deptname}&doctorName=${doctorData.bedoc_doctorname}` to the chosen `doctorDetailUrl`.
        // - `profileUrl`: The URL of a profile picture.
        // - `specialty`: The doctor's specialty.
        // - `학력` (education): An array of objects, each with `date` (YYYY.MM or null) and `content`.
        // - `경력` (experience): An array of objects, each with `date` (YYYY.MM or null) and `content`.
        // - `수상` (awards): An array of objects, each with `date` (YYYY.MM or null) and `content`.
        // - `학술` (academic activities): An array of objects, each with `date` (YYYY.MM or null) and `content`.
        // - `언론` (media coverage): An array of objects, each with `targetDate`, `type`, `text`, `url`, `issuer`.
        // - `저서` (books/writings): An array of objects, each with `targetDate`, `type`, `text`, `url`, `issuer`.
        // - `논문` (theses/papers): An array of strings.
        // - `searchHospitalName`: The name of the hospital found in the Google search results.
        // - `isSameHospital`: Boolean, true if `searchHospitalName` is similar to `doctorData.hospital_name`, false otherwise.
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
}

module.exports = { processGoogleFallback };