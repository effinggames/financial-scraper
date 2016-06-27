'use strict';
const Program = require('commander');
const Promise = require('bluebird');
const Logger = require('winston2');
const USStockAllocationScraper = require('./scrapers/USStockAllocationScraper');
const EuropeLiabilityScraper = require('./scrapers/EuropeLiabilityScraper');
const EuropeMarketScraper = require('./scrapers/EuropeMarketScraper');
const EAFEScraper = require('./scrapers/EAFEScraper');
const SP500Scraper = require('./scrapers/SP500Scraper');

Program.version('1.0.0');

Program
    .command('fetch [name]')
    .description('fetch data and update the target collection')
    .action((name, options) => {
        name = name || 'all';
        let promise;
        switch (name) {
            case 'eafe':
                promise = EAFEScraper.fetch();
                break;
            case 'europeMarket':
                promise = EuropeMarketScraper.fetch();
                break;
            case 'europeLiabilities':
                promise = EuropeLiabilityScraper.fetch();
                break;
            case 'usaAllocation':
                promise = USStockAllocationScraper.fetch();
                break;
            case 'sp500':
                promise = SP500Scraper.fetch();
                break;
            case 'all':
                var promiseFuncs = [
                    USStockAllocationScraper.fetch,
                    SP500Scraper.fetch,
                    EAFEScraper.fetch,
                    EuropeLiabilityScraper.fetch,
                    EuropeMarketScraper.fetch
                ];
                promise = Promise.each(promiseFuncs, promiseFunc => {
                    return promiseFunc();
                });
                break;
            default:
                Logger.info('Target collection not found!');
        }
        if (!promise) {
            process.exit(1);
        } else {
            promise.catch(function(err) {
                Logger.error('Error:', err);
                process.exit(1);
            }).finally(function() {
                process.exit();
            });
        }
    });

Program.parse(process.argv);
