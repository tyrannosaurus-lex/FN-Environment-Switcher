const _       = require('lodash');
const hostile = require('hostile');

const config    = require('./config/development.json');
const constants = require('./constants');

/**
 * @description Map hostile lines to objects.
 * @param {Array<string>} hostileLines Array of strings from hostile.get().
 */
const mapHosts = (hostileLines) => {
  return hostileLines.map((line) => {
    return {
      name: line[1],
      ip: line[0]
    };
  });
}

/**
 * @description Gets the current ips/environments of any local services defined in config.
 * @param {Array<string>} localServices Array of local service names.
 * @param {Array<Object>} allHosts Array of hosts objects.
 */
const getLocalServicesStatuses = (localServices, allHosts) => {
  return localServices.map((localService) => {
    const externalService = allHosts.find((host) => host.name !== localService.name && host.ip == localService.ip);
    let environment = 'unknown';

    if (externalService) {
      if (externalService.name.includes(constants.LOCALHOST_SUFFIX)) {
        environment = constants.LOCALHOST_SUFFIX;
      }
      else if (externalService.name.endsWith('.dev')) {
        environment = 'dev';
      }
      else if (externalService.name.endsWith('.staging')) {
        environment = 'staging';
      }
    }

    return {
      name : localService.name,
      ip   : localService.ip,
      environment
    };
  });
}

/**
 * @description Retrives the current local services, ips, and their environments.
 */
const main = async () => {
  hostile.get(false, (error, lines) => {
    if (error) {
      console.error(error.message)
    }

    const allHosts          = mapHosts(lines);
    const localServiceNames = config.localServices.map((service) => `${service.name}.${constants.LOCALHOST_SUFFIX}`);
    const localServices     = allHosts.filter((host) => localServiceNames.includes(host.name));
    const statuses          = getLocalServicesStatuses(localServices, allHosts);

    console.table(_.sortBy(statuses, ['name']));
  })
};

main()
  .catch((error) => {
    console.error(error);
  });
