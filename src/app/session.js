var app = app || {};

app.session = {
    store: [],
    index: 0,
    allow: true
};

app.session.reset = function()
{
    app.session.store = [];
};

app.session.hasPrevious = function()
{
    return app.session.index > 0;
};

app.session.hasNext = function()
{
    return app.session.index < app.session.store.length - 1;
};

app.session.add = function(type, data)
{
    if (!app.session.allow) {
        app.session.allow = true;
        return;
    }
    app.session.store.unshift({
        type: type,
        data: data
    });
    app.session.index = app.session.store.length - 1;
};

app.session.getPrevious = function()
{
    app.session.index--;
    if (app.session.index < 0) {
        app.session.index = 0;
    }
    app.session.allow = false;
    return app.session.store[app.session.index];
};

app.session.getNext = function()
{
    app.session.index++;
    if (app.session.index > app.session.store.length - 1) {
        app.session.index = app.session.store.length - 1;
    }
    app.session.allow = false;
    return app.session.store[app.session.index];
};
