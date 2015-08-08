'use strict';
const Promise = require('bluebird');

/**
 * Migration script that sets up the initial tables + views (using db-migrate)
 */
exports.up = function(db, done) {
    Promise.promisifyAll(db);
    var liabilityFields = {
        date: {
            type: 'date',
            primaryKey: true
        },
        value: 'numeric(10,2)'
    };

    var marketCapFields = {
        date: {
            type: 'date',
            primaryKey: true
        },
        value: {
            type: 'numeric(10,3)'
        }
    };
    db.createTableAsync('corporate_liabilities', liabilityFields).then(function() {
        return db.createTableAsync('federal_gov_liabilities', liabilityFields);
    }).then(function() {
        return db.createTableAsync('local_gov_liabilities', liabilityFields);
    }).then(function() {
        return db.createTableAsync('household_liabilities', liabilityFields);
    }).then(function() {
        return db.createTableAsync('world_liabilities', liabilityFields);
    }).then(function() {
        return db.createTableAsync('financial_market_cap', marketCapFields);
    }).then(function() {
        return db.createTableAsync('nonfinancial_market_cap', marketCapFields);
    }).then(function() {
        return db.createTableAsync('sp_500_monthly', {
            date: {
                type: 'date',
                primaryKey: true
            },
            price: 'numeric(10,2)',
            dividend: 'numeric(15,12)',
            earnings: 'numeric(15,12)',
            cpi: 'numeric(12,8)',
            gs10: 'numeric(4,2)',
            pe10: 'numeric(4,2)'
        });
    }).then(function() {
        var sqlCmd = `
            CREATE VIEW total_market_cap AS
            SELECT n.date, n.value + f.value AS value
            FROM nonfinancial_market_cap n, financial_market_cap f
            WHERE n.date = f.date
        `;
        return db.runSqlAsync(sqlCmd)
    }).then(function() {
        var sqlCmd = `
            CREATE VIEW total_liabilities AS
            SELECT c.date, c.value + f.value + h.value + l.value AS value
            FROM corporate_liabilities c
                LEFT JOIN federal_gov_liabilities f ON (c.date = f.date)
                LEFT JOIN household_liabilities h ON (c.date = h.date)
                LEFT JOIN local_gov_liabilities l ON (c.date = l.date);
        `;
        return db.runSqlAsync(sqlCmd)
    }).then(function() {
        done();
    })
};

exports.down = function(db, done) {
    Promise.promisifyAll(db);

    db.runSqlAsync('DROP VIEW total_liabilities;').then(function() {
        return db.runSqlAsync('DROP VIEW total_market_cap;');
    }).then(function() {
        return db.dropTableAsync('corporate_liabilities');
    }).then(function() {
        return db.dropTableAsync('federal_gov_liabilities');
    }).then(function() {
        return db.dropTableAsync('local_gov_liabilities');
    }).then(function() {
        return db.dropTableAsync('household_liabilities');
    }).then(function() {
        return db.dropTableAsync('world_liabilities');
    }).then(function() {
        return db.dropTableAsync('financial_market_cap');
    }).then(function() {
        return db.dropTableAsync('nonfinancial_market_cap');
    }).then(function() {
        return db.dropTableAsync('sp_500_monthly');
    }).then(function() {
        done();
    })
};
