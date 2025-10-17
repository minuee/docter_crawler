const _ = require('lodash');

function parseInfo(infoString) {
    try {
        const parsed = JSON.parse(infoString);
        // Ensure it's an array, if not, return empty array
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Error parsing info string:", e);
        return [];
    }
}

function compareInfoEntries(entry1, entry2) {
    // Simple comparison for now: check if text and type are similar
    // This can be made more sophisticated later (e.g., fuzzy matching, date parsing)
    const text1 = entry1.text ? entry1.text.replace(/\\n/g, ' ').trim() : '';
    const text2 = entry2.text ? entry2.text.replace(/\\n/g, ' ').trim() : '';

    const type1 = entry1.type ? entry1.type.trim() : '';
    const type2 = entry2.type ? entry2.type.trim() : '';

    // Check for exact text match or significant overlap
    const textMatch = text1.includes(text2) || text2.includes(text1);
    const typeMatch = type1 === type2;

    // More advanced date comparison would go here
    // For now, just check if text and type match
    return textMatch && typeMatch;
}

function analyzeInfoSimilarity(summaryInfo, candidateInfo) {
    const parsedSummaryInfo = parseInfo(summaryInfo);
    const parsedCandidateInfo = parseInfo(candidateInfo);

    if (parsedSummaryInfo.length === 0 || parsedCandidateInfo.length === 0) {
        // If either has no info, similarity is low unless both are empty
        return parsedSummaryInfo.length === 0 && parsedCandidateInfo.length === 0 ? 1 : 0;
    }

    let overlapCount = 0;
    for (const sEntry of parsedSummaryInfo) {
        for (const cEntry of parsedCandidateInfo) {
            if (compareInfoEntries(sEntry, cEntry)) {
                overlapCount++;
                break; // Move to next summary entry once an overlap is found
            }
        }
    }

    // Return a similarity score (e.g., percentage of summaryInfo entries found in candidateInfo)
    return overlapCount / parsedSummaryInfo.length;
}

module.exports = {
    parseInfo,
    analyzeInfoSimilarity
};
