const $ = require('jquery');
const Handlebars = require('handlebars');
const fs = require("fs");

var zappwork = {};

zappwork.config = {
    __config: undefined
};
zappwork.config.load = function() {
    if (zappwork.config.__config == undefined) {
        var config = fs.readFileSync("./config.json");
        zappwork.config.__config = JSON.parse(config);
    }
    return zappwork.config.__config;
};
zappwork.config.instance = function(key) {
    var config = zappwork.config.load();
    if (config.instances.hasOwnProperty(key)) {
        return config.instances[key];
    }
    return undefined;
};

zappwork.util = {};
zappwork.util.empty = function(val) {
    switch (val) {
        case undefined:
        case null:
        case "":
        case false:
        case 0:
            return true;
    }
    return false;
}
zappwork.util.fuzzyCompare = function(search, compare) {
    if (compare == undefined || search == undefined) {
        return false;
    }
    var queries = search.split("|");
    var regex = "";
    for (var key in queries) {
        if (regex != "") {
            regex += "|";
        }
        regex += ".*?" + search.toLowerCase().replace(/-/g, "\\-").split("").join(".*?") + ".*?";
    }
    return compare.toLowerCase().match(regex);
};

zappwork.util.renderTpl = function(tpl, data) {
    if (data == undefined) {
        data = {};
    }
    return Handlebars.compile($("#tpl-" + tpl).html())(data);
};

zappwork.storage = {};
zappwork.storage.set = function(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
};

zappwork.storage.unset = function(key) {
    localStorage.removeItem(key);
};

zappwork.storage.get = function(key) {
    var i = localStorage.getItem(key);
    if (!i) {
        return undefined;
    }
    return JSON.parse(i);
};

zappwork.storage.clear = function() {
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
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(1) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
});

Handlebars.registerHelper('property', function(obj, property, startswith, caseinsensitive) {
    if (!startswith && !caseinsensitive) {
        if (obj,hasOwnProperty(property)) {
            return obj[property];
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
