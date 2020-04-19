#!/bin/bash

usage() {
  echo "Usage $0 -c redis_docker_container_name -s ./dump.rdb  -d /data"
}

while [[ $# > 1 ]]
do
key="$1"

case $key in
  -s|--source)
    DUMPPATH="$2"
    shift # past argument
    ;;
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

if [ -z "${REDISDIR}" -o -z "${DUMPPATH}" -o -z "${CONTAINERNAME}" ]; then
  usage
  exit 1
fi

echo "Attempting to restore Redis dump at ${REDISDIR} into container ${CONTAINERNAME}"
read -r -p "Is this what you want? [y/N] " response
case $response in
  [yY][eE][sS]|[yY])
      
    # stop redis
    docker exec -i ${CONTAINERNAME} redis-cli shutdown

    # copy the dump
    docker cp ${DUMPPATH} ${CONTAINERNAME}:${REDISDIR}/dump.rdb 

    # restart redis
    docker exec -i ${CONTAINERNAME} redis-server /usr/local/etc/redis/redis.conf

    ;;
  *)
    echo "Nevermind then"
    ;;
esac

