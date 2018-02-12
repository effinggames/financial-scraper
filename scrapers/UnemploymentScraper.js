const Logger = require('winston2'),
  Promise = require('bluebird'),
  Request = require('request-promise'),
  Knex = require('../util/DatabaseHelper').knex,
  CSVParser = Promise.promisify(require('csv-parse'));

const csvUrl =
  'https://fred.stlouisfed.org/graph/fredgraph.csv?chart_type=line&recession_bars=on&log_scales=&bgcolor=%23e1e9f0&graph_bgcolor=%23ffffff&fo=Open+Sans&ts=12&tts=12&txtcolor=%23444444&show_legend=yes&show_axis_titles=yes&drp=0&cosd=1948-01-01&coed=2099-05-01&height=450&stacking=&range=&mode=fred&id=UNRATE&transformation=lin&nd=&ost=-99999&oet=99999&lsv=&lev=&mma=0&fml=a&fgst=lin&fgsnd=2009-06-01&fq=Monthly&fam=avg&vintage_date=&revision_date=&line_color=%234572a7&line_style=solid&lw=2&scale=left&mark_type=none&mw=2&width=1168';

class UnemploymentScraper {
  /**
   * Fetches historical unemployment rate data, then truncates + saves to db
   * @returns {Promise.<null>}
   */
  fetch() {
    Logger.info('Fetching unemployment rate data');
    return Request.get(csvUrl)
      .then(csvBuffer => {
        Logger.info('Received csv successfully');
        //'pe10' cascades so only the last value is parsed
        return CSVParser(csvBuffer, {auto_parse: true, columns: ['date', 'percentage']});
      })
      .then(dataArray => {
        Logger.info('Formatting data');
        dataArray.shift(); //removes csv headers
        dataArray.forEach(obj => {
          obj.percentage /= 100; //convert to decimal percentage
        });

        return dataArray;
      })
      .then(dataArray => {
        Logger.info('Truncating old unemployment data');
        return Promise.join(dataArray, Knex('usa.unemployment_rate').truncate());
      })
      .spread(dataArray => {
        Logger.info(`Inserting ${dataArray.length} rows`);
        return Promise.join(dataArray, Knex('usa.unemployment_rate').insert(dataArray));
      })
      .spread(dataArray => {
        Logger.info('All unemployment data should be saved');
        Logger.info(`Saved ${dataArray.length} rows`);
      });
  }
}

module.exports = new UnemploymentScraper();
