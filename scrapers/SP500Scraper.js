'use strict';
const Assert = require('assert');
const Logger = require('winston2');
const Promise = require('bluebird');
const Request = require('request-promise');
const Knex = require('./DatabaseHelper').knex;
const CSVParser = Promise.promisify(require('csv-parse'));

const csvUrl = 'https://www.quandl.com/api/v1/datasets/YALE/SPCOMP.csv';

class SP500Scraper {
    /**
     * Fetches historical sp500 data, then truncates + saves to db
     * @returns {Promise.<null>}
     */
    fetch() {
        Logger.info('Fetching historical sp500 data');
        return Request.get(csvUrl).then(csvBuffer => {
            Logger.info('Received csv successfully');
            //'pe10' cascades so only the last value is parsed
            return CSVParser(csvBuffer, { columns: ['date', 'price', 'dividend', 'earnings', 'cpi', 'gs10', 'pe10', 'pe10', 'pe10', 'pe10'] })
        }).then(dataArray => {
            Logger.info('Formatting data');
            dataArray.shift(); //removes csv headers
            dataArray.forEach(obj => {
                obj.dividend /= 12; //convert annualized dividends to monthly
                Object.keys(obj).map(key => obj[key] = obj[key] || null); //convert '' => null
            });
            return dataArray;
        }).then(dataArray => {
            Logger.info('Truncating old sp500 data');
            return Promise.join(dataArray, Knex('sp_500_monthly').truncate());
        }).spread(dataArray => {
            Logger.info(`Inserting ${dataArray.length} rows`);
            return Promise.join(dataArray, Knex('sp_500_monthly').insert(dataArray));
        }).spread(dataArray => {
            Logger.info('All sp500 data should be saved');
            Logger.info(`Saved ${dataArray.length} rows`);
        });
    }
}

module.exports = new SP500Scraper();
