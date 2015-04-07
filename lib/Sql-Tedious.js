var SqlExecute = require( './SqlExecute.js' );
var Util = require( 'util' );

var SqlTedious = module.exports = function ( _config ) {
    var sqltedious = this;
    
    //default callback - if none passed to funcitons then we will throw error on done when error is passed.
    sqltedious.done = function ( err ) { if ( err ) { process.nextTick( function () { throw new Error( err ); } ); } };

};

SqlTedious.prototype.query = function ( connection, statement, params, callback ) {
    //pass arguments as statement String, params Object, optional connection Object, optional callback Function 
    var sqltedious = this;
    
    var args = Array.prototype.slice.call( arguments );
    var sqlexecute = new SqlExecute( args );
};

SqlTedious.prototype.insertUpdate = function ( connection, statement, params, sourceObject, callback ) {
    var sqltedious = this, i, sqlexecute, sql, sqlString = { select: "", from: "", where: "", orderBy: "" }

    if ( typeof callback === "function" ) { sqltedious.done = callback; }
    if ( !statement ) { process.nextTick( function () { sqltedious.done( "Invalid arguments.  A sql statement is required.", "" ); } ); }
    
    if ( !Util.isArray( sourceObject ) ) { sourceObject = [sourceObject] }

    sqlString = parseStatement( statement );

    sqlexecute = new SqlExecute( [sql, params, connection, callback] );
};

SqlTedious.prototype.page = function ( connection, statement, params, callback ) {
    var sqltedious = this, i, sqlexecute, sql, sqlString = { select: "", from: "", where: "", orderBy: "" }
    
    if ( typeof callback === "function" ) { sqltedious.done = callback; }
    if ( !statement ) { process.nextTick( function () { sqltedious.done( "Invalid arguments.  A sql statement is required.", "" ); } ); }
    
    //set defaults
    if ( !params ) { params = {}; }
    
    if ( params.page ) { params.page = parseInt( params.page, 10 ); }
    if ( params.rows ) { params.rows = parseInt( params.rows, 10 ); }

    if ( isNaN(params.page) || !params.page ) { params.page = 1; }
    if ( isNaN( params.rows ) || !params.rows ) { params.rows = 10; }
    
    sqlString = parseStatement( statement );
    
    if ( sqlString.where ) { sqlString.where = "Where " + sqlString.where; }
    sqlString.select = "Select Row_Number( ) over( order by " + sqlString.orderBy + " ) as rowNum, " + sqlString.select + " "
    
    sql = "Select * From ( \n" + sqlString.select + " \nFrom " + sqlString.from + " " + sqlString.where + " ) as queryTable \n";
    sql += "Where queryTable.rowNum between ((@page-1) * @rows) + 1 And @rows * (@page) \n\n";
    
    sql += "Select count (*) as totalRecords \n From " + sqlString.from + " \n" + sqlString.where;
    
    sqlexecute = new SqlExecute( [sql, params, connection, function ( err, result ) {
            if ( err ) { return callback( err, '' ); }
            
            var total = result[result.length - 1].totalRecords;
            var totalPages = Math.ceil( total / params.rows );
            callback( err, { total: total, pages: totalPages, page: params.page, records: result.splice( 0, result.length - 1 ) } );
        }] );
};

SqlTedious.prototype.update = function () { };

var parseStatement = function ( statement ) {
    var select = statement.match( /(?:\s*select\s)(.+)\s*(?:from)/ig ) || [""];
    var from = statement.match( /(?:\sfrom\s)(.+)\s(?:(where\s|\s$|;$))/ig ) || [""];
    var where = statement.match( /(?:\swhere\s)(.+)\s(?:(order by\s|group by\s|\s$|;$))/ig ) || [""];
    var orderBy = statement.match( /(?:\sorder by\s)(.+)/ig ) || [""];
    
    return {
        select: select[0].replace( /\s*select\s*|\sfrom\s*/ig, "" ),
        from: from[0].replace( /\s*from\s*|\swhere\s*|\s*;\s*$/ig, "" ),
        where: where[0].replace( /\s*where\s*|\sgroup by\s*|\sorder by\s*|\s*;\s*$/ig, "" ),
        orderBy: orderBy[0].replace( /\s*order by\s*|\s*;\s*$/ig, "" )
    }
};