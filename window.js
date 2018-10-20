const fontawesome = require('@fortawesome/fontawesome');
const faSolid = require('@fortawesome/fontawesome-free-solid');
// const { remote } = require('electron');
const ipcRenderer = require('electron').ipcRenderer;

window.destroy = function() {
    database.closeAll();
};

$(document).ready(function() {
    app.init();
});

ipcRenderer.on('search-all', function() {
    app.search.all();
});

ipcRenderer.on('editor', function() {
    if ($("#workspace .buttons.database").is(":visible")) {
        $("#workspace .buttons.database .terminal").trigger("click");
    }
});

ipcRenderer.on('table', function() {
    if ($("#workspace .buttons.database").is(":visible")) {
        $("#workspace .buttons.database .table").trigger("click");
    }
});

ipcRenderer.on('archive', function() {
    if ($("#workspace .buttons.database").is(":visible")) {
        $("#workspace .buttons.database .archive").trigger("click");
    }
});

ipcRenderer.on('table-filter', function() {
    if ($("#workspace .buttons.table").is(":visible")) {
        $("#workspace .buttons.table .filter").trigger("click");
    }
});

ipcRenderer.on('table-reload', function() {
    app.database.refreshTable();
});

ipcRenderer.on('run-queries', function() {
    if ($("#workspace .buttons.terminal").is(":visible")) {
        $("#workspace .buttons.terminal .run").trigger("click");
    }
});

ipcRenderer.on('add-instance', function() {
    app.instance.add();
});

const {remote} = require('electron')
const {Menu, MenuItem} = remote

var item;
const template = [{
    label: 'Edit',
    click: () => {
        app.instance.edit(item.data("key"));
    }
},{
    label: 'Duplicate',
    click: () => {
        app.instance.duplicate(item.data("key"));
    }
},{
    label: 'Remove',
    click: () => {
        app.instance.remove(item.data("key"));
    }
}];
const menu = Menu.buildFromTemplate(template);

$(document).on('contextmenu', "#menu li", function(e) {
    item = $(this);
    e.preventDefault()
    menu.popup(remote.getCurrentWindow())
});
