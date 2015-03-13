var SqlExecute = require( '../lib/SqlExecute.js' );

var settings = require( '/srv/www/settings.json' ).sql;
var DataServers = settings.DataServers;
var connections = [];
var servers = settings.RemoteAddress;

var i;
for ( i = 1; i < 5; i++ ) {
    var db = settings["DataLogon" + i];
    db.failPartner = DataServers["db" + i].failPartner;
    db.failover = settings["DataLogon" + db.failPartner];
    db.server = servers[i];
    db.options = {}

    connections[i] = db;    
}

var params = {id: 1234, name: "Kevin Barnett", now: new Date()};
var connection = { server: "localhost", database: "dbname", userName: "User", password: "password", options: {} };
var statement = "Select * From forms Where id = @id and name = @name and createdDate < @now;"

var sqlexecute = new SqlExecute( [statement, params, connection, function ( err, result ) {
    if ( err ) { console.log( err ); }
    console.log( result );
    }] );