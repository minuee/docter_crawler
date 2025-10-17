const config = require(`${global.appRoot}/server/config/configuration`);
const CS = require(`${global.appRoot}/server/util/util.casting`);
const RM = require(`${global.appRoot}/server/util/response.message`);
const daoMysql = require(`${global.appRoot}/server/database/dao.mysql`);
const _ = require('lodash');
const xlsx = require('xlsx');
const path = require('path');
const { isJSON } = require('../../server/util/util.casting');
const mybatisMapper = require("mybatis-mapper");
const functions = require(`${global.appRoot}/server/util/function`);

const DATA_VERSION_ID = parseInt(process.env.DATA_VERSION_ID) ? parseInt(process.env.DATA_VERSION_ID) : 1;

module.exports = {

  similarity: async(a, b) => {
    
    if (!a || !b) return 0;
    a = a.toLowerCase();
    b = b.toLowerCase();
    let matches = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
  },

  getSimilarityScore: async(a, b) => {
    
    let score = 0;
    const maxScore = 5;

    if (d1.doctorname === d2.doctorname) score++;
    if (this.similarity(d1.hospitalname, d2.hospitalname) > 0.8) score++;
    if (this.similarity(d1.deptname, d2.deptname) > 0.8) score++;
    if (this.similarity(d1.info, d2.info) > 0.5) score++;
    if (this.similarity(d1.specialties, d2.specialties) > 0.5) score++;

    return { score, maxScore }
  },

  findMatchingDoctor: async (summaryData, summaryData2Array) => {

    if (!Array.isArray(summaryData2Array) || summaryData2Array.length === 0) {
      return { result: "not match",matchDoctor:null,score:null };
    }
  
    const results = summaryData2Array.map((data2) => {
      const { score } = this.getSimilarityScore(summaryData, data2);
      return { doctor: data2, score };
    });
  
    // 점수 4 이상만 필터링
    const matched = results.filter((r) => r.score >= 4);
  
    if (matched.length === 0) {
      return { result: "not match" };
    }
  
    // 최고 점수 1명만 선택
    const bestMatch = matched.sort((a, b) => b.score - a.score)[0];
    return { result: "match", matchDoctor: bestMatch.doctor, score: bestMatch.score };
  }

}
