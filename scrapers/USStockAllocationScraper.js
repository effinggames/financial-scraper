const XLSX = require('xlsx'),
  Assert = require('assert'),
  Logger = require('winston2'),
  Request = require('request-promise'),
  Knex = require('../util/DatabaseHelper').knex,
  SpreadsheetHelper = require('../util/SpreadsheetHelper');

const fredGraphUrl =
  'https://fred.stlouisfed.org/graph/fredgraph.xls?chart_type=line&recession_bars=on&log_scales=&bgcolor=%23b3cde7&graph_bgcolor=%23ffffff&fo=Open+Sans&ts=8&tts=8&txtcolor=%23000000&show_legend=yes&show_axis_titles=yes&drp=0&cosd=1945-10-01&coed=2099-01-01&height=378&stacking=&range=&mode=fred&id=NCBEILQ027S_BCNSDODNS_CMDEBT_FGSDODNS_SLGSDODNS_FBCELLQ027S_DODFFSWCMI&transformation=lin_lin_lin_lin_lin_lin_lin&nd=______&ost=-99999_-99999_-99999_-99999_-99999_-99999_-99999&oet=99999_99999_99999_99999_99999_99999_99999&lsv=&lev=&scale=left&line_color=%230000ff&line_style=solid&lw=3&mark_type=none&mw=4&mma=0&fml=((a%2Bf)%2F1000)%2F(((a%2Bf)%2F1000)%2Bb%2Bc%2Bd%2Be%2Bg)&fgst=lin&fgsnd=2007-12-01&fq=Quarterly&fam=avg&vintage_date=&revision_date=&width=630';

class USStockAllocationScraper {
  /**
   * Fetches stock market allocation data, then truncates + saves to db
   * @returns {Promise.<null>}
   */
  fetch() {
    Logger.info('Fetching US stock market allocation data');
    return Request.get(fredGraphUrl, {encoding: null}).then(xlsBuffer => {
      const workbook = XLSX.read(xlsBuffer);
      const worksheet = workbook.Sheets['FRED Graph'];
      Logger.info('Workbook successfully downloaded');

      //verify format hasn't changed
      Assert.strictEqual(worksheet.A11.w, 'observation_date');
      Assert.strictEqual(
        worksheet.B11.w,
        'NCBEILQ027S_BCNSDODNS_CMDEBT_FGSDODNS_SLGSDODNS_FBCELLQ027S_DODFFSWCMI'
      );

      //find last row of data
      let lastRow = 11;
      while (worksheet['A' + (lastRow + 1)]) {
        lastRow++;
      }

      //get all the data
      const dateData = SpreadsheetHelper.columnRange('A', 12, lastRow).map(i => worksheet[i].w);
      const stockAllocationData = SpreadsheetHelper.columnRange('B', 12, lastRow).map(
        i => worksheet[i].v || null
      );

      //matches the value data to the date, and correctly formats it for the db
      const formatData = array => array.map((i, index) => ({date: dateData[index], percentage: i}));

      //truncates the tables then saves all the data to db
      return Knex('usa.stock_asset_allocation')
        .truncate()
        .then(function() {
          Logger.info('Truncating old market cap data');
          return Knex('usa.stock_asset_allocation').insert(formatData(stockAllocationData));
        })
        .then(function() {
          Logger.info('All market cap data should be saved');
          Logger.info(`Saved ${lastRow} rows`);
        });
    });
  }
}

module.exports = new USStockAllocationScraper();
