const {remote} = require('electron')
const {Menu, MenuItem} = remote

app.contextmenu = {
    instanceItem: undefined,
    processItem: undefined
};

app.contextmenu.instanceTemplate = [{
    label: 'Edit',
    click: () => {
        app.instance.edit(app.contextmenu.instanceItem.data("key"));
    }
},{
    label: 'Duplicate',
    click: () => {
        app.instance.duplicate(app.contextmenu.instanceItem.data("key"));
    }
},{
    label: 'Remove',
    click: () => {
        app.instance.remove(app.contextmenu.instanceItem.data("key"));
    }
}];
app.contextmenu.instance = Menu.buildFromTemplate(app.contextmenu.instanceTemplate );

$(document).on('contextmenu', "#menu li", function(e) {
    app.contextmenu.instanceItem = $(this);
    e.preventDefault()
    app.contextmenu.instance.popup(remote.getCurrentWindow())
});

app.contextmenu.processlistTemplate = [{
    label: 'Kill query',
    click: () => {
        app.instance.kill(app.contextmenu.processItem.find("td:first-child").text());
    }
},{
    label: 'Kill connection',
    click: () => {
        app.instance.killConnection(app.contextmenu.processItem.find("td:first-child").text());
    }
}];
app.contextmenu.processlist = Menu.buildFromTemplate(app.contextmenu.processlistTemplate );

$(document).on('contextmenu', "#modal table[data-table='processlist'] tr", function(e) {
    app.contextmenu.processItem = $(this);
    e.preventDefault()
    app.contextmenu.processlist.popup(remote.getCurrentWindow())
});