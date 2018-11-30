const {remote} = require('electron')
const {Menu, MenuItem} = remote
const path = require('path');

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
},{
    label: 'Copy',
    click: () => {
        var row = "";
        app.contextmenu.processItem.find("td").each(function() {
            if (row != "") {
                row += "\t";
            }
            row += $(this).text();
        });
        notulous.util.copyToClipboard(row);
    }
}];
app.contextmenu.processlist = Menu.buildFromTemplate(app.contextmenu.processlistTemplate );

$(document).on('contextmenu', "#modal table[data-table='processlist'] tr", function(e) {
    app.contextmenu.processItem = $(this);
    e.preventDefault()
    app.contextmenu.processlist.popup(remote.getCurrentWindow())
});

app.contextmenu.selectedRecordTemplate = [{
    label: 'Copy',
    click: () => {
        var table = $("table.editable:visible");
        var rows = "";
        var row = "";
        table.find("tr.selected").each(function() {
            $(this).find("td span").each(function () {
                if (row != "") {
                    row += "\t";
                }
                row += $(this).text();
            });
            rows += row + '\n';
            row = "";
        });
        notulous.util.copyToClipboard(rows);
    }
},{
    label: 'Copy with names',
    click: () => {
        var table = $("table.editable:visible");
        var rows = "";
        var row = "";
        table.find(".header th").each(function () {
            if (row != "") {
                row += "\t";
            }
            row += $(this).text().trim();
        });
        rows += row + '\n';
        row = "";
        table.find("tr.selected").each(function() {
            $(this).find("td span").each(function () {
                if (row != "") {
                    row += "\t";
                }
                row += $(this).text();
            });
            rows += row + '\n';
            row = "";
        });
        notulous.util.copyToClipboard(rows);
    }
},{
    label: 'Copy as insert',
    click: () => {
        var table = $("table.editable:visible");
        var query = "INSERT INTO `" + table.data("table") + "` (";
        var first = true;
        var val;
        table.find(".header th").each(function () {
            if (!first) {
                query += ", ";
            }
            query += "`" + $(this).text().trim() + "`";
            first = false;
        });
        query += ")\n VALUES \n";

        var firstRow = true;
        table.find("tr.selected").each(function() {
            if (!firstRow) {
                query += ",\n";
            }
            query += "(";
            var first = true;
            $(this).find("td span").each(function () {
                if (!first) {
                    query += ", ";
                }
                val = $(this).text();
                if (val == "" && $(this).hasClass("nullable")) {
                    query += "NULL";
                } else if ($(this).data("type") == 'INT') {
                    query += val;
                } else {
                    query += "'" + val + "'";
                }
                first = false;
            });
            query += ")";
            firstRow = false;
        });
        notulous.util.copyToClipboard(query);
    }
}, {
    type: 'separator'
}, {
    label: 'Delete',
    click: () => {
        var table = $("table.editable:visible");
        var rows = table.find("tr.selected");
        var additional = rows.length > 1 ? 's' : '';
        var choice = remote.dialog.showMessageBox(
            remote.getCurrentWindow(),
            {
                type: 'question',
                buttons: ['Proceed', 'Cancel'],
                title: 'Delete record' + additional,
                message: 'Are you sure you want to delete selected record' + additional + '?',
                icon: path.join(__dirname, '../assets/icons/notulous.iconset/icon_32x32@2x.png')
            });
        if (choice === 1) {
            return;
        }
        app.database.table.structure(table.data('table'), function(structure) {
            var keys = [];
            rows.each(function() {
                keys.push($(this).find("span[data-primary='true']").text());
            });
            app.instance.query("DELETE FROM `" + table.data('table') + "` WHERE `" + structure.primary.column + "` IN (" + keys.join(',')+ ");" , function (err, records, fields) {
                if (err) {
                    return app.error(err);
                }
                rows.each(function() {
                    $(this).remove();
                });
            });
        });
    }
}, {
    type: 'separator'
}, {
    id: 'duplicate',
    label: 'Duplicate',
    click: () => {
        var row = "";
        app.contextmenu.processItem.find("td").each(function() {
            if (row != "") {
                row += "\t";
            }
            row += $(this).text();
        });
        notulous.util.copyToClipboard(row);
    }
}];
app.contextmenu.selectedRecord = Menu.buildFromTemplate(app.contextmenu.selectedRecordTemplate);
$(document).on('contextmenu', "table.editable tr.selected", function(e) {
    e.preventDefault();
    if ($("table.editable tr.selected").length > 1) {
        app.contextmenu.selectedRecord.getMenuItemById("duplicate").enabled = false;
    } else {
        app.contextmenu.selectedRecord.getMenuItemById("duplicate").enabled = true;
    }
    app.contextmenu.selectedRecord.popup(remote.getCurrentWindow())
});