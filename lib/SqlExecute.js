var path = require( 'path' );

var PoolManager = require( path.resolve( './lib/PoolManager.js' ) );
var poolmanager = new PoolManager( );
var Request = require( 'tedious' ).Request;
var Util = require( 'util' );

//global connection list - used to track failover
//properties are made up of server-database-port
var connectionList = {}; 

var SqlExecute = module.exports = function ( args ) {
    //pass arguments as statement String, params Object, optional connection Object, optional callback Function
    var sqlexecute = this, i;
    args = args || [];
    
    //load arguments
    for ( i = 0; i < args.length; i++ ) {
        if ( typeof args[i] === "string" ) { sqlexecute.statement = args[i]; continue; }
        if ( typeof args[i] === "function" ) { sqlexecute.callback = args[i]; continue; }
        if ( typeof args[i] === "object" && args[i].hasOwnProperty( "server" ) && args[i].hasOwnProperty( "userName" ) && args[i].hasOwnProperty( "database" ) && args[i].hasOwnProperty("password") ) {
            sqlexecute.connection = args[i];
            continue;
        }
        if ( typeof args[i] === "object" ) { sqlexecute.params = args[i]; }
    } //end args loop
    
    //validate arguments
    var noStatement = "Error: a sql query statement type String is required."
    if ( !sqlexecute.statement ) { return sqlexecute.throwError( noStatement ); }
    
    sqlexecute.connection = sqlexecute.connection || sqlexecute.defalutConfig;
    var noConnection = "Error: a connection object is required.  Properties: server: String, user: String, password: String, database: String.  Either setup a default connection when creating a new sql-tedious object or pass a connection object with your query.";
    if ( !sqlexecute.connection || !sqlexecute.connection.server ) { return sqlexecute.throwError( noConnection ); }
    
    //this will tell tedious to handle row events and return all rows from sql calls in new Request callback.
    sqlexecute.connection.options.rowCollectionOnRequestCompletion = true;
    
    //add connection try if not defined
    if ( typeof sqlexecute.connection.currentAttempts === "undefined" ) { sqlexecute.connection.currentAttempts = sqlexecute.defalutConfig.currentAttempts }
    if ( typeof sqlexecute.connection.TotalAttempts === "undefined" ) { sqlexecute.connection.TotalAttempts = sqlexecute.defalutConfig.TotalAttempts }

    //move connection properties to optins
    sqlexecute.connection.options.database = sqlexecute.connection.database;
    delete sqlexecute.connection.database;
    sqlexecute.connection.options.port = sqlexecute.connection.port;
    delete sqlexecute.connection.port;

    sqlexecute.params = sqlexecute.params || {};
    sqlexecute.pool = poolmanager.pool( sqlexecute.connection );    
    sqlexecute.pool.acquire( function (error, connection) { sqlexecute.exec( error, connection ); } );
};

SqlExecute.prototype.addParams = function () {
    var sqlexecute = this, params = sqlexecute.params;
    if ( typeof sqlexecute.request === "undefined" ) { sqlexecute.throwError( "Opps, we don't have a valid sql request." ); }
    
    var TYPES = require( 'tedious' ).TYPES
    var param, type;
    for ( param in params ) {
        if ( params.hasOwnProperty( param ) ) {
            if ( Util.isDate( params[param] ) ) { sqlexecute.request.addParameter( param, TYPES.DateTime, params[param] ); continue; }
            if ( String( params[param] ).indexOf( "." ) !== -1 && !isNaN( parseFloat( params[param] ) ) ) { sqlexecute.request.addParameter( param, TYPES.Float, parseFloat( params[param]) ); continue; }
            if ( !isNaN( parseInt( params[param], 10 ) ) ) { sqlexecute.request.addParameter( param, TYPES.Int, parseInt( params[param], 10 ) ); continue; }
            if ( typeof params[param] !== "undefined"  ) { sqlexecute.request.addParameter( param, TYPES.VarChar, params[param] ); }
        }
    }
};

