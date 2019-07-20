#!/bin/bash
# Use > 1 to consume two arguments per pass in the loop (e.g. each
# argument has a corresponding value to go with it).
# Use > 0 to consume one or more arguments per pass in the loop (e.g.
# some arguments don't have a corresponding value to go with it)

usage() {
    echo "Usage $0 -d /mongodump/dir -c mongo_docker_container_name"
}

while [[ $# > 1 ]]
do
key="$1"

case $key in
    -db|--database)
        DBNAME="$2"
        shift # past argument
        ;;
    -d|--dump)
        DUMPDIR="$2"
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

if [ -z "${DUMPDIR}" -o -z "${CONTAINERNAME}" ]; then
    usage
    exit 1
fi

echo "Attempting to restore mongodb dump at ${DUMPDIR} into container ${CONTAINERNAME}"
read -r -p "Is this what you want? [y/N] " response
case $response in
    [yY][eE][sS]|[yY])
    docker cp ${DUMPDIR} ${CONTAINERNAME}:/dump/${DUMPDIR}
    docker exec -i ${CONTAINERNAME} mongorestore --drop --db ${DBNAME} --host ${CONTAINERNAME} --username ${MONGO_USER} --password ${MONGO_PASS} /dump/${DUMPDIR}
	docker exec -i ${CONTAINERNAME} rm -r /dump/${DUMPDIR}
        ;;
    *)
        echo "Nevermind then"
        ;;
esac