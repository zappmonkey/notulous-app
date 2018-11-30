const $ = require('jquery');
const Handlebars = require('handlebars');
const fs = require("fs");

var notulous = {};

notulous.config = {
    __config: undefined
};
notulous.config.load = function() {
    if (notulous.config.__config == undefined) {
        var config = fs.readFileSync("./config.json");
        notulous.config.__config = JSON.parse(config);
    }
    return notulous.config.__config;
};

notulous.config.save = function(config) {
    fs.writeFile("./config.json", JSON.stringify(config), function(err) {
        if(err) {
            console.log(err);
            throw "Unable to save configuration";
        }
        notulous.config.__config = config;
    });
};

notulous.config.instance = function(key) {
    var config = notulous.config.load();
    if (config.instances.hasOwnProperty(key)) {
        return JSON.parse(JSON.stringify(config.instances[key]));
    }
    return undefined;
};

notulous.util = {};
notulous.util.empty = function(val) {
    switch (val) {
        case undefined:
        case null:
        case "":
        case false:
        case 0:
            return true;
    }
    return false;
};

notulous.util.fuzzyCompare = function(search, compare, startWith) {
    if (compare == undefined || search == undefined) {
        return false;
    }
    var queries = search.split("|");
    var regex = "";
    var first = ".*?";
    if (startWith) {
        first = "^";
    }
    for (var key in queries) {
        if (regex != "") {
            regex += "|";
        }
        regex += first + queries[key].toLowerCase().replace(/-/g, "\\-").split("").join(".*?") + ".*?";
    }
    return compare.toLowerCase().match(regex);
};

notulous.util.renderTpl = function(tpl, data) {
    if (data == undefined) {
        data = {};
    }
    return Handlebars.compile($("#tpl-" + tpl).html())(data);
};

notulous.util.copyToClipboard = function(text) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(text).select();
    document.execCommand("copy");
    $temp.remove();
};

notulous.storage = {};
notulous.storage.set = function(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
};

notulous.storage.unset = function(key) {
    localStorage.removeItem(key);
};

notulous.storage.get = function(key) {
    var i = localStorage.getItem(key);
    if (!i) {
        return undefined;
    }
    return JSON.parse(i);
};

notulous.storage.clear = function() {
    localStorage.clear();
};

var DateFormats = {
       short: "DD MMMM YYYY",
       short_with_time: "[on the] Do [of] MMM YYYY [at] HH:mm",
       long: "dddd DD.MM.YYYY HH:mm"
};

Handlebars.registerHelper("formatDate", function(datetime, format) {
    if (moment) {
        // can use other formats like 'lll' too
        format = DateFormats[format] || format;
        return moment(datetime).format(format);
    } else {
        return datetime;
    }
});