SqlExecute.prototype.exec = function ( err, connection ) {
    var sqlexecute = this;
    if ( err ) {
        //handle error
        var ETYPE = err.code;
        if ( ETYPE === "ESOCKET" ) {  
            //there was a connection error with the server - first we'll try to wait and connect again up to 5 times
            //then we'll try failover if it has been set on the connection object
            var totalAtempts = sqlexecute.connection.TotalAttempts;
            var curentAttempts = sqlexecute.connection.currentAttempts;
            if ( totalAtempts === curentAttempts && typeof sqlexecute.connection.failover !== "undefined" ) {
                var server = sqlexecute.connection.server, database = sqlexecute.connection.options.database, port = sqlexecute.connection.options.port || 1433;                
                connectionList[server + "-" + database + "-" + port] = sqlexecute.connection.failover;
                sqlexecute.pool.release( connection );
                sqlexecute.connection = sqlexecute.connection.failover;
                sqlexecute.pool = poolmanager.pool( sqlexecute.connection );
                sqlexecute.pool.acquire( function ( error, connection ) { sqlexecute.exec( error, connection ); } );
            }

            if ( curentAttempts < totalAtempts ) { 
                //wait 5 seconds and try to connect again
                sqlexecute.connection.currentAttempts++;
                return setTimeout( function () {
                    console.log( "retry connection.  Attempt: " + curentAttempts );
                    sqlexecute.pool.acquire( function ( error, connection ) { sqlexecute.exec( error, connection ); } );
                }, 5000 );
            }

            //if we got here then no luck with failover or retries            
            sqlexecute.pool.release( connection );
            return sqlexecute.throwError( err );
        }

        return sqlexecute.done(err, null, "");
    }

    sqlexecute.request = new Request( sqlexecute.statement, function ( error, count, rows ) { sqlexecute.done( error, count, rows, connection ); } );
    sqlexecute.addParams( );
    
    //then execSql on connetion
    connection.execSql( sqlexecute.request );
};

SqlExecute.prototype.buildResult = function ( result ) {
    var i, col, row, returnResult = [], returnRow, regAllowNull = /N$/;
    for ( i = 0; i < result.length; i++ ) {
        row = result[i];
        returnResult[i] = returnRow = {};
        returnRow._metadata = {};
        for ( col in row ) {
            if ( row.hasOwnProperty( col ) ) {
                returnRow[row[col].metadata.colName] = row[col].value;
                
                returnRow._metadata[row[col].metadata.colName] = {};
                
                returnRow._metadata[row[col].metadata.colName].name = row[col].metadata.colName;
                returnRow._metadata[row[col].metadata.colName].type = row[col].metadata.type.name.replace(regAllowNull,"");
                returnRow._metadata[row[col].metadata.colName].length = row[col].metadata.dataLength;
                returnRow._metadata[row[col].metadata.colName].allowNull = regAllowNull.test(row[col].metadata.type.name);
            }
        }//end col loop in row
    }//end loop on result

    return returnResult;
};

SqlExecute.prototype.done = function ( error, count, rows, connection ) {
    var sqlexecute = this;
    
    if ( !error ) {
        sqlexecute.pool.release( connection );
        if ( typeof sqlexecute.callback !== 'function' ) { return }
        return sqlexecute.callback( null, sqlexecute.buildResult( rows) );
    }
    
    //do retries we got deadlock error

    //then kill
    sqlexecute.throwError( error );
};

SqlExecute.prototype.throwError = function ( error ) {
    var sqlexecute = this;
    if ( typeof sqlexecute.callback === "function" ) { return sqlexecute.callback( error, "" ); }
    
    //else if we got here then no callback is provided and we default to an unhandled error
    throw new Error( error )
};

SqlExecute.prototype.defalutConfig = {
    server: "localhost",    
    userName: "",
    password: "", 
    options: { rowCollectionOnRequestCompletion: true, database: "", port: 1433 },
    TotalAttempts: 5,
    currentAttempts: 0,
    failover: {}
};