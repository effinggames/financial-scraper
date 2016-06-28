
exports.up = function(Knex, Promise) {
    return Knex.schema.raw('CREATE SCHEMA europe').then(function() {
        return Knex.schema.withSchema('europe').createTable('total_liabilities', function (table) {
            table.date('date').primary();
            table.bigInteger('value');
        });
    }).then(function() {
        return Knex.schema.withSchema('europe').createTable('total_market', function (table) {
            table.date('date').primary();
            table.bigInteger('value');
        });
    }).then(function() {
        return Knex.schema.withSchema('europe').createTable('eafe_monthly', function (table) {
            table.date('date').primary();
            table.decimal('value', 9, 3);
        });
    }).then(function() {
        return Knex.schema.withSchema('europe').createTable('eafe_daily', function (table) {
            table.date('date').primary();
            table.decimal('value', 9, 3);
        });
    }).then(function() {
        return Knex.schema.raw(`
            CREATE VIEW europe.stock_asset_allocation AS
              SELECT a.date, (b.value::FLOAT / (b.value::FLOAT + a.value::FLOAT)) AS percentage
              FROM europe.total_liabilities a
              INNER JOIN europe.total_market b
              ON a.date = b.date
        `);
    }).then(function() {
        return Knex.schema.raw(`
            CREATE VIEW analysis.eafe_annualized_return AS
            SELECT date,
            (((lead(value, 12) OVER (ORDER BY date ASC) / value) ^ 1) - 1)::REAL AS return_1,
            (((lead(value, 36) OVER (ORDER BY date ASC) / value) ^ 0.333) - 1)::REAL AS return_3,
            (((lead(value, 60) OVER (ORDER BY date ASC) / value) ^ 0.2) - 1)::REAL AS return_5,
            (((lead(value, 84) OVER (ORDER BY date ASC) / value) ^ 0.143) - 1)::REAL AS return_7,
            (((lead(value, 120) OVER (ORDER BY date ASC) / value) ^ 0.1) - 1)::REAL AS return_10,
            (((lead(value, 180) OVER (ORDER BY date ASC) / value) ^ 0.075) - 1)::REAL AS return_15,
            (((lead(value, 240) OVER (ORDER BY date ASC) / value) ^ 0.05) - 1)::REAL AS return_20
            FROM europe.eafe_monthly
        `);
    }).then(function() {
        return Knex.schema.raw(`
            CREATE VIEW analysis.europe_stock_allocation_vs_return_corr AS
            SELECT corr(a.return_1, b.percentage) AS return_1,
              corr(a.return_3, b.percentage) AS return_3,
              corr(a.return_5, b.percentage) AS return_5,
              corr(a.return_7, b.percentage) AS return_7,
              corr(a.return_10, b.percentage) AS return_10,
              corr(a.return_15, b.percentage) AS return_15,
              corr(a.return_20, b.percentage) AS return_20
            FROM analysis.eafe_annualized_return a
            INNER JOIN europe.stock_asset_allocation b
            ON (date_trunc('month', a.date + INTERVAL '1 day') = date_trunc('month', b.date))
            AND a.return_1 > 0
            AND b.percentage > 0
        `);
    });
};

exports.down = function(Knex, Promise) {
    return Knex.schema.raw('DROP SCHEMA europe CASCADE');
};