Handlebars.registerHelper('ifEq', function(v1, v2, options) {
    if(v1 == v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('ifNotEq', function(v1, v2, options) {
    if(v1 != v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('ifSmaller', function(v1, v2, options) {
    if(v1 < v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('ifGreater', function(v1, v2, options) {
    if(v1 > v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('truncate', function(string, length, append) {
    if (!append) {
        append = "...";
    }
    var tmp = document.createElement("div");
    tmp.innerHTML = string;
    text = tmp.textContent || tmp.innerText;
    text = text.replace(/(\r\n|\n|\r)/gm,"").trim();
    if (text.length > length) {
        text = text.substring(0, length) + append;
    }
    return text;
});

Handlebars.registerHelper('filesize', function(size) {
    if (notulous.util.empty(size)) {
        return '0 B';
    }
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(1) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
});

Handlebars.registerHelper('property', function(obj, property, startswith, caseinsensitive) {
    if (!startswith && !caseinsensitive) {
        try {
            if (obj[property]) {
                return obj[property];
            }
        } catch (err) {
            console.log(err);
        }
    } else {
        if (caseinsensitive) {
            property = property.toLowerCase();
        }
        for (var prop in obj) {
            tprop = prop
            if (caseinsensitive) {
                tprop = tprop.toLowerCase();
            }
            if (startswith) {
                if (tprop.startsWith(property)) {
                    return obj[prop];
                }
            } else if (tprop == property) {
                return obj[prop];
            }
        }
    }
    return null;
});

Handlebars.registerHelper('recordValue', function(relations, fields, index, rowIndex, value)
{
    rowIndex++;
    var classes = "";
    var related = "";
    var column, options;
    var type;
    if (fields) {
        if (fields[index].options) {
            options = fields[index].options.join(",");
        }
        if (fields[index].nullable) {
            classes = 'nullable';
        }
        column = fields[index].column;
        type = fields[index].type;
    }

    if (relations && column && relations[column]) {
        related = '<i class="has-foreign" data-table="' + relations[column].table + '" data-column="' + relations[column].column + '"><i class="fas fa-link"></i></i>'
    }
    var tabindex = String(rowIndex) + String(index);
    if (value === null) {
        value = "";
    }
    return '<span date-type="' + type + '" date-options="' + options + '" class="' + classes + '" tabindex="' + tabindex + '">' + Handlebars.Utils.escapeExpression(value) + '</span>' + related;
});

Handlebars.registerHelper('formElement', function(column, record)
{
    var classes, placeholder;
    if (column.nullable) {
        classes = 'nullable';
        placeholder = 'NULL';
    }
    var value = record[column.column];
    if (value === null) {
        value = "";
    }

    // This should be input
    if (
        column.type == 'DATE' ||
        column.type == 'DATETIME' ||
        column.type == 'TIME' ||
        column.type == 'YEAR' ||
        column.type.substr(0,3) == 'DEC' ||
        column.type.substr(0,3) == 'INT' ||
        column.type.substr(0,6) == 'DOUBLE'||
        column.type.substr(0,9) == 'MEDIUMINT' ||
        column.type.substr(0,4) == 'TINY' ||
        column.type.substr(0,5) == 'SMALL' ||
        column.type.substr(0,5) == 'BIG'||
        (
            column.type.substr(0,7) == 'VARCHAR' && column.length < 128
        ) ||
        (
            column.type == 'ENUM' && column.options.length == 0
        )
    ) {
        if (column.key == 'PRI') {
            classes = 'primary ' + classes;
        }
        return '<input type="text" class="' + classes + '" data-field="' + column.column + '" data-value="' + value + '" value="' + value + '" placeholder="' + placeholder + '"/>';
    }

    if (column.type == 'ENUM') {
        var el =  '<select class="' + classes + '" data-field="' + column.column + '" data-value="' + value + '">';
        if (column.nullable) {
            selected = value == "" ? ' selected="selected"' : "";
            el +=  '<option value=""' + selected + '>NULL</option>';
        }
        for (var prop in column.options) {
            var val = column.options[prop];
            selected = value == val ? ' selected="selected"' : "";
            el +=  '<option value="' + val + '"' + selected + '>' + val + '</option>';
        }
        el += '</select>';
        return el;
    }
    return '<textarea class="' + classes + '" data-field="' + column.column + '" data-value="' + value + '" placeholder="' + placeholder + '">' + Handlebars.Utils.escapeExpression(value) + '</textarea>';
});

Handlebars.registerHelper('isInput', function(type, options) {
    // console.log(type);
    type = type.toLowerCase();
    if (type.substr(0,3) == 'dec' || type.substr(0,3) == 'int' || type.substr(0,9) == 'mediumint') {
        return options.fn(this);
    }
    if (type.substr(0,7) == 'varchar' && type.substring(8, type.length-1) < 257) {
        return options.fn(this);
    }
    if (type.substr(0,4) == 'tiny' || type.substr(0,5) == 'small' || type.substr(0,5) == 'big') {
        return options.fn(this);
    }

    switch (type) {
        case 'date':
        case 'datetime':
        case 'time':
        case 'year':
            return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('dateFormat', function(date, format) {
    if (window.moment) {
        var f = format || "MMM Do, YYYY";
        if (!(date instanceof Date)) {
            date = new Date();
        }
        return moment(date).format(f);
    }else{
        return date;
    };
});

$.fn.selectRange = function() {
    return this.each(function() {
        var sel = window.getSelection();
        sel.removeAllRanges();
        var range = document.createRange();
        range.selectNodeContents(this);
        sel.addRange(range);
        this.focus();
    });
};