const Logger = require('winston2'),
  Assert = require('assert'),
  Promise = require('bluebird'),
  Knex = require('../util/DatabaseHelper').knex,
  Constants = require('../Constants'),
  CSVParser = Promise.promisify(require('csv-parse')),
  RequestLib = require('request-promise'),
  XLSX = require('xlsx');

const Request = RequestLib.defaults({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36',
  },
  followAllRedirects: true,
  jar: true,
});

const lastYear = Math.floor(new Date().getTime() / 1000) - 31557600;
const xlsUrl = 'http://www.econ.yale.edu/~shiller/data/ie_data.xls';
const dailyCsvUrl = `https://query1.finance.yahoo.com/v7/finance/download/%5ESP500TR?period1=${lastYear}&period2=2500000000&interval=1d&events=history&crumb=`;

class SP500Scraper {
  /**
   * Fetches historical sp500 data, then truncates + saves to db.
   * @returns {Promise.<null>}
   */
  fetch() {
    Logger.info('Fetching sp500 index data (monthly)');
    return Request.get({url: xlsUrl, encoding: null})
      .then((xlsBuffer) => {
        Logger.info('Received XLS successfully');

        const workbook = XLSX.read(xlsBuffer);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[4]], {
          range: 'A9:M9999',
          header: [
            'date',
            'close',
            'dividend',
            'earnings',
            'cpi',
            'dateFraction',
            'gs10',
            'adjusted_close',
            'realDividend',
            'tr',
            'earnings',
            'trEarnings',
            'pe10',
          ],
        });

        const formattedData = data.filter((obj) => obj.date != null);

        formattedData.forEach((obj) => {
          const [year, month] = obj.date.split('.');
          obj.date = new Date(parseFloat(year), (month === '1' ? 10 : parseFloat(month)) - 1);

          Object.keys(obj).forEach((key) => {
            if (
              ![
                'date',
                'close',
                'dividend',
                'earnings',
                'cpi',
                'gs10',
                'adjusted_close',
                'dividend',
                'pe10',
              ].includes(key)
            ) {
              delete obj[key];
            }

            if (typeof obj[key] === 'string') {
              obj[key] = parseFloat(obj[key]);
            }
          });
        });
        return formattedData;
      })
      .then((dataArray) => {
        Logger.info('Formatting data');
        dataArray.forEach((obj, index) => {
          obj.dividend /= 12; //Convert annualized dividends to monthly
          obj.gs10 = obj.gs10 > 100 ? null : obj.gs10; //Removes some junk data.
        });

        dataArray.reverse();

        dataArray.forEach((obj, index) => {
          Object.keys(obj).forEach((key) => {
            if (key !== 'date') {
              obj[key] = Math.round(obj[key] * 100) / 100;
            }
          });
        });

        dataArray.forEach((obj, index) => {
          if (index === 0 || !dataArray[index - 1].dividend) {
            obj.adjusted_close = obj.close;
          } else {
            const prevObj = dataArray[index - 1];
            obj.adjusted_close =
              prevObj.adjusted_close +
              (prevObj.adjusted_close * (obj.close - prevObj.close - prevObj.dividend)) /
                prevObj.close;
          }
        });

        return dataArray;
      })
      .then((dataArray) => {
        Logger.info('Truncating old sp500 data');
        return Promise.join(dataArray, Knex('usa.sp_500_monthly').truncate());
      })
      .spread((dataArray) => {
        Logger.info(`Inserting ${dataArray.length} rows`);
        return Promise.join(dataArray, Knex('usa.sp_500_monthly').insert(dataArray));
      })
      .spread((dataArray) => {
        Logger.info('All sp500 data should be saved');
        Logger.info(`Saved ${dataArray.length} rows`);
      });
  }
  fetchDaily() {
    Logger.info('Fetching sp500 index data (daily)');
    return Request.get(dailyCsvUrl)
      .then((csvBuffer) => {
        Logger.info('Received csv successfully');
        //'pe10' cascades so only the last value is parsed
        return CSVParser(csvBuffer, {
          auto_parse: true,
          columns: ['date', 'open', 'high', 'low', 'close', 'volume', 'adjClose'],
        });
      })
      .then((dataArray) => {
        Logger.info('Formatting data');
        dataArray.shift(); //removes csv headers
        dataArray.reverse();

        return (
          dataArray
            .map((item) => ({
              date: item.date,
              value: item.close,
            }))
            // Removing duplicates
            .filter(function (item, pos) {
              return dataArray.findIndex((i) => i.date === item.date) == pos;
            })
        );
      })
      .then((dataArray) => {
        Logger.info('Truncating old sp500 data');
        return Promise.join(dataArray, Knex('usa.sp_500_daily').truncate());
      })
      .spread((dataArray) => {
        Logger.info(`Inserting ${dataArray.length} rows`);
        return Promise.join(dataArray, Knex('usa.sp_500_daily').insert(dataArray));
      })
      .spread((dataArray) => {
        Logger.info('All sp500 data should be saved');
        Logger.info(`Saved ${dataArray.length} rows`);
      });
  }
}

module.exports = new SP500Scraper();
