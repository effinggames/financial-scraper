'use strict';
const Program = require('commander'),
  Promise = require('bluebird'),
  Logger = require('winston2'),
  USStockAllocationScraper = require('./scrapers/USStockAllocationScraper'),
  EuropeLiabilityScraper = require('./scrapers/EuropeLiabilityScraper'),
  EuropeMarketScraper = require('./scrapers/EuropeMarketScraper'),
  EAFEScraper = require('./scrapers/EAFEScraper'),
  SP500Scraper = require('./scrapers/SP500Scraper'),
  UnemploymentScraper = require('./scrapers/UnemploymentScraper'),
  RecessionScraper = require('./scrapers/RecessionScraper');

Program.version('1.0.0');

Program.command('fetch [name]')
  .description('fetch data and update the target collection')
  .action(name => {
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
        promise = Promise.each([EAFEScraper.fetchDaily, SP500Scraper.fetchDaily], promiseFunc => {
          return promiseFunc();
        });
        break;
      case 'all':
        promise = Promise.each(
          [
            USStockAllocationScraper.fetch,
            UnemploymentScraper.fetch,
            RecessionScraper.fetch,
            EuropeLiabilityScraper.fetch,
            EuropeMarketScraper.fetch,
            EAFEScraper.fetch,
            EAFEScraper.fetchDaily,
            SP500Scraper.fetch,
            SP500Scraper.fetchDaily
          ],
          promiseFunc => {
            return promiseFunc();
          }
        );
        break;
      default:
        Logger.info('Target collection not found!');
    }
    if (!promise) {
      process.exit(1);
    } else {
      promise
        .catch(function(err) {
          Logger.error(err);
          process.exit(1);
        })
        .finally(function() {
          process.exit();
        });
    }
  });

Program.parse(process.argv);
