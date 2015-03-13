

var SqlTedious = module.exports = function (_config) {
    var sqltedious = this;

};

SqlTedious.prototype.query = function (statement, params, connection, callback) {
    //pass arguments as statement String, params Object, optional connection Object, optional callback Function 
    var sqltedious = this;
    
    var args = Array.prototype.slice.call( arguments );            
    var sqlexecute = new SqlExecute( args );              
};

SqlTedious.prototype.insertUpdate = function ( destinationTable, where, source, params, connection, callback ) {
    //query is converted to a merge statement with "destination" as the destination table name and "source" as the source table name
    var sqltedious = this;

};

SqlTedious.prototype.update = function () { };