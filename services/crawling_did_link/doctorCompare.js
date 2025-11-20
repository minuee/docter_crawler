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
    return { matchCount: 0, similarity: 0, matchedEntries: [], entriesA, entriesB };
  }

  let matchedBIndices = new Set();
  let matchCount = 0;
  let matchedEntries = [];

  for (const entryA of entriesA) {
    let bestMatch = { score: 0, index: -1, matchedTextB: '' };

    for (let i = 0; i < entriesB.length; i++) {
      if (matchedBIndices.has(i)) continue;

      const currentScore = stringSimilarity.compareTwoStrings(entryA, entriesB[i]);
      if (currentScore > bestMatch.score) {
        bestMatch.score = currentScore;
        bestMatch.index = i;
        bestMatch.matchedTextB = rawEntriesB[i]; // 원본 텍스트 저장
      }
    }

    if (bestMatch.score >= threshold) {
      matchCount++;
      if (bestMatch.index !== -1) {
        matchedBIndices.add(bestMatch.index);
        matchedEntries.push({
          entryA: entryA,
          entryB: bestMatch.matchedTextB,
          score: bestMatch.score
        });
      }
    }
  }

  const similarity = matchCount / Math.max(entriesA.length, entriesB.length);
  return { matchCount, similarity, matchedEntries, entriesA, entriesB };
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

  // 0단계: 동일 병원(hospitalname, hid) 최우선 매칭
  for (const candidate of summaryData2Array) {
    if (normalize(summaryData.hospitalname) === normalize(candidate.hospitalname) &&
        normalize(summaryData.hid) === normalize(candidate.hid)) {
      console.log(`\n결과: match (0단계: 동일 병원/HID 매칭) -> ${candidate?.hospitalname}:${candidate?.doctorname}`);
      return { result: "match", matchDoctor: candidate, score: 5, debug: { step: 0, reason: "Exact hospital and HID match" } };
    }
  }

  // 1단계: 진료과(deptname) 필터링
  let candidatesStep1 = summaryData2Array.filter(candidate =>
    normalize(summaryData.deptname) === normalize(candidate.deptname)
  );

  if (candidatesStep1.length === 0) {
    console.log("\n결과: not match (1단계: 진료과 매칭 실패)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  // 2단계: 진료분야(specialties) 유사도 필터링
  if (candidatesStep1.length > 1) { // 후보가 1명 이하면 필터링 불필요
    let maxSpecialtiesSimilarity = -1;
    const candidatesWithSimilarity = candidatesStep1.map(candidate => {
      const { similarity } = setSimilarity(summaryData.specialties, candidate.specialties);
      maxSpecialtiesSimilarity = Math.max(maxSpecialtiesSimilarity, similarity);
      return { candidate, similarity };
    });

    candidatesStep1 = candidatesWithSimilarity
      .filter(item => item.similarity === maxSpecialtiesSimilarity)
      .map(item => item.candidate);
  }

  if (candidatesStep1.length === 0) {
    console.log("\n결과: not match (2단계: 진료분야 유사도 필터링 실패)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  // 3단계: 상세 정보(info) 내용 유사도 및 기간 일치 필터링
  let candidatesStep2 = candidatesStep1; // 2단계에서 넘어온 후보들

  let candidatesWithInfoMatch = [];
  for (const candidate of candidatesStep2) {
    const historyComparison = compareHistory(summaryData.info, candidate.info);
    if (historyComparison.matchCount > 0) { // 최소 1개 이상 일치
      candidatesWithInfoMatch.push({ candidate, historyComparison });
    }
  }

  if (candidatesWithInfoMatch.length === 0) {
    console.log("\n결과: not match (3단계: 상세 정보 매칭 실패)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  let finalCandidatesStep3 = [];
  if (candidatesWithInfoMatch.length === 1) {
    finalCandidatesStep3 = [candidatesWithInfoMatch[0].candidate];
  } else {
    // 후보가 2명 이상이면, 가장 많은 학력/경력 항목이 겹치는 후보 선택
    candidatesWithInfoMatch.sort((a, b) => b.historyComparison.matchCount - a.historyComparison.matchCount);
    const maxMatchCount = candidatesWithInfoMatch[0].historyComparison.matchCount;
    finalCandidatesStep3 = candidatesWithInfoMatch
      .filter(item => item.historyComparison.matchCount === maxMatchCount)
      .map(item => item.candidate);

    // 만약 여전히 여러 명이라면, 첫 번째 후보를 선택 (기간 일치 판단은 현재 단순화)
    if (finalCandidatesStep3.length > 1) {
      console.log("3단계: 여러 후보가 남았지만, 기간 일치 판단이 복잡하여 첫 번째 후보를 선택합니다.");
      finalCandidatesStep3 = [finalCandidatesStep3[0]];
    }
  }

  if (finalCandidatesStep3.length === 0) {
    console.log("\n결과: not match (3단계: 최종 후보 선택 실패)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  // 4단계: 최소 정보량 원칙 (최종 판별)
  const finalCandidate = finalCandidatesStep3[0]; // 3단계에서 선택된 잠정 후보

  const summaryDataInfoLength = summaryData.info ? summaryData.info.length : 0;
  const finalCandidateInfoLength = finalCandidate.info ? finalCandidate.info.length : 0;

  if (summaryDataInfoLength < 10 && finalCandidateInfoLength < 10) {
    console.log("\n결과: not match (4단계: 정보량 부족)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  console.log(`\n결과: match (4단계 통과, 최종 확정) -> ${finalCandidate?.hospitalname}:${finalCandidate?.doctorname}`);
  return { result: "match", matchDoctor: finalCandidate, score: 4, debug: { step: 4, reason: "Final confirmation" } };
}


module.exports = {
  setSimilarity,
  compareHistory,
  extractInfoEntries,
  findMatchingDoctor,
};
