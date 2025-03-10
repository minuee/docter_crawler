const config = require('../config/configuration.js');
const crypto = require('crypto');
const uuid = require('uuid');
const _ = require('lodash');
const Md5 = require('md5');


module.exports = {



  YYYY_MM_DD(text) {
    if (!text || text.trim() === "") {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{4}-\d{2}$/.test(text)) {
      return text + "-01";
    }
    if (/^\d{4}$/.test(text)) {
      return text + "-01-01";
    }
    if (/^\d{6}$/.test(text)) {
      const year = text.substring(0, 4);
      const month = text.substring(4, 6);
      return year + "-" + month + "-01";
    }
    return null;
  },

  left(s, c) {
    return s.substr(0, c);
  },
  right(s, c) {
    return s.substr(-c);
  },
  isJSON(jsonString) {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      return false;
    }
  },
  aesEncrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  },

  aesDecrypt(encryptedText, key) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },

  removeMatchingWordFromEnd(A, B) {
    if (_.endsWith(A, B)) {
      return A.slice(0, -B.length);
    }
    return A;
  },

  wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  },

  toTimestamp(value, def = null) {
    try {
      value = new Date(value).getTime();
    } catch (error) {
      value = def;
    }
    return value;
  },

  isInt(value) {
    const val = String(value);
    let regex = /^[+\-]?[0-9]$/g;
    if (regex.test(val)) {
      return true;
    } else {
      return false;
    }
  },
  isFloat(value) {
    if (this.isEmpty(value)) return false;
    val = value.toString();
    val = val.replace(/,/g, '');
    let regex = /^[+\-]?[0-9]+(\.[0-9]+)?$/g;
    if (!regex.test(val)) return false
    val = parseFloat(val, 10)
    if (Number.isNaN(val)) return false
    return true
  },

  replaceAll(orgStr, searchStr, replaceStr) {
    return (orgStr.toString()).split(searchStr).join(replaceStr);
  },

  ltrim(value) {
    return value.replace(/^\s+/g, '');
  },
  rtrim(value) {
    return value.replace(/\s+$/g, '');
  },
  trim(value) {
    return value.replace(/^\s+|\s+$/g, '');
  },
  alltrim(value) {
    return value.replace(/\s/g, '');
  },
  removeTag(value) {
    if (!this.isEmpty(value)) {
      value.replace(/\s/g, '');
      value.replace(/<[^>]+>/g, '');
    }
    return value
  },
  ensure(value, def = null) {
    return this.isEmpty(value) ? def : value;
  },
  integer(value, def = 0) {
    let regex = /^[+\-]?[0-9]+(\.[0-9]+)?$/g;
    if (regex.test(value)) {
      value = parseInt(value, 10)
    } else {
      value = def
    }
    return value
  },
  float(value, def = 0.0) {
    let val = def;
    val = (this.isEmpty(value)) ? def : value;
    val = val.toString();
    val = val.replace(/,/g, '');
    let regex = /^[+\-]?[0-9]+(\.[0-9]+)?$/g;
    if (regex.test(val)) {
      val = parseFloat(val, 10)
    } else {
      val = def
    }
    return val
  },
  boolean(value, def = false) {
    let val = def;
    val = (this.isEmpty(value)) ? def : value;
    val = val.toString().toLowerCase();
    if (this.isEmpty(val)) return false;
    if (val === '1' || val === 'ture') return true;
    return false
  },

  encrypt(text) {
    const cipher = crypto.createCipher(config.thisServer.localEncryptType, config.thisServer.localEncryptKey);
    const encipheredContent = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    return encipheredContent;
  },
  decrypt(text) {
    const decipher = crypto.createDecipher(config.thisServer.localEncryptType, config.thisServer.localEncryptKey);
    const decipheredContent = decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
    return decipheredContent;
  },
  removeBlankFields(info) {
    if (!info) {
      return info;
    }
    for (const key in info) {
      if (info[key] === null || info[key] === '') {
        delete info[key];
      }
    }
    return info;
  },

  genKey(value) {
    if (this.isEmpty(value)) {
      value = uuid.v4();
    }
    return Md5(value);
  },

  authToken() {
    return require('crypto').randomBytes(8).toString('hex');
  },
  isEmpty(value) {
    if (value === null) return true
    if (value === 'undefined') return true
    if (typeof value === 'undefined') return true
    if (typeof value === 'string' && value === '') return true
    if (Array.isArray(value) && value.length < 1) return true
    if (typeof value === 'object' && value.constructor.name === 'Object' && Object.keys(value).length < 1 && Object.getOwnPropertyNames(value) < 1) return true
    if (typeof value === 'object' && value.constructor.name === 'String' && Object.keys(value).length < 1) return true // new String()
    return false
  }
}

