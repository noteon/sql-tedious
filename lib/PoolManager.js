var GenericPool = require( 'generic-pool' );
var Connection = require( 'tedious' ).Connection;

var PoolManager = module.exports = function (  ) {
    var poolmanager = this;
    poolmanager.pools = []
};

PoolManager.prototype.get = function ( config ) {
    var poolmanager = this, i, prop, poolConfig, matched = false;
    for ( i = 0; i < poolmanager.pools.length; i++ ) {
        poolConfig = poolmanager[i].config;
        
        matched = true;
        for ( prop in poolConfig ) {
            if ( poolConfig[prop] !== config[prop] ) { matched = false; break; }
        }

        if ( matched ) { return poolmanager[i].pool; }
    }
};

PoolManager.prototype.create = function ( setup, config ) {
    var poolmanager = this;

    var create = function ( callback ) {
        var connection = new Connection( config );
        connection.on( 'connect', function ( err ) { 
            callback( err, connection );            
        } );

        connection.on( 'error', function ( err ) { 
            callback( err );
        } );
    };
    var destroy = function ( connection ) { 
        if ( typeof connection !== "undefined"  && typeof connection.close === "function" ) { connection.close( ); }
    };
    
    setup = setup || {};
    var name = setup.name || "pool_" + poolmanager.pools.length;
    var max = setup.max || 10
    var min = setup.min || 0;
    var idleTimeoutMillis = setup.idleTimeoutMillis || 30000;
    var log = setup.log || false;
    
    var pool = GenericPool.Pool( { name: name, create: create, destroy: destroy, max: max, min: min, idleTimeoutMillis: idleTimeoutMillis, log: log } );
    
    poolmanager.pools.push( pool );

    return pool; 
};

PoolManager.prototype.pool = function ( _setup, _config ) {
    var poolmanager = this;
        
    var args = arguments, config = args[0], setup;    
    if ( args.length > 1 ) { setup = args[0]; config = args[1]; }
    
    return poolmanager.get( ) || poolmanager.create( setup, config );
};