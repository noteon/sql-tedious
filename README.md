<h2>Tedious wrapper -</h2> 
<p>Adds connection pooling based on server-database-port.</p>
<p>Adds failover checking based on connection.</p>
<p>Adds deadlock retry.</p>
<p>Adds simple helper functions for executing queries, inserting arrays into a table, converting javascript type to sql type parameter.</p>

var Sql = require( 'sql-tedious' );
var sql = new Sql( );

//var settings = require( './settings.json' );

//var params = { id: 1234, name: "Kevin Barnett", now: new Date( ), AssocID: 10082 };
var connection = { server: "localhost", database: "test", userName: "sa", password: "pwd", options: {} };
var statement = "SELECT TOP 100  * FROM tabl1";

var callback = function ( err, result ) {
    if ( err ) {return console.log( err ); }

    console.log( result );
};

sql.query(connection, "SELECT TOP 100  * FROM table", undefined, callback );