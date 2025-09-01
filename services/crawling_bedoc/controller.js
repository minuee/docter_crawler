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

  get_rid_encrypt: async (p_doctorName, p_refUrl) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_rid(?) `
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [p_doctorName, p_refUrl]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },

  setCrawlingDoctorLink: async (rid, hid, deptName, doctorName, url) => {

    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_basic(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, url]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },

  setCrawlingdoctorBasic: async (rid, hid, deptName, doctorName, specialty, profileimgurl) => {
    
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL UPDATE_DOCTOR_BASIC(?)`
    // const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, DATA_VERSION_ID, deptName, doctorName, specialty, profileimgurl]);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, specialty, profileimgurl, '']);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },

  setCrawlingdoctorBiography: async (rid, hid, doctorName, jsondata) => {
    
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL SET_DOCTOR_CAREER(?)`
    // const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, hid, doctorName, jsondata]);
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, jsondata]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },


  setCrawlingTreatise: async (rid, title, doi, journalName, authorRule, publicationDate, url,
    abstract, keywords, impactFactor, totalCitations, referencesThesis,
    doctorName, authorName, subjectClassification, publicationLocation) => {
    let result = null, error = null, DBCode = null, DBData = null
    const query = `CALL set_doctor_paper(?)`
    const { DBError = null, RS = null } = await daoMysql.spCall(query, [rid, DATA_VERSION_ID, doctorName, title, doi, journalName, authorRule, publicationDate, url,
      abstract, keywords, impactFactor, totalCitations, authorName]);
    if (DBError) {
      console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
      return { error: DBError, data: null };
    }
    // console.log(RS)
    DBCode = _.get(RS[0][0], 'RETURNCODE', null)
    DBData = _.get(RS, [1], [])

    error = (DBCode == 'TRANSACTION_SUCCESS') ? null : _.get(RM, DBCode, RM.UNEXPECTED_CODE)
    console.log(error)
    result = DBData
    return { error: error, data: result };

  },

  prepareBiographyData: (doctorData) => {
    let biography = [];
    const cleanText = (text) => text?.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');

    if (doctorData.학력 && !CS.isEmpty(doctorData.학력)) {
      doctorData.학력.map((item) => {
        biography.push({
          targetDate: item?.targetDate ? item?.targetDate : item?.date ? item?.date : null,
          type: "학력",
          text: item?.text ? cleanText(item?.text) : item?.content ? cleanText(item?.content) : null,
          url: null,
          issuer: null
        });
      });
    } else if (doctorData.학력 === undefined) {
      if (doctorData.education && !CS.isEmpty(doctorData.education)) {
        doctorData.education.map((item) => {
          biography.push({
            targetDate: item?.targetDate ? item?.targetDate : item?.date ? item?.date : null,
            type: "학력",
            text: item?.text ? cleanText(item?.text) : item?.content ? cleanText(item?.content) : null,
            url: null,
            issuer: null
          });
        });
      } else if (doctorData.학력 === undefined) {
        console.warn("doctorData.학력 is missing or undefined.");
      }
    }

    if (doctorData.경력 && !CS.isEmpty(doctorData.경력)) {
      doctorData.경력.map((item) => {
        biography.push({
          targetDate: item?.targetDate ? item?.targetDate : item?.date ? item?.date : null,
          type: "경력",
          text: item?.text ? cleanText(item?.text) : item?.content ? cleanText(item?.content) : null,
          url: null,
          issuer: null
        });
      });
    } else if (doctorData.경력 === undefined) {
      if (doctorData.experience && !CS.isEmpty(doctorData.experience)) {
        doctorData.experience.map((item) => {
          biography.push({
            targetDate: item?.targetDate ? item?.targetDate : item?.date ? item?.date : null,
            type: "경력",
            text: item?.text ? cleanText(item?.text) : item?.content ? cleanText(item?.content) : null,
            url: null,
            issuer: null
          });
        });
      } else if (doctorData.학력 === undefined) {
        console.warn("doctorData.경력 is missing or undefined.");
      }
    }

    if (doctorData.수상 && !CS.isEmpty(doctorData.수상)) {
      doctorData.수상.map((item) => {
        biography.push({
          targetDate: item?.targetDate ? item?.targetDate : item?.date ? item?.date : null,
          type: "수상",
          text: item?.text ? cleanText(item?.text) : item?.content ? cleanText(item?.content) : null,
          url: item?.url || null,
          issuer: item?.issuer || null,
        });
      });
    } else if (doctorData.수상 === undefined) {//
      console.warn("doctorData.수상 is missing or undefined.");
      if (doctorData.awards && !CS.isEmpty(doctorData.awards)) {
        doctorData.awards.map((item) => {
          biography.push({
            targetDate: item?.targetDate ? item?.targetDate : item?.date ? item?.date : null,
            type: "수상",
            text: item?.text ? cleanText(item?.text) : item?.content ? cleanText(item?.content) : null,
            url: item?.url || null,
            issuer: item?.issuer || null,
          });
        });
      } 
    }

    if (doctorData.학술 && !CS.isEmpty(doctorData.학술)) {
      doctorData.학술.map((item) => {
        biography.push({
          targetDate: item?.targetDate ? item?.targetDate : item?.date ? item?.date : null,
          type: "학술",
          text: item?.text ? cleanText(item?.text) : item?.content ? cleanText(item?.content) : null,
          url: item?.url || null,
          issuer: item?.issuer || null,
        });
      });
    } else if (doctorData.학술 === undefined) {
      console.warn("doctorData.학술 is missing or undefined.");
    }

    if (doctorData.언론 && !CS.isEmpty(doctorData.언론)) {
      doctorData.언론.map((item) => {
        biography.push({
          targetDate: item?.targetDate ? item?.targetDate : item?.date ? item?.date : null,
          type: "언론",
          text: item?.text ? cleanText(item?.text) : item?.content ? cleanText(item?.content) : null,
          url: item?.url || null,
          issuer: item?.issuer || null,
        });
      });
    } else if (doctorData.언론 === undefined) {
      console.warn("doctorData.언론 is missing or undefined.");
    }
    return biography;
  },

  prepareThesisData: (doctorData, tempRid, doctorName) => {
    const theses = [];
    const cleanText = (text) => text?.replace(/\t/g, '').replace(/\n/g, '').replaceAll(/\n|\r|/g, '');

    if (!CS.isEmpty(doctorData.논문)) {
      for (let index = 0; index < _.size(doctorData.논문); index++) {
        const tmpText = cleanText(doctorData.논문[index]); // Fixed bug: used doctorData.논문[index]
        const thesisItem = {
          rid: tempRid,
          title: tmpText,
          doi: null,
          journalName: null,
          authorRule: null,
          publicationDate: null,
          url: null,
          abstract: null,
          keywords: null,
          impactFactor: null,
          totalCitations: null,
          referencesThesis: null,
          doctorName: doctorName,
          authorName: null,
          subjectClassification: null,
          publicationLocation: null
        };
        theses.push(thesisItem);
      }
    }
    return theses;
  },

  saveDoctorDataToDb: async (doctorData) => {
    const doctorName = doctorData.bedoc_doctorname || '';
    const tmpHospitalID = doctorData.aiga_hid || '';
    const checkHospitalID = doctorData.found_hospital_aiga_hid || '';
    const deptName = doctorData.bedoc_deptname || '';
    const specialtyData = doctorData.specialty || '';
    const doctorProfileImgUrl = doctorData.profileUrl || '';
    const refUrl = doctorData.doctorDetailUrl;

    const hospitalID = checkHospitalID ? checkHospitalID : tmpHospitalID;

    try {
      
      if (CS.isEmpty(doctorName) || CS.isEmpty(refUrl) ) {
        return { success: false, error: "Empty doctorName,refUrl" };
      }
      await CS.wait(300);
      const SP1 = await module.exports.get_rid_encrypt(doctorName, refUrl);
      if (SP1.error) {
        console.log("SP1 DB fail.");
        return { success: false, error: SP1.error };
      }
      const tempRid = SP1.data[0].rid_encrypt;
      if (CS.isEmpty(tempRid)) {
        return { success: false, error: "Empty rid_encrypt" };
      }

      const SP2 = await module.exports.setCrawlingDoctorLink(tempRid, hospitalID, deptName, doctorName, refUrl);
      if (SP2.error) return { success: false, error: "Empty rid_encrypt" };
      await CS.wait(300);

      const SP3 = await module.exports.setCrawlingdoctorBasic(tempRid, hospitalID, deptName, doctorName, specialtyData, doctorProfileImgUrl);
      if (SP3.error) {
        console.log("SP3 DB fail.");
        return { success: false, error: SP3.error };
      }
      await CS.wait(300);

      const biography = module.exports.prepareBiographyData(doctorData);
      const SP4 = await module.exports.setCrawlingdoctorBiography(tempRid, hospitalID, doctorName, JSON.stringify(biography));
      if (SP4.error) {
        console.log("SP4 DB fail.");
        return { success: false, error: SP4.error };
      }

      const theses = module.exports.prepareThesisData(doctorData, tempRid, doctorName);
      if (!CS.isEmpty(theses)) {
        for (const thesisItem of theses) {
          const SP6 = await module.exports.setCrawlingTreatise(
            thesisItem.rid,
            thesisItem.title,
            thesisItem.doi,
            thesisItem.journalName,
            thesisItem.authorRule,
            thesisItem.publicationDate,
            thesisItem.url,
            thesisItem.abstract,
            thesisItem.keywords,
            thesisItem.impactFactor,
            thesisItem.totalCitations,
            thesisItem.referencesThesis,
            thesisItem.doctorName,
            thesisItem.authorName,
            thesisItem.subjectClassification,
            thesisItem.publicationLocation
          );
          if (SP6.error) {
            console.log(`SP6 DB fail for thesis: ${thesisItem.title}`);
            return { success: false, error: SP6.error };
          }
        }
      }

      return { success: true, rid: tempRid };

    } catch (error) {
      console.error(`Error in saveDoctorDataToDb: ${error.message}`);
      return { success: false, error: error.message };
    }

  },

  saveDoctorDataToBedocTable: async (doctorData,hospitalID) => {

    const hospital_cid = doctorData?.hospital_cid;
    const isExist = doctorData.isExist || '';
    const isSearchType = doctorData.isSearchType || '';
    const doctorDetailUrl = doctorData.doctorDetailUrl || '';
    const profileUrl = doctorData.profileUrl || '';
    const doctorProfileImgUrl = doctorData.profileUrl || '';
    const specialty = doctorData.specialty || '';
    const searchHospitalName = doctorData.searchHospitalName || '';
    const isSameHospital = doctorData.isSameHospital || '';
    const isAttend = doctorData.isAttend || '';
    const foundHospitalHID = doctorData.found_hospital_aiga_hid ? doctorData.found_hospital_aiga_hid : hospitalID;
    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
    try {
      
      console.log(`saveData:${isExist}, ${isSearchType}, ${doctorDetailUrl}, ${doctorProfileImgUrl}, ${profileUrl}, ${specialty}, ${searchHospitalName}, ${isSameHospital}, ${isAttend}`);
      
      const param = {
        hospital_cid,
        isExist : isExist ? 1 : 0,
        isSearchType,
        doctorDetailUrl,
        doctorProfileImgUrl,
        profileUrl,
        specialty,
        searchHospitalName : searchHospitalName ? searchHospitalName : doctorData?.hospital_name,
        isSameHospital : isSameHospital ? 1 : 0,
        isAttend : isAttend ? 1 : 0,
        foundHospitalHID
      }; 
      const format = { language: "sql", indent: "  " };
      const query = mybatisMapper.getStatement(
          "controler",
          "hospital_bedoc_update",
          param,
          format
      );
      const { DBError = null, RS = null } = await daoMysql.spCall(query);
      const retNull = await  functions.myBatisResult(DBError,RS)

      return { success: true };

    } catch (error) {
      console.error(`Error in saveDoctorDataToDb: ${error.message}`);
      return { success: false, error: error.message };
    }
  },


  getNewHospitalID: async (searchHospitalName, searchHospitalAddress) => {
    const fs = require('fs');
    const hospitalListPath = path.join(global.appRoot, 'services', 'crawling_bedoc', 'hospital_list.json');

    try {
      if (!fs.existsSync(hospitalListPath)) {
        return { success: false, error: "hospital_list.json not found. Please run the /get-allhid API first." };
      }

      const hospitalData = JSON.parse(fs.readFileSync(hospitalListPath, 'utf-8'));
      
      // Find potential matches by name (alias or standard name)
      const nameMatches = hospitalData.filter(hospital => 
        hospital.alias_name === searchHospitalName || hospital.standard_name === searchHospitalName
      );

      if (nameMatches.length === 0) {
        return { success: false, data: null, error: "No hospital found with that name." };
      }

      if (nameMatches.length === 1) {
        const newHid = nameMatches[0].new_hid;
        return { success: true, data: newHid };
      }

      // If multiple name matches, use Jaccard similarity on the address
      const jaccardSimilarity = (s1, s2) => {
          if (!s1 || !s2) return 0;
          const set1 = new Set(s1.toLowerCase().split(/\s+/).filter(word => word.length > 1));
          const set2 = new Set(s2.toLowerCase().split(/\s+/).filter(word => word.length > 1));
          const intersection = new Set([...set1].filter(x => set2.has(x)));
          const union = new Set([...set1, ...set2]);
          return union.size === 0 ? 0 : intersection.size / union.size;
      };

      let bestMatch = null;
      let highestSimilarity = -1;

      for (const hospital of nameMatches) {
        const similarity = jaccardSimilarity(searchHospitalAddress, hospital.hospital_addr);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = hospital;
        }
      }

      if (bestMatch) {
        // Check for ambiguity (e.g., multiple matches with the same highest similarity)
        const allSimilarities = nameMatches.map(hospital => jaccardSimilarity(searchHospitalAddress, hospital.hospital_addr));
        const sortedSimilarities = [...allSimilarities].sort((a, b) => b - a);

        if (highestSimilarity === 0 || (sortedSimilarities.length > 1 && sortedSimilarities[0] === sortedSimilarities[1])) {
            return { success: false, data: null, error: "Ambiguous hospital match based on address similarity." };
        }
        
        const newHid = bestMatch.new_hid;
        return { success: true, data: newHid };
      } else {
        return { success: false, data: null, error: "Could not determine a single best match from multiple candidates." };
      }

    } catch (error) {
      console.error(`Error in getNewHospitalID (file-based): ${error.message}`);
      return { success: false, error: error.message, data: null };
    }
  },

  getNewHospitalID_db: async (searchHospitalName, searchHospitalAddress) => {

    const newHospitalName = searchHospitalName;
    const newHospitalAddress = searchHospitalAddress;

    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
    try {
      
      console.log(`getNewHospitalID:${newHospitalName}`);
      
      const param = {
        newHospitalName,
        newHospitalAddress, // Added newHospitalAddress
      }; 
      const format = { language: "sql", indent: "  " };
      const query = mybatisMapper.getStatement(
          "controler",
          "find_hospital_hid",
          param,
          format
      );
      const { DBError = null, RS = null } = await daoMysql.spCall(query);
      const ret = await  functions.myBatisResult(DBError,RS)

      // Jaccard Similarity function (defined locally for this context)
      const jaccardSimilarity = (s1, s2) => {
          if (!s1 || !s2) return 0;
          const set1 = new Set(s1.toLowerCase().split(/\s+/).filter(word => word.length > 1));
          const set2 = new Set(s2.toLowerCase().split(/\s+/).filter(word => word.length > 1));
          const intersection = new Set([...set1].filter(x => set2.has(x)));
          const union = new Set([...set1, ...set2]);
          return union.size === 0 ? 0 : intersection.size / union.size;
      };

      if ( ret?.data?.length > 0 ) {
        if (ret.data.length === 1) {
          // Only one result, return it directly
          const newHid = ret.data[0]?.new_hid;
          return { success: true, data : newHid };
        } else {
          // Multiple results, find the best match by address similarity
          let bestMatch = null;
          let highestSimilarity = -1;

          for (const hospital of ret.data) {
            const similarity = jaccardSimilarity(newHospitalAddress, hospital?.hospital_addr);
            if (similarity > highestSimilarity) {
              highestSimilarity = similarity;
              bestMatch = hospital;
            }
          }

          if (bestMatch) {
            // Check if the best match is significantly better than others, or if there are ties
            const allSimilarities = ret.data.map(hospital => jaccardSimilarity(newHospitalAddress, hospital?.hospital_addr));
            const sortedSimilarities = [...allSimilarities].sort((a, b) => b - a);

            // If the highest similarity is 0, or if there are multiple hospitals with the same highest similarity (ambiguous)
            if (highestSimilarity === 0 || (sortedSimilarities.length > 1 && sortedSimilarities[0] === sortedSimilarities[1])) {
                return { success: false, data : null, error: "Ambiguous hospital match due to similar addresses." };
            }

            const newHid = bestMatch?.new_hid;
            return { success: true, data : newHid };
          } else {
            // No best match found (should not happen if ret.data.length > 0)
            return { success: false, data : null, error: "No suitable hospital found among multiple matches." };
          }
        }
      }else{
        // No results found
        return { success: false, data : null };
      }

    } catch (error) {
      console.error(`Error in getNewHospitalID: ${error.message}`);
      return { success: false, error: error.message, data : null };
    }
  },

  getNewHospitalID_old: async (searchHospitalName, searchHospitalAddress) => {

    const newHospitalName = searchHospitalName;
    const newHospitalAddress = searchHospitalAddress;

    mybatisMapper.createMapper([`${global.appRoot}/services/crawling_bedoc/controler.xml`]);
    try {
      
      console.log(`getNewHospitalID:${newHospitalName}`);
      
      const param = {
        newHospitalName,
        newHospitalAddress, // Added newHospitalAddress
      }; 
      const format = { language: "sql", indent: "  " };
      const query = mybatisMapper.getStatement(
          "controler",
          "find_hospital_hid",
          param,
          format
      );
      const { DBError = null, RS = null } = await daoMysql.spCall(query);
      const ret = await  functions.myBatisResult(DBError,RS)

      // Jaccard Similarity function (defined locally for this context)
      const jaccardSimilarity = (s1, s2) => {
          if (!s1 || !s2) return 0;
          const set1 = new Set(s1.toLowerCase().split(/\s+/).filter(word => word.length > 1));
          const set2 = new Set(s2.toLowerCase().split(/\s+/).filter(word => word.length > 1));
          const intersection = new Set([...set1].filter(x => set2.has(x)));
          const union = new Set([...set1, ...set2]);
          return union.size === 0 ? 0 : intersection.size / union.size;
      };

      if ( ret?.data?.length > 0 ) {
        if (ret.data.length === 1) {
          // Only one result, return it directly
          const newHid = ret.data[0]?.new_hid;
          return { success: true, data : newHid };
        } else {
          // Multiple results, find the best match by address similarity
          let bestMatch = null;
          let highestSimilarity = -1;

          for (const hospital of ret.data) {
            const similarity = jaccardSimilarity(newHospitalAddress, hospital?.hospital_addr);
            if (similarity > highestSimilarity) {
              highestSimilarity = similarity;
              bestMatch = hospital;
            }
          }

          if (bestMatch) {
            // Check if the best match is significantly better than others, or if there are ties
            const allSimilarities = ret.data.map(hospital => jaccardSimilarity(newHospitalAddress, hospital?.hospital_addr));
            const sortedSimilarities = [...allSimilarities].sort((a, b) => b - a);

            // If the highest similarity is 0, or if there are multiple hospitals with the same highest similarity (ambiguous)
            if (highestSimilarity === 0 || (sortedSimilarities.length > 1 && sortedSimilarities[0] === sortedSimilarities[1])) {
                return { success: false, data : null, error: "Ambiguous hospital match due to similar addresses." };
            }

            const newHid = bestMatch?.new_hid;
            return { success: true, data : newHid };
          } else {
            // No best match found (should not happen if ret.data.length > 0)
            return { success: false, data : null, error: "No suitable hospital found among multiple matches." };
          }
        }
      }else{
        // No results found
        return { success: false, data : null };
      }

    } catch (error) {
      console.error(`Error in getNewHospitalID: ${error.message}`);
      return { success: false, error: error.message, data : null };
    }
  }
}
