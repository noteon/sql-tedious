var Sql = require( '../lib/Sql-Tedious.js' );
var sql = new Sql( );

var settings = require( './settings.json' );

var params = { id: 1234, name: "Kevin Barnett", now: new Date( ), AssocID: 10082 };
var connection = settings.DB1  // { server: "localhost", database: "dbname", userName: "User", password: "password", options: {} };
var statement = "Select top (1) id From member_info Where Associd = @Associd;";

var callback = function ( err, result ) {
    if ( err ) {return console.log( err ); }
    
    console.log( result );
};

//sql.query(connection, statment, params, callback );

var pageSatement = "Select * From Member_Info Where AssocID = @AssocID Order by First_Name; ";
sql.page( connection, pageSatement, {id: 2134, AssocID: 10082, page: 1, rows: 10}, function ( err, result ) {
    if ( err ) { console.log( err ); }
    console.log( result.total);
} );