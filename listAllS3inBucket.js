const roleArn = 'arn:aws:iam::blahblahblah';
const AWS = require('aws-sdk');

const sts = new AWS.STS();
const bucketName = 'bucketName';

function assumeS3Role(roleArn) {
  const params = {
    DurationSeconds: 900,
    RoleSessionName: 'assumeRoleSession',
    RoleArn: roleArn,
    Policy: '{"Version":"2012-10-17","Statement":[{"Sid":"stst","Effect":"Allow","Action":"s3:*","Resource":"*"}]}',
    ExternalId: 'abc123'
  };
  return sts.assumeRole(params).promise();
}

function listS3Objects(params) {

  return new Promise((resolve, reject) => {
    const s3options = {
      accessKeyId: params.AccessKeyId,
      secretAccessKey: params.SecretAccessKey,
      sessionToken: params.SessionToken
    };

    const s3 = new AWS.S3(s3options);
    let finalResult = [];

    getAllObjectKeys(s3, params.Bucket, finalResult, null, result => resolve(result), err => reject(err));

  });
}

function getAllObjectKeys(s3, bucket, finalResult, previousResult, callBack, errCallBack) {
  console.log(finalResult.length);
  if (previousResult && !previousResult.IsTruncated) {
    callBack(finalResult);
    return;
  }

  const listObjectParams = {
    Bucket: bucket,
    Delimiter: ',',
    Marker: previousResult ? previousResult.NextMarker : null
  };


  s3.listObjects(listObjectParams, function (err, data) {
    if (err) {
      errCallBack(err);
    }

    data.Contents.forEach(function (element) {
      finalResult.push(element.Key);
    });
    getAllObjectKeys(s3, bucket, finalResult, data, callBack, errCallBack);
  });
}

exports.handler = function (event, context) {
  Promise.resolve().then(() => {
    return assumeS3Role(roleArn);
  }).then((res) => {
    const params = {
      'Bucket': bucketName,
      'AccessKeyId': res.Credentials.AccessKeyId,
      'SecretAccessKey': res.Credentials.SecretAccessKey,
      'SessionToken': res.Credentials.SessionToken
    };
    return listS3Objects(params);
  }).then(() => {
    context.succeed(null, 'done');
    return;
  })
    .catch((err) => {
      context.fail(err);
    });
};
