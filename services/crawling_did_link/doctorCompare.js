const stringSimilarity = require('string-similarity');

// 데이터 정규화 함수 (사용자 제안 기반)
function normalize(entry) {
  if (!entry) return "";
  // 연도 형식 통일 (예: 20082015 -> 2008-2015)
  entry = entry.replace(/(\d{4})(\d{4})/, '$1-$2');
  // 소문자 변환 및 공백 정리
  return entry.toLowerCase().replace(/\s+/g, ' ').trim();
}

// info 필드에서 JSON 구조를 파싱하여 실제 텍스트 "항목 배열"을 추출
function extractInfoEntries(infoStr) {
  if (!infoStr) return []; // Return empty array
  try {
    const parsed = JSON.parse(infoStr);
    if (Array.isArray(parsed)) {
      return parsed.map(item => item.text || "");
    }
  } catch (e) {
    return infoStr.split('\n');
  }
  return [infoStr];
}

// 집합 기반 유사도(Jaccard) 계산 (e.g., 진료 분야)
function setSimilarity(strA, strB) {
  if (!strA || !strB) return { similarity: 0, intersection: new Set() };
  const setA = new Set(strA.split(',').map(s => normalize(s)).filter(s => s));
  const setB = new Set(strB.split(',').map(s => normalize(s)).filter(s => s));

  if (setA.size === 0 || setB.size === 0) {
    return { similarity: 0, intersection: new Set() };
  }

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return { similarity: intersection.size / union.size, intersection };
}

// 학력/경력 항목들을 비교하여 유사도 계산 (사용자 제안 기반)
function compareHistory(infoA, infoB, threshold = 0.6) { // 기준값 0.7 -> 0.6으로 수정
  const rawEntriesA = extractInfoEntries(infoA);
  const rawEntriesB = extractInfoEntries(infoB);

  const entriesA = rawEntriesA.map(s => normalize(s)).filter(s => s);
  const entriesB = rawEntriesB.map(s => normalize(s)).filter(s => s);

  if (entriesA.length === 0 || entriesB.length === 0) {
    return { matchCount: 0, similarity: 0, entriesA, entriesB };
  }

  let matchedBIndices = new Set();
  let matchCount = 0;

  for (const entryA of entriesA) {
    let bestMatch = { score: 0, index: -1 };

    for (let i = 0; i < entriesB.length; i++) {
      if (matchedBIndices.has(i)) continue;

      const currentScore = stringSimilarity.compareTwoStrings(entryA, entriesB[i]);
      if (currentScore > bestMatch.score) {
        bestMatch.score = currentScore;
        bestMatch.index = i;
      }
    }

    if (bestMatch.score >= threshold) {
      matchCount++;
      if (bestMatch.index !== -1) {
        matchedBIndices.add(bestMatch.index);
      }
    }
  }

  const similarity = matchCount / Math.max(entriesA.length, entriesB.length);
  return { matchCount, similarity, entriesA, entriesB };
}


