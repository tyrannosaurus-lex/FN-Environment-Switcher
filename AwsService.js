const AWS = require('aws-sdk');

const ENVIRONMENTS = {
  'fn-dev': 'dev',
  'fn-staging': 'staging'
};

/**
 * @description Initializes AWS config with the region.
 */
const initializeAWS = () => {
  AWS.config.update({ region: 'us-east-1' });
}

/**
 * @description Describes the EC2 instances with the provided filters.
 */
const describeInstances = () => {
  const ec2 = new AWS.EC2();
  const params = {
    Filters: [
      {
        Name: 'tag:CostOwner',
        Values: ['WebApp', 'DM']
      },
      {
        Name: 'tag:env',
        Values: Object.keys(ENVIRONMENTS)
      }
    ]
  }
  return ec2.describeInstances(params).promise();
}

/**
 * @description Maps to an instance object composed of name and public ip.
 * @param {Object} reservation Reservation returned from describeInstances.
 */
const mapInstance = (reservation) => {
  const instance = reservation.Instances[0];
  const envTag = instance.Tags.find((tag) => tag.Key === 'env');
  const serviceTag = instance.Tags.find((tag) => tag.Key === 'service');

  return {
    name: `${serviceTag.Value}.${ENVIRONMENTS[envTag.Value]}`,
    publicIp: instance.PublicIpAddress,
  };
}

class AwsService {
  /**
   * @description Gets current WebApp and DM instances from AWS.
   * @returns {Array<Object>} Array of Instance Objects composed of a name and ip.
   */
  static async getInstances() {
    initializeAWS();
    return await describeInstances()
      .then((data) => {
        return data.Reservations
          .filter((reservation) => reservation.Instances[0].PublicIpAddress)
          .map((reservation) => mapInstance(reservation));
      });
  }
}

module.exports = AwsService;
