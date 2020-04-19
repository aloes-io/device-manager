/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable security/detect-object-injection */
import logger from '../services/logger';
import utils from '../lib/utils';

module.exports = async function initializeDownSampling(app) {
  try {
    if (!utils.isMasterProcess(process.env)) return;

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
          2,
          'loopback',
          'boot:initializeDownSampling:buildContinuousQuery:err',
          error,
        );
        return null;
      }
    };

    const promises = Object.keys(models).map(async modelName => {
      const model = models[modelName];
      if (model && model.settings && model.settings.downSampling) {
        const dsRules = model.settings.downSampling;
        logger.publish(3, 'loopback', 'boot:initializeDownSampling:rules', dsRules);

        // Create Retention Policies
        await Promise.all(
          dsRules.map(async dsRule => {
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
          }),
        );

        await influxConnector.client.createRetentionPolicy('rp_forever', {
          duration: '0s',
          replication: 1,
          isDefault: false,
        });

        influxConnector.retentionPolicies['0s'] = 'rp_forever';

        logger.publish(
          2,
          'loopback',
          'boot:initializeDownSampling:rpPolicies',
          influxConnector.retentionPolicies,
        );

        const sortedDurations = await influxConnector.sortDurations(
          Object.keys(influxConnector.retentionPolicies),
        );

        // Format and create Continuous Queries
        const continuousQueries = await Promise.all(
          sortedDurations.map(async (duration, i, inputArray) => {
            try {
              if (i < inputArray.length - 1) {
                const nextDuration = inputArray[i + 1];
                const dsRule = dsRules.find(rule => rule.duration === duration);
                if (dsRule) {
                  const msg = await buildContinuousQuery(modelName, dsRule, nextDuration, duration);
                  logger.publish(
                    3,
                    'loopback',
                    'boot:initializeDownSampling:continuousQueries',
                    msg,
                  );
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
                2,
                'loopback',
                'boot:initializeDownSampling:continuousQueries:err',
                error,
              );
              return null;
            }
          }),
        );
        return continuousQueries;
      }
      return null;
    });

    await Promise.all(promises);
  } catch (error) {
    logger.publish(2, 'loopback', 'boot:initializeDownSampling:err', error);
  }
};
