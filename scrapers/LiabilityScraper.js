'use strict';
const XLSX = require('xlsx');
const Assert = require('assert');
const Logger = require('winston2');
const Promise = require('bluebird');
const Request = require('request-promise');
const Knex = require('./DatabaseHelper').knex;
const SpreadsheetHelper = require('./SpreadsheetHelper');

const fredGraphUrl = 'https://research.stlouisfed.org/fred2/graph/fredgraph.xls?chart_type=line&recession_bars=on&log_scales=&bgcolor=%23b3cde7&graph_bgcolor=%23ffffff&fo=verdana&ts=8&tts=8&txtcolor=%23000000&show_legend=yes&show_axis_titles=yes&drp=0&cosd=1945-10-01%2C1945-10-01%2C1945-10-01%2C1945-10-01%2C1945-10-01%2C1945-10-01%2C1945-10-01&coed=2099-04-01%2C2099-04-01%2C2099-04-01%2C2099-04-01%2C2099-04-01%2C2099-04-01%2C2099-04-01&height=378&stacking=&range=&mode=fred&id=NCBTCMDODNS%2CWCMITCMFODNS%2CSLGTCMDODNS%2CTCMILBSHNO%2CFGTCMDODNS%2CNCBEILQ027S%2CFBCELLQ027S&transformation=lin%2Clin%2Clin%2Clin%2Clin%2Clin%2Clin&nd=%2C%2C%2C%2C%2C%2C&ost=-99999%2C-99999%2C-99999%2C-99999%2C-99999%2C-99999%2C-99999&oet=99999%2C99999%2C99999%2C99999%2C99999%2C99999%2C99999&lsv=%2C%2C%2C%2C%2C%2C&lev=%2C%2C%2C%2C%2C%2C&scale=left%2Cleft%2Cleft%2Cleft%2Cleft%2Cleft%2Cleft&line_color=%230000ff%2C%23ff0000%2C%23006600%2C%23ff6600%2C%236400c8%2C%23666666%2C%23cb4ac5&line_style=solid%2Csolid%2Csolid%2Csolid%2Csolid%2Csolid%2Csolid&lw=1%2C1%2C1%2C1%2C1%2C1%2C1&mark_type=none%2C%2C%2C%2C%2C%2C&mw=4%2C4%2C4%2C4%2C4%2C4%2C4&mma=0%2C0%2C0%2C0%2C0%2C0%2C0&fml=a%2Ca%2Ca%2Ca%2Ca%2Ca%2Ca&fgst=lin%2Clin%2Clin%2Clin%2Clin%2Clin%2Clin&fgsnd=2007-12-01%2C2007-12-01%2C2007-12-01%2C2007-12-01%2C2007-12-01%2C2007-12-01%2C2007-12-01&fq=Quarterly%2C+End+of+Period%2CQuarterly%2C+End+of+Period%2CQuarterly%2C+End+of+Period%2CQuarterly%2C+End+of+Period%2CQuarterly%2C+End+of+Period%2CQuarterly%2CQuarterly&fam=avg%2Cavg%2Cavg%2Cavg%2Cavg%2Cavg%2Cavg&vintage_date=%2C%2C%2C%2C%2C%2C&revision_date=%2C%2C%2C%2C%2C%2C&width=630';

class LiabilityScraper {
    /**
     * Fetches all the liability data, then truncates + saves to db
     * @returns {Promise.<null>}
     */
    fetch() {
        Logger.info('Fetching FRED liability data');
        return Request.get(fredGraphUrl, { encoding: null }).then(xlsBuffer => {
            const workbook = XLSX.read(xlsBuffer);
            const worksheet = workbook.Sheets['FRED Graph'];
            Logger.info('Workbook successfully downloaded');

            //verify format hasn't changed
            Assert.strictEqual(worksheet.A17.w, 'observation_date');
            Assert.strictEqual(worksheet.B17.w, 'NCBTCMDODNS');
            Assert.strictEqual(worksheet.C17.w, 'WCMITCMFODNS');
            Assert.strictEqual(worksheet.D17.w, 'SLGTCMDODNS');
            Assert.strictEqual(worksheet.E17.w, 'TCMILBSHNO');
            Assert.strictEqual(worksheet.F17.w, 'FGTCMDODNS');

            //find last row of data
            let lastRow = 17;
            while (true) {
                if (worksheet['A' + (lastRow + 1)]) {
                    lastRow++;
                } else {
                    break;
                }
            }

            //get all the data
            const dateData = SpreadsheetHelper.columnRange('A', 18, lastRow).map(i => worksheet[i].w);
            const corporateData = SpreadsheetHelper.columnRange('B', 18, lastRow).map(i => worksheet[i].v);
            const worldData = SpreadsheetHelper.columnRange('C', 18, lastRow).map(i => worksheet[i].v);
            const localGovData = SpreadsheetHelper.columnRange('D', 18, lastRow).map(i => worksheet[i].v);
            const householdData = SpreadsheetHelper.columnRange('E', 18, lastRow).map(i => worksheet[i].v);
            const federalGovData = SpreadsheetHelper.columnRange('F', 18, lastRow).map(i => worksheet[i].v);

            //matches the value data to the date, and correctly formats it for the db
            const formatData = array => array.map((i, index) => ({ date: dateData[index], value: i || null }));

            //truncates the tables then saves all the data to db
            return Promise.all([
                Knex('corporate_liabilities').truncate(),
                Knex('world_liabilities').truncate(),
                Knex('local_gov_liabilities').truncate(),
                Knex('household_liabilities').truncate(),
                Knex('federal_gov_liabilities').truncate()
            ]).then(() => {
                Logger.info('Truncating old liability data');
                return Promise.all([
                    Knex('corporate_liabilities').insert(formatData(corporateData)),
                    Knex('world_liabilities').insert(formatData(worldData)),
                    Knex('local_gov_liabilities').insert(formatData(localGovData)),
                    Knex('household_liabilities').insert(formatData(householdData)),
                    Knex('federal_gov_liabilities').insert(formatData(federalGovData))
                ])
            }).then(() => {
                Logger.info('All liability data should be saved');
                Logger.info(`Saved ${lastRow} rows`);
            });
        });
    }
}

module.exports = new LiabilityScraper();