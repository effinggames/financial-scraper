'use strict';
const Program = require('commander');
const Promise = require('bluebird');
const Logger = require('winston2');
const USStockAllocationScraper = require('./scrapers/USStockAllocationScraper');
const EuropeLiabilityScraper = require('./scrapers/EuropeLiabilityScraper');
const EuropeMarketScraper = require('./scrapers/EuropeMarketScraper');
const EAFEScraper = require('./scrapers/EAFEScraper');
const SP500Scraper = require('./scrapers/SP500Scraper');
const UnemploymentScraper = require('./scrapers/UnemploymentScraper');
const RecessionScraper = require('./scrapers/RecessionScraper');

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
            case 'eafeDaily':
                promise = EAFEScraper.fetchDaily();
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
            case 'sp500Daily':
                promise = SP500Scraper.fetchDaily();
                break;
            case 'unemployment':
                promise = UnemploymentScraper.fetch();
                break;
            case 'recessions':
                promise = RecessionScraper.fetch();
                break;
            case 'daily':
                var promiseFuncs = [
                    SP500Scraper.fetchDaily,
                    EAFEScraper.fetchDaily
                ];
                promise = Promise.each(promiseFuncs, promiseFunc => {
                    return promiseFunc();
                });
                break;
            case 'all':
                var promiseFuncs = [
                    USStockAllocationScraper.fetch,
                    SP500Scraper.fetch,
                    SP500Scraper.fetchDaily,
                    EAFEScraper.fetch,
                    EAFEScraper.fetchDaily,
                    UnemploymentScraper.fetch,
                    RecessionScraper.fetch,
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
