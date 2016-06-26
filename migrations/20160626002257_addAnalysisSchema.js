
exports.up = function(Knex, Promise) {
    return Knex.schema.raw('CREATE SCHEMA analysis').then(function() {
        return Knex.schema.raw(`
            CREATE VIEW analysis.sp_500_annualized_return AS
            SELECT date,
            (((lead(adjusted_close, 12) OVER (ORDER BY date ASC) / adjusted_close) ^ 1) - 1)::REAL AS return_1,
            (((lead(adjusted_close, 36) OVER (ORDER BY date ASC) / adjusted_close) ^ 0.333) - 1)::REAL AS return_3,
            (((lead(adjusted_close, 60) OVER (ORDER BY date ASC) / adjusted_close) ^ 0.2) - 1)::REAL AS return_5,
            (((lead(adjusted_close, 84) OVER (ORDER BY date ASC) / adjusted_close) ^ 0.143) - 1)::REAL AS return_7,
            (((lead(adjusted_close, 120) OVER (ORDER BY date ASC) / adjusted_close) ^ 0.1) - 1)::REAL AS return_10,
            (((lead(adjusted_close, 180) OVER (ORDER BY date ASC) / adjusted_close) ^ 0.075) - 1)::REAL AS return_15,
            (((lead(adjusted_close, 240) OVER (ORDER BY date ASC) / adjusted_close) ^ 0.05) - 1)::REAL AS return_20
            FROM usa.sp_500_monthly
        `);
    }).then(function() {
        return Knex.schema.raw(`
            CREATE VIEW analysis.usa_stock_allocation_vs_return_corr AS
            SELECT corr(a.return_1, b.percentage) AS return_1,
              corr(a.return_3, b.percentage) AS return_3,
              corr(a.return_5, b.percentage) AS return_5,
              corr(a.return_7, b.percentage) AS return_7,
              corr(a.return_10, b.percentage) AS return_10,
              corr(a.return_15, b.percentage) AS return_15,
              corr(a.return_20, b.percentage) AS return_20
            FROM analysis.sp_500_annualized_return a
            INNER JOIN usa.stock_asset_allocation b
            ON (date_trunc('month', a.date + INTERVAL '1 day') = date_trunc('month', b.date))
            AND a.return_1 > 0
            AND b.percentage > 0
        `);
    })
};

exports.down = function(Knex, Promise) {
    return Knex.schema.raw('DROP SCHEMA analysis CASCADE');
};
