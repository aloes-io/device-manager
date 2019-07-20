#!/bin/bash

usage() {
    echo "Usage $0 -c mongo_docker_container_name -db db_name"
}

while [[ $# > 1 ]]
do
key="$1"

case $key in
    -db|--database)
        DBNAME="$2"
        shift # past argument
        ;;
    -c|--container)
        CONTAINERNAME="$2"
        shift # past argument
        ;;
    -u|--username)
        MONGO_USER="$2"
        shift # past argument
        ;;
    -p|--password)
        MONGO_PASS="$2"
        shift # past argument
        ;;
    *)
    	usage
	    exit 1
    	;;
esac
shift # past argument or value
done

if [ -z "${DBNAME}" -o -z "${CONTAINERNAME}" ]; then
    usage
    exit 1
fi

docker exec -i ${CONTAINERNAME} mongodump --db ${DBNAME} --host ${CONTAINERNAME} --username ${MONGO_USER} --password ${MONGO_PASS} 
docker cp ${CONTAINERNAME}:/dump/${DBNAME} ./${DBNAME}
docker exec -i ${CONTAINERNAME} rm -r /dump/${DBNAME}

if [ $? -ne 0 ]; then
    echo "MongoDB did not succeed taking a backup. Did you specify the correct database name?"
fi
