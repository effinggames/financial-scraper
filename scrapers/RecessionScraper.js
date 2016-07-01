'use strict';
const Logger = require('winston2');
const Promise = require('bluebird');
const Request = require('request-promise');
const Knex = require('../util/DatabaseHelper').knex;
const CSVParser = Promise.promisify(require('csv-parse'));

const csvUrl = 'https://fred.stlouisfed.org/graph/fredgraph.csv?chart_type=line&recession_bars=off&log_scales=&bgcolor=%23e1e9f0&graph_bgcolor=%23ffffff&fo=Open+Sans&ts=12&tts=12&txtcolor=%23444444&show_legend=yes&show_axis_titles=yes&drp=0&cosd=1854-12-01&coed=2014-08-01&height=450&stacking=&range=&mode=fred&id=USREC&transformation=lin&nd=&ost=-99999&oet=99999&lsv=&lev=&mma=0&fml=a&fgst=lin&fgsnd=2009-06-01&fq=Monthly&fam=avg&vintage_date=&revision_date=&line_color=%234572a7&line_style=solid&lw=2&scale=left&mark_type=none&mw=2&width=1168';

class RecessionScraper {
    /**
     * Fetches historical recession date data, then truncates + saves to db
     * @returns {Promise.<null>}
     */
    fetch() {
        Logger.info('Fetching recession date data');
        return Request.get(csvUrl).then(csvBuffer => {
            Logger.info('Received csv successfully');
            //'pe10' cascades so only the last value is parsed
            return CSVParser(csvBuffer, { auto_parse: true, columns: ['date', 'value'] })
        }).then(dataArray => {
            Logger.info('Formatting data');
            dataArray.shift(); //removes csv headers
            const recessions = [];
            let currentRecession = null;
            //gets start and end date for recessions
            dataArray.forEach(function(item) {
                if (!currentRecession && item.value) {
                    currentRecession = {};
                    currentRecession.start_date = item.date;
                }
                if (currentRecession && !item.value) {
                    currentRecession.end_date = item.date;
                    recessions.push(currentRecession);
                    currentRecession = null;
                }
            });
            //pushes any recession that hasn't ended yet
            if (currentRecession) {
                recessions.push(currentRecession);
            }
            return recessions;
        }).then(dataArray => {
            Logger.info('Truncating old recession data');
            return Promise.join(dataArray, Knex('usa.recessions').truncate());
        }).spread(dataArray => {
            Logger.info(`Inserting ${dataArray.length} rows`);
            return Promise.join(dataArray, Knex('usa.recessions').insert(dataArray));
        }).spread(dataArray => {
            Logger.info('All recession data should be saved');
            Logger.info(`Saved ${dataArray.length} rows`);
        });
    }
}

module.exports = new RecessionScraper();
