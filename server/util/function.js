'use strict';

let functions = function() {

};

functions.prototype.isEmpty = function(str){
    return str === null || str === undefined || str === '' || (typeof str === 'object' && Array.isArray(str) === false && Object.keys(str).length === 0);
};

functions.prototype.isNull = function(data,replace){
    return data === undefined ? replace : data;
};

functions.prototype.getTodayformatDate = function(){
    const ddate = new Date();
    let month = '' + (ddate.getMonth() + 1);
    let day = '' + ddate.getDate();
    const year = ddate.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
};
functions.prototype.strip_tags = function(){
    return str.replace(/(<([^>]+)>)/ig,"");
}

module.exports = new functions();