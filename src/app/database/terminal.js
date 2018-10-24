var app = app || {};

app.database = app.database || {};

app.database.terminal = {
    __customQueries: undefined
};

app.database.terminal.get = function() {
    var query = app.__editor.getValue() + ";";
    var re = /[\S\s]*?;/g;
    var found = query.match(re);
    var queries = [];
    var q;
    if (found.length == 0) {
        return undefined;
    }
    for (var key in found) {
        q = found[key].trim();
        if (q.length <= 1 || q == ";") {
            continue;
        }
        queries.push(q);
    }
    app.database.terminal.__customQueries = (queries.length == 0) ? undefined : queries;
    return app.database.terminal.__customQueries;
};