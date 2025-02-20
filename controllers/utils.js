import AWS from 'aws-sdk'
import fs from 'fs'

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
})

/**
 * @description Uploads a file to AWS S3
 */
const uploadToS3 = async (filePath, fileName) => {
  const fileContent = fs.readFileSync(filePath)
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `compressed-images/${fileName}`,
    Body: fileContent,
    ContentType: 'image/jpeg',
    ACL: 'public-read', // Make file publicly accessible
  }

  const upload = await s3.upload(params).promise()
  return upload.Location // This is the public URL
}

export { uploadToS3 }
