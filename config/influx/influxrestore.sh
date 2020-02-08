#!/bin/bash
# Use > 1 to consume two arguments per pass in the loop (e.g. each
# argument has a corresponding value to go with it).
# Use > 0 to consume one or more arguments per pass in the loop (e.g.
# some arguments don't have a corresponding value to go with it)

# Work in progress
usage() {
    echo "Usage $0 -d /influxdbdumpdir -c influx_docker_container_name"
}

while [[ $# > 1 ]]
do
key="$1"

case $key in
    -db|--database)
        DBNAME="$2"
        shift # past argument
        ;;
    -newdb|--newdatabase)
        NEWDBNAME="$2"
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
        INFLUX_USER="$2"
        shift # past argument
        ;;
    -p|--password)
        INFLUX_PASS="$2"
        shift # past argument
        ;;
    *)
        usage
    exit 1
        ;;
esac
shift # past argument or value
done

if [ -z "${DUMPDIR}" -o -z "${CONTAINERNAME}" -o -z "${DBNAME}" ]; then
    usage
    exit 1
fi

echo "Attempting to restore InfluxDB dump at ${DUMPDIR} into container ${CONTAINERNAME}"
read -r -p "Is this what you want? [y/N] " response
case $response in
    [yY][eE][sS]|[yY])

    echo "${DBNAME} ${NEWDBNAME} ${DUMPDIR}"
    if [ -z "$NEWDBNAME" ]; then
        NEWDBNAME=${DBNAME}
    fi
    docker cp ${DUMPDIR} ${CONTAINERNAME}:${NEWDBNAME}

    # if [ "$NEWDBNAME" != "$DBNAME"  ]; then
        # Create NEWDBNAME in case it doesn' exist
    curl -i -XPOST 'http://localhost:8086/query' \
        -u ${INFLUX_USER}:${INFLUX_PASS} --data-urlencode 'q=DROP DATABASE "${NEWDBNAME}"'
    # fi

    # copy database into another db 
    # -host 127.0.0.1:8088
    docker exec -e INFLUX_USERNAME=${INFLUX_USER} -e INFLUX_PASSWORD=${INFLUX_PASS} -i ${CONTAINERNAME} \
        influxd restore -portable -db ${DB_NAME} -newdb ${NEWDBNAME} ${NEWDBNAME}
       # [ -rp <rp_name> ]

    # replace {DBNAME} content with {NEWDBNAME} content
    sideload_query='SELECT * INTO "${DBNAME}"..:MEASUREMENT FROM /.*/ GROUP BY *; DROP DATABASE "${NEWDBNAME}"'
    curl -i -XPOST 'http://localhost:8086/query?db="${NEWDBNAME}"' \
        -u ${INFLUX_USER}:${INFLUX_PASS} --data-urlencode "q=${sideload_query}"

    docker exec -i ${CONTAINERNAME} rm -r ${NEWDBNAME}
        ;;
    *)
        echo "Nevermind then"
        ;;
esac