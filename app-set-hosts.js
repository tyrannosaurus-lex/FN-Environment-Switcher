const _        = require('lodash');
const hostile  = require('hostile');
const Inquirer = require('inquirer');
const jsonfile = require('jsonfile');
const program  = require('commander');

const AWSService = require('./AwsService');
const config     = require('./config/development.json');
const constants  = require('./constants');

program
  .option('-e, --environment <environment>', 'Environment', /^(dev|staging|local)$/i, 'dev')
  .parse(process.argv);

/**
 * @description Returns t/f if the services's ports are able to be modified.
 * @param {Object} service Service object defined in config.
 */
const canModifyPorts = (service) => {
  return service.configPath   &&
         service.portProperty &&
         service.locations    && 
         service.locations.length > 0;
};

/**
 * @description Sets the Service's port in the local config files for a repo location.
 * @param {Object} location Location object defined in config.
 * @param {Integer} port Service port to set.
 */
const setLocationPort = (location, port) => {
  const locationConfigFilePath = `${config.baseRepositoryPath}${location.configPath}`;
  const locationConfig         = jsonfile.readFileSync(locationConfigFilePath);

  _.set(locationConfig, location.portProperty, port);
  
  jsonfile.writeFileSync(locationConfigFilePath, locationConfig, { spaces: 2 });
};

/**
 * @description Set the services to localhost. Also set any dependant repos's ports
 *   to the port defined in the service's config file.
 * @param {Array<Object>} localServices Array of services.
 */
const setLocalServicesToLocalHost = async (localServices) => {
  console.info('Setting local microservice IPs to localhost.')

  localServices.forEach((service) => {
    const serviceName = service.name;

    hostile.set(constants.LOCALHOST_IP, `${serviceName}.${constants.LOCALHOST_SUFFIX}`);

    if (canModifyPorts(service)) {
      console.info('Setting local ports in services.');

      const serviceConfigPath = `${config.baseRepositoryPath}${service.configPath}`;
      const serviceConfig     = jsonfile.readFileSync(serviceConfigPath);
      const localPort         = _.get(serviceConfig, service.portProperty);

      service.locations.forEach((location) => {
        console.info(`Setting ${location.name} to ${localPort}.`);
        setLocationPort(location, localPort);
      })
    } else {
      console.log(`Cannot modify ports for ${service.name}. Please check config`);
    }
  });
};

/**
 * @description Set the services to an external IP. Also resets any dependant ports.
 * @param {Array<Object>} localServices Array of services.
 */
const setLocalServicesToExternalIps = async (localServices, environment) => {
  console.info('Retrieving microservice instances...');
  const instances = await AWSService.getInstances();

  console.info(`Setting local microservice IPs to ${environment} IPs.`)
  localServices.forEach((service) => {
    const serviceName = service.name;
    const awsService = instances.find((instance) => instance.name === `${serviceName}.${environment}`);

    hostile.set(awsService.publicIp, `${serviceName}.${constants.LOCALHOST_SUFFIX}`);

    if (canModifyPorts(service)) {
      console.info('Setting local ports in services.');

      service.locations.forEach((location) => {
        console.info(`Setting ${location.name} to ${constants.DEFAULT_WEB_APP_PORT}.`);
        setLocationPort(location, constants.DEFAULT_WEB_APP_PORT);
      })
    } else {
      console.log(`Cannot modify ports for ${service.name}. Please check config`);
    }
  });
};

/**
 * @description Prompts user for services that they would like to point at specific environments,
 *   then sets them in the hosts file. Also sets the ports in dependant repos.
 * 
 *   This command requires elevated privileges.
 */
const main = async () => {
  const environment   = program.environment;
  const localServices = config.localServices;

  const answers = await Inquirer.prompt([
    {
      type     : 'checkbox',
      message  : `Select local services to set to ${environment} (space to select)`,
      name     : 'services',
      choices  : localServices,
      pageSize : localServices.length
    }
  ]);

  const checkedServices       = answers.services;
  const localServicesToChange = localServices.filter((service) => checkedServices.includes(service.name));

  if (environment === 'local') {
    await setLocalServicesToLocalHost(localServicesToChange);
  } else {
    await setLocalServicesToExternalIps(localServicesToChange, environment);
  }

  console.info(`Done!`)
};

main()
  .catch((error) => {
    console.error(error);
  });
