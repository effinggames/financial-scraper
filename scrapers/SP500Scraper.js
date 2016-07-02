'use strict';
const Logger = require('winston2');
const Promise = require('bluebird');
const Request = require('request-promise');
const Knex = require('../util/DatabaseHelper').knex;
const CSVParser = Promise.promisify(require('csv-parse'));

const csvUrl = 'https://www.quandl.com/api/v1/datasets/YALE/SPCOMP.csv';
const dailyCsvUrl = `http://real-chart.finance.yahoo.com/table.csv?s=%5ESP500TR&a=00&b=4&c=${new Date().getFullYear() - 2}&d=05&e=29&f=2099&g=d&ignore=.csv`;

class SP500Scraper {
    /**
     * Fetches historical sp500 data, then truncates + saves to db
     * @returns {Promise.<null>}
     */
    fetch() {
        Logger.info('Fetching sp500 index data (monthly)');
        return Request.get(csvUrl).then(csvBuffer => {
            Logger.info('Received csv successfully');
            //'pe10' cascades so only the last value is parsed
            return CSVParser(csvBuffer, { auto_parse: true, columns: ['date', 'close', 'dividend', 'earnings', 'cpi', 'gs10', 'pe10', 'pe10', 'pe10', 'pe10'] })
        }).then(dataArray => {
            Logger.info('Formatting data');
            dataArray.shift(); //removes csv headers
            dataArray.forEach((obj, index) => {
                obj.dividend /= 12; //convert annualized dividends to monthly
                Object.keys(obj).map(key => obj[key] = obj[key] || null); //convert '' => null

                if (index === 0 || !dataArray[index-1].dividend) {
                    obj.adjusted_close = obj.close;
                } else {
                    const prevObj = dataArray[index - 1];
                    obj.adjusted_close = prevObj.adjusted_close + prevObj.adjusted_close * (obj.close - prevObj.close - prevObj.dividend) / prevObj.close;
                }
            });
            dataArray.reverse();

            return dataArray;
        }).then(dataArray => {
            Logger.info('Truncating old sp500 data');
            return Promise.join(dataArray, Knex('usa.sp_500_monthly').truncate());
        }).spread(dataArray => {
            Logger.info(`Inserting ${dataArray.length} rows`);
            return Promise.join(dataArray, Knex('usa.sp_500_monthly').insert(dataArray));
        }).spread(dataArray => {
            Logger.info('All sp500 data should be saved');
            Logger.info(`Saved ${dataArray.length} rows`);
        });
    }
    fetchDaily() {
        Logger.info('Fetching sp500 index data (daily)');
        return Request.get(dailyCsvUrl).then(csvBuffer => {
            Logger.info('Received csv successfully');
            //'pe10' cascades so only the last value is parsed
            return CSVParser(csvBuffer, { auto_parse: true, columns: ['date', 'open', 'high', 'low', 'close', 'volume', 'adjClose'] })
        }).then(dataArray => {
            Logger.info('Formatting data');
            dataArray.shift(); //removes csv headers
            dataArray.reverse();

            return dataArray.map(item => ({
                date: item.date,
                value: item.close
            }));
        }).then(dataArray => {
            Logger.info('Truncating old sp500 data');
            return Promise.join(dataArray, Knex('usa.sp_500_daily').truncate());
        }).spread(dataArray => {
            Logger.info(`Inserting ${dataArray.length} rows`);
            return Promise.join(dataArray, Knex('usa.sp_500_daily').insert(dataArray));
        }).spread(dataArray => {
            Logger.info('All sp500 data should be saved');
            Logger.info(`Saved ${dataArray.length} rows`);
        });
    }
}

module.exports = new SP500Scraper();
