<?php

/** 
 * Central configuration file for specifying database connection and deployed server enviornment (development or production server)
 *
 * @author  Hamman Samuel
 * @version 20140416
 */

define("SYSMODE", "DEV"); // DEV or PROD

if (SYSMODE === "DEV")
{
    define("DBNAME", "local database");
    define("DBUSER", "local user");
    define("DBPASS", "local password");    
}
else if (SYSMODE === "PROD")
{
    define("DBNAME", "live database");
    define("DBUSER", "live user");
    define("DBPASS", "live password");
}
