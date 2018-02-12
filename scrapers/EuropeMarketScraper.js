const Logger = require('winston2'),
  Request = require('request-promise'),
  Promise = require('bluebird'),
  Moment = require('moment'),
  Knex = require('../util/DatabaseHelper').knex,
  CSVParser = Promise.promisify(require('csv-parse'));

const csvUrl =
  'http://sdw.ecb.europa.eu/quickviewexport.do?SERIES_KEY=130.SEC.M.I8.1000.F51100.M.1.Z01.E.Z&type=csv';

class EuropeMarketScraper {
  /**
   * Fetches stock market allocation data, then truncates + saves to db
   * @returns {Promise.<null>}
   */
  fetch() {
    Logger.info('Fetching Europe stock market (total value) data');
    return Request.get(csvUrl)
      .then(csvBuffer => {
        Logger.info('Received csv successfully');
        //'pe10' cascades so only the last value is parsed
        return CSVParser(csvBuffer, {auto_parse: true, columns: ['date', 'value']});
      })
      .then(dataArray => {
        Logger.info('Formatting data');
        dataArray = dataArray.slice(5);
        dataArray = dataArray.map(obj => {
          obj.value = parseFloat(obj.value);
          const date = Moment(new Date(obj.date)).tz('GMT');
          return {
            date: date.format('YYYY-MM-DD'),
            value: parseInt(obj.value * 1000000)
          };
        });
        dataArray.reverse();

        return dataArray;
      })
      .then(dataArray => {
        Logger.info('Truncating old stock market data');
        return Promise.join(dataArray, Knex('europe.total_market').truncate());
      })
      .spread(dataArray => {
        Logger.info(`Inserting ${dataArray.length} rows`);
        return Promise.join(dataArray, Knex('europe.total_market').insert(dataArray));
      })
      .spread(dataArray => {
        Logger.info('All stock market data should be saved');
        Logger.info(`Saved ${dataArray.length} rows`);
      });
  }
}

module.exports = new EuropeMarketScraper();
