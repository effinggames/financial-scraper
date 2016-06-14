'use strict';
const Program = require('commander');
const Promise = require('bluebird');
const Logger = require('winston2');
const StockAllocationScraper = require('./scrapers/StockAllocationScraper');
const SP500Scraper = require('./scrapers/SP500Scraper');

Program.version('1.0.0');

Program
    .command('fetch [name]')
    .description('fetch data and update the target collection')
    .action((name, options) => {
        name = name || 'all';
        let promise;
        switch (name) {
            case 'stockAllocation':
                promise = StockAllocationScraper.fetch();
                break;
            case 'sp500':
                promise = SP500Scraper.fetch();
                break;
            case 'all':
                promise = Promise.reduce([StockAllocationScraper.fetch, SP500Scraper.fetch], (total, promise) => {
                    return promise();
                }, 0);
                break;
            default:
                Logger.info('Target collection not found!');
        }
        if (!promise) {
            process.exit(1);
        } else {
            promise
                .catch(err => {
                    Logger.error('Error:', err);
                    process.exit(1);
                })
                .finally(() => process.exit());
        }
    });

Program.parse(process.argv);
