const Logger = require('winston2'),
  Assert = require('assert'),
  Promise = require('bluebird'),
  Knex = require('../util/DatabaseHelper').knex,
  Constants = require('../Constants'),
  CSVParser = Promise.promisify(require('csv-parse')),
  RequestLib = require('request-promise');

const Request = RequestLib.defaults({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36'
  },
  followAllRedirects: true,
  jar: true
});

const lastYear = Math.floor(new Date().getTime() / 1000) - 31557600;
const csvUrl = 'https://www.quandl.com/api/v1/datasets/YALE/SPCOMP.csv';
const yahooUrl = 'https://finance.yahoo.com/quote/%5ESP500TR/history?p=%5ESP500TR';
const dailyCsvUrl = `https://query1.finance.yahoo.com/v7/finance/download/%5ESP500TR?period1=${lastYear}&period2=2500000000&interval=1d&events=history&crumb=`;

class SP500Scraper {
  /**
   * Fetches historical sp500 data, then truncates + saves to db.
   * @returns {Promise.<null>}
   */
  fetch() {
    Logger.info('Fetching sp500 index data (monthly)');
    return Request.get(csvUrl, {
      qs: {
        api_key: Constants.QuandlApiKey
      }
    })
      .then(csvBuffer => {
        Logger.info('Received csv successfully');
        //'pe10' cascades so only the last value is parsed.
        return CSVParser(csvBuffer, {
          auto_parse: true,
          columns: [
            'date',
            'close',
            'dividend',
            'earnings',
            'cpi',
            'gs10',
            'pe10',
            'pe10',
            'pe10',
            'pe10'
          ]
        });
      })
      .then(dataArray => {
        Logger.info('Formatting data');
        dataArray.shift(); //Removes csv headers.
        dataArray.forEach((obj, index) => {
          obj.dividend /= 12; //Convert annualized dividends to monthly
          obj.gs10 = obj.gs10 > 100 ? null : obj.gs10; //Removes some junk data.
          Object.keys(obj).map(key => (obj[key] = obj[key] || null)); //Convert '' to null.

          if (index === 0 || !dataArray[index - 1].dividend) {
            obj.adjusted_close = obj.close;
          } else {
            const prevObj = dataArray[index - 1];
            obj.adjusted_close =
              prevObj.adjusted_close +
              prevObj.adjusted_close *
                (obj.close - prevObj.close - prevObj.dividend) /
                prevObj.close;
          }
        });
        dataArray.reverse();

        return dataArray;
      })
      .then(dataArray => {
        Logger.info('Truncating old sp500 data');
        return Promise.join(dataArray, Knex('usa.sp_500_monthly').truncate());
      })
      .spread(dataArray => {
        Logger.info(`Inserting ${dataArray.length} rows`);
        return Promise.join(dataArray, Knex('usa.sp_500_monthly').insert(dataArray));
      })
      .spread(dataArray => {
        Logger.info('All sp500 data should be saved');
        Logger.info(`Saved ${dataArray.length} rows`);
      });
  }
  fetchDaily() {
    Logger.info('Fetching sp500 index data (daily)');
    //Calls yahoo url to get cookie + find the crumb.
    return Request.get(yahooUrl).then(function(html) {
      const crumbRegexp = /"CrumbStore":{"crumb":"(.+?)"}/;
      const matches = html.match(crumbRegexp);
      const crumb = matches[1].replace('\\u002F', '/');
      Assert(crumb, 'Yahoo crumb not found!');

      return Request.get(dailyCsvUrl + crumb)
        .then(csvBuffer => {
          Logger.info('Received csv successfully');
          //'pe10' cascades so only the last value is parsed
          return CSVParser(csvBuffer, {
            auto_parse: true,
            columns: ['date', 'open', 'high', 'low', 'close', 'volume', 'adjClose']
          });
        })
        .then(dataArray => {
          Logger.info('Formatting data');
          dataArray.shift(); //removes csv headers
          dataArray.reverse();

          return dataArray.map(item => ({
            date: item.date,
            value: item.close
          }));
        })
        .then(dataArray => {
          Logger.info('Truncating old sp500 data');
          return Promise.join(dataArray, Knex('usa.sp_500_daily').truncate());
        })
        .spread(dataArray => {
          Logger.info(`Inserting ${dataArray.length} rows`);
          return Promise.join(dataArray, Knex('usa.sp_500_daily').insert(dataArray));
        })
        .spread(dataArray => {
          Logger.info('All sp500 data should be saved');
          Logger.info(`Saved ${dataArray.length} rows`);
        });
    });
  }
}

module.exports = new SP500Scraper();
