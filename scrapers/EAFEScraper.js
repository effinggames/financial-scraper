const XLSX = require('xlsx'),
  Assert = require('assert'),
  Logger = require('winston2'),
  Moment = require('moment'),
  Request = require('request-promise'),
  Knex = require('../util/DatabaseHelper').knex,
  SpreadsheetHelper = require('../util/SpreadsheetHelper');

const pastYear = new Date().getFullYear() - 2;
const EAFEMonthlySpreadsheetURL =
  'https://www.msci.com/webapp/indexperf/charts?indices=108,C,36&startDate=31%20Dec,%201969&endDate=24%20Jun,%202099&priceLevel=40&currency=15&frequency=D&scope=R&format=XLS&baseValue=false&site=gimi';
const EAFEDailySpreadsheetURL = `https://www.msci.com/webapp/indexperf/charts?indices=108,C,36&startDate=27%20Jun,%20${pastYear}&endDate=27%20Jun,%202099&priceLevel=40&currency=15&frequency=D&scope=R&format=XLS&baseValue=false&site=gimi`;

const fetchAndInsertSpreadsheet = function(spreadsheetUrl, tableName) {
  return Request.get(spreadsheetUrl, {encoding: null}).then(xlsBuffer => {
    const workbook = XLSX.read(xlsBuffer);
    const worksheet = workbook.Sheets['History Index'];
    Logger.info('Workbook successfully downloaded');

    //verify format hasn't changed
    Assert.strictEqual(worksheet.A7.w, 'Date');
    Assert.strictEqual(worksheet.B7.w, 'EAFE Standard (Large+Mid Cap) ');

    //find last row of data
    let lastRow = 7;
    while (worksheet['A' + (lastRow + 1)]) {
      lastRow++;
    }

    //get all the data
    const dateData = SpreadsheetHelper.columnRange('A', 8, lastRow).map(i => {
      return Moment(new Date(worksheet[i].w))
        .tz('GMT')
        .format('YYYY-MM-DD');
    });
    const valueData = SpreadsheetHelper.columnRange('B', 8, lastRow).map(i => {
      return worksheet[i].v || null;
    });

    //matches the value data to the date, and correctly formats it for the db
    const formattedData = valueData.map((i, index) => ({
      date: dateData[index],
      value: i
    }));

    //truncates the tables then saves all the data to db
    return Knex(tableName)
      .truncate()
      .then(function() {
        Logger.info('Truncating old EAFE data');
        return Knex(tableName).insert(formattedData);
      })
      .then(function() {
        Logger.info('All EAFE data should be saved');
        Logger.info(`Saved ${lastRow} rows`);
      });
  });
};
class EAFEScraper {
  /**
   * Fetches the monthly EAFE index, then truncates + saves to db
   * @returns {Promise.<null>}
   */
  fetch() {
    Logger.info('Fetching EAFE index data (monthly)');
    return fetchAndInsertSpreadsheet(EAFEMonthlySpreadsheetURL, 'europe.eafe_monthly');
  }
  /**
   * Fetches the daily EAFE index, then truncates + saves to db
   * @returns {Promise.<null>}
   */
  fetchDaily() {
    Logger.info('Fetching EAFE index data (daily)');
    return fetchAndInsertSpreadsheet(EAFEDailySpreadsheetURL, 'europe.eafe_daily');
  }
}

module.exports = new EAFEScraper();
