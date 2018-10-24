var app = app || {};

app.history = {
    maxLength: 1000,
};
app.history.add = function(query) {
    var history = notulous.storage.get('history');
    if (!history) {
        history = [];
    }
    if (query instanceof Object) {
        query = query.sql;
    }
    history.unshift({
        date: Date(),
        instance: app.instance.getSelected(),
        database: app.database.getSelected(),
        query: query
    });
    if (history.length > app.history.maxLength) {
        history.pop();
    }
    notulous.storage.set("history", history);
};
