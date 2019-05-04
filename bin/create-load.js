#!/usr/bin/env node

/**
 * This script creates weighted random load on the sample server.
 */

import request from 'request';
import table from 'text-table';
import weighted from 'weighted';

const shuffle = require('shuffle').shuffle;

// If false, non-GET requests are enabled. Not recommended for shared (e.g. C9)
// servers.
const safeMode = true;

/**
 * Returns `body` parsed as JSON if it's not already been parsed, `body
 * otherwise.
 */
function toJSON(body) {
  if (typeof body !== 'string') {
    return body;
  }

  return JSON.parse(body);
}

/**
 * Returns a random Array with half the elements from `arr`.
 */
function randomHalf(arr) {
  const size = Math.ceil(arr.length / 2);

  return shuffle({ deck: arr }).draw(size);
}

/**
 * Returns a tabular string of `choices`' contents, with all weights converted
 * to relative percentages.
 */
function toWeightTable(choices) {
  return table(
    [['Route', 'Weight'], ['-----', '-----']].concat(
      Object.keys(choices).map(key => [key, `${Math.round(choices[key] * 10000) / 100}%`]),
    ),
  );
}

function getBaseURL() {
  const ip = process.env.HOST || process.env.VCAP_APP_PORT || '127.0.0.1';
  const port = process.env.PORT || 3000;
  const baseURL = `http://${ip}:${port}${process.env.REST_API_ROOT}`;
  return baseURL;
}

/**
 * Returns an Array of choices distilled from the complete route table,
 * `routes`.
 */
function distillRoutes(routes) {
  return routes
    .filter(route => {
      if (safeMode && route.verb.toUpperCase() !== 'GET') {
        return false;
      }

      return true;
    })
    .map(
      route =>
        // TODO(schoon) - Handle the `accepts` in a meaningful way.
        `${route.verb.toUpperCase()} ${route.path}`,
    );
}

/**
 * Returns a weighted choice table from an Array of choices.
 */
function weighChoices(routes) {
  let total = 0;
  const choices = routes.reduce((obj, route) => {
    obj[route] = Math.random();
    total += obj[route];

    return obj;
  }, {});

  // For simplicity, we normalize the weights to add up to 1.
  Object.keys(choices).forEach(key => {
    choices[key] /= total;
  });

  return choices;
}

/**
 * Hits a randomly-selected route from the available `choices`.
 */
function hit(choices) {
  const route = weighted(choices);
  const parts = route.split(' ');
  let verb = parts[0].toLowerCase();
  let path = parts[1];
  // We replace any :id path fragments with 1, which we hope exists.
  //  path = path.replace(/\:id/g, 1);
  path = path.replace(/id/g, 1);
  if (verb === 'all') {
    verb = 'post';
  }
  // Make the request.
  request[verb](
    getBaseURL() + path,
    {
      json: {},
    },
    (err /* , response, body */) => {
      if (err) {
        console.error('Request error with %s: %s', route, err);
        return err;
      }
      return null;
      // Ignore the result.
    },
  );

  // TODO(schoon) - Make the request rate configurable.
  setTimeout(() => {
    hit(choices);
  }, 100);
}

/**
 * This kicks off the application
 * @type {[type]}
 */
function start() {
  request.get(`${getBaseURL()}/routes`, (err, response, body) => {
    if (err) throw err;
    body = toJSON(body);
    let routes = distillRoutes(body);
    routes = randomHalf(routes);
    const choices = weighChoices(routes);
    // We print out the choice table so the user can compare the weighted load
    // to analytics and monitoring data.
    console.log('Hitting routes with the following weights:');
    console.log(toWeightTable(choices));
    // Go!
    hit(choices);
  });
}

// Now that all the pieces have been defined, it's time to `start` the engine!
start();
