const program = require('commander');
const package = require('./package'); 

program
  .version(package.version)
  .description(package.description)
  .command('status', 'Get Current Local Microservice Status', {isDefault: true})
  .command('set-hosts', 'Set Local Microservice Environments').alias('s')
  .command('update-hosts', 'Update Hosts File from AWS for DM and WebApp Instances').alias('u')
  .parse(process.argv);

  