#!/bin/bash

usage() {
  echo "Usage $0 -c influxdb_docker_container_name -db db_name"
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

if [ -z "${DBNAME}" -o -z "${CONTAINERNAME}" ]; then
  usage
  exit 1
fi

# generate dump from influx container
docker exec -e INFLUX_USERNAME=${INFLUX_USER} -e INFLUX_PASSWORD=${INFLUX_PASS} -i ${CONTAINERNAME}\
    influxd backup -portable -database ${DBNAME} -host ${CONTAINERNAME}:8088 ${DBNAME}
    # [ -retention <rp_name> ]
    # [ -start <timestamp> [ -end <timestamp> ] | -since <timestamp> ]

# copy the dump to the local machine
docker cp ${CONTAINERNAME}:${DBNAME} ./${DBNAME}

# remove the dump from the container
docker exec -i ${CONTAINERNAME} rm -r .${DBNAME}

if [ $? -ne 0 ]; then
  echo "InfluxDB did not succeed taking a backup. Did you specify the correct database name?"
fi
