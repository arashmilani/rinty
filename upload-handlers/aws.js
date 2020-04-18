const fs = require('fs')
const path = require('path')
const S3 = require('aws-sdk/clients/s3')

module.exports.upload = async function (params) {
  return new Promise((resolve, reject) => {
    let s3 = new S3({
      accessKeyId: params.accessKey,
      secretAccessKey: params.secretKey,
    })

    const config = {
      Key: path.basename(params.file),
      Bucket: params.bucket,
      Body: fs.createReadStream(params.file),
    }

    s3.upload(config, function (err, data) {
      if (err) {
        return reject(err)
      }
      resolve(data)
    })
  })
}
