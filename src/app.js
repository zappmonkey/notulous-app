var crypt = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'd6F3Efeq';

var app = app || {};

app.name = "Notulous";
app.__con = undefined;
app.__mysql = undefined;
app.__editor = undefined;
app.__config = undefined;

app.init = function() {
    app.view.restore();
    app.actions.init();
    app.instance.get();
    app.search.init();
};

app.error = function(err) {
    app.notification.add("Error in query", err.message, "error");
    return err.message;
};

app.config = function() {
    if (!app.__config) {
        app.__config = notulous.config.load();
    }
    return app.__config;
};

app.hash = function(length) {
    if (!length) {
        length = 12;
    }
    var hash = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++) {
        hash += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return hash;
};

app.urlify = function(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "-").replace(/^-+|-+$/g, '');
};

app.encrypt = function(text, secret) {
    var cipher = crypt.createCipher(algorithm, password+secret);
    var crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
};

app.decrypt = function(text, secret) {
    var decipher = crypt.createDecipher(algorithm, password+secret);
    var dec = decipher.update(text,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
};

app.convertToQuery = function(field, filter, value1, value2) {
    var query = '`' + field + '` ';
    switch (filter.toLowerCase()) {
        case 'not contains':
            query += 'NOT LIKE "%' + value1 + '%"';
            break;
        case 'contains':
            query += 'LIKE "%' + value1 + '%"';
            break;
        case 'is null':
        case 'is not null':
            query += filter;
            break;
        case 'between':
            query += filter + ' "' + value1 + '" AND "' + value2 + '"';
            break;
        case 'in':
            query += 'IN (' + value1 + ')';
            break;
        default:
            query += filter + ' "' + value1 + '"';
    }
    return query;
};
