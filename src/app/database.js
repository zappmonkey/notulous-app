var app = app || {};

app.database = {
    __selected: undefined
};

app.database.set = function(database)
{
    app.database.tables(database);
    $("#list .top label").html("<i class='fas fa-database'></i>" + database);
    $("#workspace .content .table").remove();
    $("#workspace .content > div").hide();
    $("#workspace .top .buttons.terminal").hide();
    $("#workspace .top .buttons.table").hide();
    $("#workspace .top .buttons.database").show();
    $('#menu .databases li.active').removeClass('active');
    $('#menu .databases li[data-database="' + database + '"').addClass('active');

};

app.database.getSelected = function ()
{
    return app.database.__selected;
};

app.database.tables = function(database)
{
    app.database.__selected = database;
    app.instance.query('USE `' + database + '`;');
    app.instance.query('SHOW TABLES;' , function (err, results, fields) {
        if (err) {
            return app.error(err);
        }
        $("#list .content").html(
            notulous.util.renderTpl("tables", {tables: results})
        );
        app.actions.tables();
    });
};