function scoreBreakdown(d1, d2) {
  console.log('\n--- DEBUGGING scoreBreakdown V-FINAL ---');

  const nameMatch = normalize(d1.doctorname) === normalize(d2.doctorname);
  console.log(`1. nameMatch: ${nameMatch}`);

  const deptResult = setSimilarity(d1.deptname, d2.deptname);
  const deptSim = deptResult.similarity;
  console.log(`2. deptSim: ${deptSim}`);

  const specResult = setSimilarity(d1.specialties, d2.specialties);
  const specSim = specResult.similarity;
  console.log(`3. specSim: ${specSim}, Intersection size: ${specResult.intersection.size}`);

  console.log('\n--- Analyzing INFO field (using string-similarity) ---');
  const historyComparison = compareHistory(d1.info, d2.info);
  const infoSim = historyComparison.similarity;
  console.log(`4. infoSim (from compareHistory): ${infoSim}, Match count: ${historyComparison.matchCount}`);
  console.log('History Comparison Details:', JSON.stringify(historyComparison, null, 2));

  let score = 0;
  console.log(`Initial score: ${score}`);

  if (normalize(d1.hospitalname) === normalize(d2.hospitalname) && deptSim === 1) {
    score = 5;
    console.log('Special Rule Applied: hospital & dept match. Score set to 5.');
  } else {
    if (nameMatch) {
      score += 1;
      console.log(`+1 for nameMatch. Current score: ${score}`);
    }
    const deptSimPercent = Math.round(deptSim * 100);
    if (deptSimPercent > 60) {
      score += 1;
      console.log(`+1 for deptSim > 60% (${deptSimPercent}%). Current score: ${score}`);
    }

    console.log('\nScoring Specialties...');
    if (!d1.specialties || normalize(d1.specialties) === '') {
        score += 1;
        console.log('+1 because target specialties is empty.');
    } else {
        const specSimPercent = Math.round(specSim * 100);
        console.log(`specSimPercent: ${specSimPercent}%`);
        if (specSimPercent >= 50) {
            score += 1.5;
            console.log(`+1.5 for specSim >= 50%. Current score: ${score}`);
        } else if (specSimPercent >= 20) {
            score += 1;
            console.log(`+1 for specSim >= 20%. Current score: ${score}`);
        } else {
            console.log('Tiered specSim score is 0. Checking fallback...');
            if (specResult.intersection.size > 0) {
                score += 1;
                console.log(`+1 from fallback (intersection size > 0). Current score: ${score}`);
            }
        }
    }

    console.log('\nScoring Info...');
    if (!d1.info || normalize(d1.info) === '') {
        score += 1;
        console.log('+1 because target info is empty.');
    } else {
        const infoSimPercent = Math.round(infoSim * 100);
        console.log(`infoSimPercent: ${infoSimPercent}%`);
        if (infoSimPercent >= 50) {
            score += 1.5;
            console.log(`+1.5 for infoSim >= 50%. Current score: ${score}`);
        } else if (infoSimPercent >= 20) {
            score += 1;
            console.log(`+1 for infoSim >= 20%. Current score: ${score}`);
        } else {
            console.log('Tiered infoSim score is 0. Checking fallback...');
            if (historyComparison.matchCount > 0) {
                score += 1;
                console.log(`+1 from fallback (matchCount > 0). Current score: ${score}`);
            }
        }
    }
  }
  console.log(`\nFINAL SCORE: ${score}`);
  console.log('--- END DEBUGGING ---\n');

  return {
    score,
    maxScore: 5,
    breakdown: {
      nameMatch,
      deptSim: Number(deptSim.toFixed(3)),
      infoSim: Number(infoSim.toFixed(3)),
      specSim: Number(specSim.toFixed(3)),
      historyComparison,
    },
  };
}

async function findMatchingDoctor(summaryData, summaryData2Array) {
  if (!Array.isArray(summaryData2Array) || summaryData2Array.length === 0) {
    return { result: "not match", matchDoctor: null, score: null };
  }

  const detailed = summaryData2Array.map(cand => ({
      doctor: cand,
      ...scoreBreakdown(summaryData, cand)
  }));

  const matched = detailed.filter(d => d.score >= 4);

  if (matched.length === 0) {
    console.log("\n결과: not match (4점 이상 후보 없음)");
    if (detailed.length > 0) {
      const bestNonMatch = detailed.sort((a,b) => b.score - a.score)[0];
      console.log(`(참고: 최고 점수 후보: ${bestNonMatch.doctor?.hospitalname}:${bestNonMatch.doctor?.doctorname}, 점수: ${bestNonMatch.score.toFixed(2)})`);
    }
    return { result: "not match", matchDoctor: null, score: null };
  }

  const best = matched.sort((a,b) => b.score - a.score)[0];

  console.log(`\n결과: match -> best candidate: ${best.doctor?.hospitalname}:${best.doctor?.doctorname}, score: ${best.score.toFixed(2)}`);
  return { result: "match", matchDoctor: best.doctor, score: best.score, debug: best };
}


module.exports = {
  setSimilarity,
  compareHistory,
  extractInfoEntries,
  findMatchingDoctor,
};
