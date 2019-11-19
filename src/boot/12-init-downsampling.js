/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable security/detect-object-injection */
import logger from '../services/logger';

module.exports = async function initializeDownSampling(app) {
  try {
    if (process.env.CLUSTER_MODE) {
      if (process.env.PROCESS_ID !== '0') return null;
      if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
    }
    const influxConnector = app.datasources.points.connector;
    const models = app.models;
    influxConnector.retentionPolicies = {};

    // Iterate through the models
    const minDuration = await influxConnector.getMinimumDuration(models);

    const buildContinuousQuery = async (modelName, rule, nextDuration, duration) => {
      try {
        let continuousQueryName = `${modelName}_cq_${duration}`;
        let query = 'SELECT ';

        // Add all requested aggregations to the query
        const aggregateProps = async (property, j, inputArray) => {
          try {
            const aggregateFunction = await influxConnector.parseCQFunction(
              rule.properties[property],
            );
            property = `"${property}"`;
            const splittedAggregateFunction = aggregateFunction.split(' ');
            splittedAggregateFunction.splice(1, 0, property);
            const joinedAggregateFunction = splittedAggregateFunction.join('');
            query = `${query}${joinedAggregateFunction} AS ${property}`;
            if (j < Object.keys(inputArray).length - 1) {
              query += ', ';
            } else {
              query += ' ';
            }
            return query;
          } catch (error) {
            logger.publish(3, 'loopback', 'boot:initializeDownSampling:aggregateProps:err', error);
            return null;
          }
        };

        const aggregatePropsPromise = await Object.keys(rule.properties).map(aggregateProps);
        await Promise.all(aggregatePropsPromise);

        query += `INTO "${influxConnector.retentionPolicies[nextDuration]}"."${modelName}"`;
        query += ` FROM "${influxConnector.retentionPolicies[duration]}"."${modelName}"`;
        if (Array.isArray(rule.group)) {
          //  query += ` GROUP BY time(${rule.group.join(',')})`;
          query += ` GROUP BY ${rule.group.join(',')}`;
          continuousQueryName += `_to_${rule.group.join(',')}`;
        } else {
          query += ` GROUP BY ${rule.group}`;
          continuousQueryName += `_to_${rule.group}`;
        }
        //  console.log('continuousQueryName: ', continuousQueryName);
        return { cqName: continuousQueryName, query };
      } catch (error) {
        logger.publish(
          3,
          'loopback',
          'boot:initializeDownSampling:buildContinuousQuery:err',
          error,
        );
        return null;
      }
    };

    const promises = await Object.keys(models).map(async modelName => {
      const model = models[modelName];
      if (model && model.settings && model.settings.downSampling) {
        const dsRules = model.settings.downSampling;
        logger.publish(4, 'loopback', 'boot:initializeDownSampling:rules', dsRules);

        //  Create Retention Policies
        const rpPromises = await dsRules.map(async dsRule => {
          try {
            const rpName = `rp_${dsRule.duration}`;
            await influxConnector.client.createRetentionPolicy(rpName, {
              duration: dsRule.duration,
              replication: 1,
              isDefault: dsRule.duration === minDuration,
            });
            influxConnector.retentionPolicies[dsRule.duration] = rpName;
            // console.log('rpName : ', rpName);
            return rpName;
          } catch (error) {
            logger.publish(
              3,
              'loopback',
              'boot:initializeDownSampling:initializeDownSampling:err',
              error,
            );
            return null;
          }
        });

        await Promise.all(rpPromises);
        //  console.log('rpPolicies : ', rpPolicies);

        await influxConnector.client.createRetentionPolicy('rp_forever', {
          duration: '0s',
          replication: 1,
          isDefault: false,
        });

        influxConnector.retentionPolicies['0s'] = 'rp_forever';
        const sortedDurations = await influxConnector.sortDurations(
          Object.keys(influxConnector.retentionPolicies),
        );

        // Format and create Continuous Queries
        const cqPromises = await sortedDurations.map(async (duration, i, inputArray) => {
          try {
            if (i < inputArray.length - 1) {
              const nextDuration = inputArray[i + 1];
              const dsRule = dsRules.find(rule => rule.duration === duration);
              if (dsRule) {
                const msg = await buildContinuousQuery(modelName, dsRule, nextDuration, duration);
                logger.publish(4, 'loopback', 'boot:initializeDownSampling:continuousQueries', msg);
                const res = await influxConnector.client.createContinuousQuery(
                  msg.cqName,
                  msg.query,
                );
                return res;
              }
              return null;
            }
            return null;
          } catch (error) {
            logger.publish(
              3,
              'loopback',
              'boot:initializeDownSampling:continuousQueries:err',
              error,
            );
            return null;
          }
        });
        const continuousQueries = await Promise.all(cqPromises);
        return continuousQueries;
      }
      return null;
    });

    const result = await Promise.all(promises);
    return result;
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:initializeDownSampling:err', error);
    return null;
  }
};
