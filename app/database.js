var database = {
    __instances: {}
};

database.load = function(instance, callback) {
    if (!instance) {
        throw "database load instance not defined";
    }
    if (database.__instances.hasOwnProperty(instance.key)) {
        var mysql = database.__instances[instance.key].mysql;
        if (mysql.ping() == 'OK' && callback) {
            return callback(database.__instances[instance.key].mysql);
        }
    }
    if (instance.type == 'sql') {
        var mysql = require('mysql2');
        var client = mysql.createConnection(database._mysql_config(instance));
        database.__instances[instance.key] = {mysql: client, ssh: undefined};
        if (callback) {
            callback(client)
        }
    } else {
        mysql_ssh = require('mysql-ssh');
        mysql_ssh.connect(database._ssh_config(instance), database._mysql_config(instance))
        .then(client => {
            database.__instances[instance.key] = {mysql: client, ssh: mysql_ssh};
            if (callback) {
                callback(client)
            }
        })
        .catch(err => {
            console.log(err)
        })
    }
};

database.closeAll = function() {
    for (var key in database.__instances) {
        if (database.__instances.hasOwnProperty(key) && !notulous.util.empty(database.__instances[key])) {
            if (!notulous.util.empty(database.__instances[key].mysql) && 'end' in database.__instances[key].mysql) {
                database.__instances[key].mysql.end(function(err) {});
            }
            if (!notulous.util.empty(database.__instances[key].ssh) && 'end' in database.__instances[key].ssh) {
                database.__instances[key].ssh.end();
            }
            database.__instances[key] = undefined;
        }
    }
};

database._ssh_config = function(instance) {
    var con = {};
    if (!notulous.util.empty(instance.ssh_host)) {
        con.host = instance.ssh_host;
    }
    if (!notulous.util.empty(instance.ssh_port)) {
        con.port = instance.ssh_port;
    }
    if (!notulous.util.empty(instance.ssh_username)) {
        con.user = instance.ssh_username;
    }
    if (!notulous.util.empty(instance.ssh_password)) {
        con.password = instance.ssh_password;
    }
    if (!notulous.util.empty(instance.ssh_key)) {
        con.privateKey = fs.readFileSync(instance.ssh_key);
    }
    return con;
};

database._mysql_config = function(instance) {
    var con = {};
    if (!notulous.util.empty(instance.host)) {
        con.host = instance.host;
    }
    if (!notulous.util.empty(instance.port)) {
        con.port = instance.port;
    }
    if (!notulous.util.empty(instance.socket)) {
        con.socket = instance.socket;
    }
    if (!notulous.util.empty(instance.username)) {
        con.user = instance.username;
    }
    if (!notulous.util.empty(instance.password)) {
        con.password = instance.password;
    }
    // if (!notulous.util.empty(instance.key)) {
    //     con.privateKey = fs.readFileSync(instance.key);
    // }
    return con;
};
