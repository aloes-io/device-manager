#!/bin/bash

usage() {
  echo "Usage $0 -c redis_docker_container_name -d /data"
}

while [[ $# > 1 ]]
do
key="$1"

case $key in
  -d|--dir)
    REDISDIR="$2"
    shift # past argument
    ;;
  -c|--container)
    CONTAINERNAME="$2"
    shift # past argument
    ;;
  *)
    usage
    exit 1
    ;;
esac
shift # past argument or value
done

if [ -z "${REDISDIR}" -o -z "${CONTAINERNAME}" ]; then
  usage
  exit 1
fi

# copy the dump file from remote container to the local machine
docker cp ${CONTAINERNAME}:/${REDISDIR}/dump.rdb ./dump.rdb
