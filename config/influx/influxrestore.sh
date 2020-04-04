#!/bin/bash
# Use > 1 to consume two arguments per pass in the loop (e.g. each
# argument has a corresponding value to go with it).
# Use > 0 to consume one or more arguments per pass in the loop (e.g.
# some arguments don't have a corresponding value to go with it)

# Work in progress
usage() {
  echo "Usage $0 -db aloes_local -newdb aloes_local_tmp -d /influxdbdumpdir -c influx_docker_container_name"
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

echo "Attempting to restore InfluxDB dump for ${DBNAME} into container ${CONTAINERNAME}"
read -r -p "Is this what you want? [y/N] " response
case $response in
  [yY][eE][sS]|[yY])

    echo "${DBNAME} ${NEWDBNAME} ${DUMPDIR}"
    if [ -z "$NEWDBNAME" ]; then
      NEWDBNAME=${DBNAME}
    fi

    # copy the dump source to the remote container
    docker cp ${DUMPDIR} ${CONTAINERNAME}:${NEWDBNAME}

    # delete the sideload DB in case it already exists
    # if [ "$NEWDBNAME" != "$DBNAME"  ]; then
    curl -i -XPOST 'http://localhost:8086/query' \
      -u ${INFLUX_USER}:${INFLUX_PASS} --data-urlencode 'q=DROP DATABASE "${NEWDBNAME}"'
    # fi

    # copy database into another db 
    docker exec -e INFLUX_USERNAME=${INFLUX_USER} -e INFLUX_PASSWORD=${INFLUX_PASS} -i ${CONTAINERNAME} \
      influxd restore -portable -db ${DB_NAME} -newdb ${NEWDBNAME} ${NEWDBNAME}
    # -host 127.0.0.1:8088
    # [ -rp <rp_name> ]

    # replace {DBNAME} content with {NEWDBNAME} content
    sideload_query='SELECT * INTO "${DBNAME}"..:MEASUREMENT FROM /.*/ GROUP BY *; DROP DATABASE "${NEWDBNAME}"'
    curl -i -XPOST 'http://localhost:8086/query?db="${NEWDBNAME}"' \
      -u ${INFLUX_USER}:${INFLUX_PASS} --data-urlencode "q=${sideload_query}"

    # remove dump from the container
    docker exec -i ${CONTAINERNAME} rm -r ${NEWDBNAME}


    # second approach using temp container
    # https://gist.github.com/mark-rushakoff/36b4491f97b8781198da36752ecd949b
    # https://dev.to/thibmaek/-migrating-influxdb-databases-to-docker-compose-2kee
    # would imply named volume for influx service
    # docker run --rm -d -v /opt/appdata/influxdb:/var/lib/influxdb -v $(pwd)/${DUMPDIR}:/${DUMPDIR} -p 8086 influxdb:latest
    
    # to retrieve volumes :
    # docker inspect containerID | grep volumes

    # docker exec -e INFLUX_USERNAME=${INFLUX_USER} -e INFLUX_PASSWORD=${INFLUX_PASS} -i ${CONTAINERNAME} \
    #     influxd restore -portable -db ${DB_NAME} /${DUMPDIR}/${DB_NAME}
    ;;
  *)
    echo "Nevermind then"
    ;;
esac