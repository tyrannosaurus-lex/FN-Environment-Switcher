const hostile    = require('hostile');

const AWSService = require('./AwsService');

/**
 * @description Write entries to /etc/hosts.
 * @param {Array<Object>} instances Array of Instance Objects composed of a name and ip.
 */
const writeToHostsFile = (instances) => {
  instances.forEach((instance) => {
    hostile.set(instance.publicIp.trim(), instance.name.trim());
  });
}

/**
 * @description Retrieves the current WebApp and DM instances from AWS and writes the ip
 *   to the hosts file.
 * 
 *   This command requires elevated privileges.
 */
const main = async () => {
  console.info('Retrieving microservice instances...');
  const instances = await AWSService.getInstances();

  console.info('Writing to hosts file...');
  writeToHostsFile(instances);

  console.info('Done!');
};

main()
  .catch((error) => {
    console.error(error);
  });
