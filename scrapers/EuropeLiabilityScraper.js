'use strict';
const Logger = require('winston2');
const Request = require('request-promise');
const Promise = require('bluebird');
const Moment = require('moment-timezone');
const Knex = require('../util/DatabaseHelper').knex;
const SpreadsheetHelper = require('../util/SpreadsheetHelper');
const CSVParser = Promise.promisify(require('csv-parse'));

const csvUrl = 'http://sdw.ecb.europa.eu/export.do?INSTR_ASSET=F&node=bbn157&ACCOUNTING_ENTRY=L&STO=LE&DATASET=0&exportType=xls&SERIES_KEY=332.QSA.Q.N.I8.W0.S11.S1.N.L.LE.F._Z._Z.XDC._T.S.V.N._T&SERIES_KEY=332.QSA.Q.N.I8.W0.S1M.S1.N.L.LE.F._Z._Z.XDC._T.S.V.N._T&SERIES_KEY=332.QSA.Q.N.I8.W0.S12Q.S1.N.L.LE.F._Z._Z.XDC._T.S.V.N._T&SERIES_KEY=332.QSA.Q.N.I8.W0.S13.S1.N.L.LE.F._Z._Z.XDC._T.S.V.N._T';

class EuropeLiabilityScraper {
    /**
     * Fetches stock market allocation data, then truncates + saves to db
     * @returns {Promise.<null>}
     */
    fetch() {
        Logger.info('Fetching Europe liabilities (real economic borrowers) data');
        return Request.get(csvUrl).then(csvBuffer => {
            Logger.info('Received csv successfully');
            //'pe10' cascades so only the last value is parsed
            return CSVParser(csvBuffer, { auto_parse: true, columns: ['date', 'nonFinancialCorporations', 'insuranceCorporations', 'government', 'households'] })
        }).then(dataArray => {
            Logger.info('Formatting data');
            dataArray = dataArray.slice(5);
            dataArray = dataArray.map(obj => {
                Object.keys(obj).forEach(function(key) {
                    if (key !== 'date') {
                        obj[key] = parseFloat(obj[key]);
                    }
                });
                const total = (obj.nonFinancialCorporations + obj.insuranceCorporations + obj.government + obj.households) * 1000000;
                const yearStr = obj.date.slice(0,4);
                const quarterStr = obj.date.slice(5);
                const date = Moment(new Date(yearStr)).tz('GMT');
                date.add((parseInt(quarterStr) - 1) * 3, 'months');

                return {
                    date: date.format('YYYY-MM-DD'),
                    value: parseInt(total)
                };
            });
            dataArray.reverse();

            return dataArray;
        }).then(dataArray => {
            Logger.info('Truncating old liability data');
            return Promise.join(dataArray, Knex('europe.total_liabilities').truncate());
        }).spread(dataArray => {
            Logger.info(`Inserting ${dataArray.length} rows`);
            return Promise.join(dataArray, Knex('europe.total_liabilities').insert(dataArray));
        }).spread(dataArray => {
            Logger.info('All liability data should be saved');
            Logger.info(`Saved ${dataArray.length} rows`);
        });
    }
}

module.exports = new EuropeLiabilityScraper();
