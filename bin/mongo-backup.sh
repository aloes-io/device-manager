#!/bin/bash
 
MONGO_DATABASE="aloes_test"
APP_NAME="Aloes"
MONGO_HOST="127.0.0.1"
MONGO_PORT="27017"
MONGO_USER=""
MONGO_PASS=""

TIMESTAMP=`date +%F-%H%M`
MONGODUMP_PATH="/usr/bin/mongodump"
BACKUPS_DIR="../backups"
BACKUP_NAME="$APP_NAME-$TIMESTAMP"
 

printf "Backing up MongoDB \n"
# mongo admin --eval "printjson(db.fsyncLock())"

# $MONGODUMP_PATH --host $MONGO_HOST --port $MONGO_PORT -d $MONGO_DATABASE --username $MONGO_USER --password $MONGO_PASS 
$MONGODUMP_PATH --host $MONGO_HOST --port $MONGO_PORT -d $MONGO_DATABASE

# mongo admin --eval "printjson(db.fsyncUnlock())"
 
mkdir -p $BACKUPS_DIR
mv dump $BACKUP_NAME
tar -zcvf $BACKUPS_DIR/$BACKUP_NAME.tgz $BACKUP_NAME
rm -rf $BACKUP_NAME

exit 0
