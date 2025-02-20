'use strict'
import csvParser from 'csv-parser'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../controllers/index.js'
import fs from 'fs'
import axios from 'axios'
import sharp from 'sharp'
import path from 'path'
import {
  standardManageError,
  errorMapping,
} from '../controllers/failureHandler.js'
import { utils } from '../controllers/index.js'

/**
 @description Delete file from the system
 better approch for unlink call multiple times
 */
const deleteFile = (path) => {
  fs.unlink(path, (err) => {
    if (err) console.error(err)
    else console.log(`File deleted successfully ${path}`)
  })
}

/**
 @description upload the document
 */
const uploadDocument = async (req, res) => {
  let uploadedFilePath = null // Store the file path for deletion
  try {
    if (!req.file || !req.file.path) {
      return standardManageError(
        req,
        res,
        'Please upload a valid CSV file',
        'badRequest'
      )
    }
    uploadedFilePath = req.file.path // Store the uploaded file path
    const requestId = uuidv4()
    const products = []
    const results = []

    fs.createReadStream(uploadedFilePath)
      .pipe(csvParser())
      .on('data', (row) => results.push(row))
      .on('end', async () => {
        for (let row of results) {
          if (
            !row['Serial Number'] ||
            !row['Product Name'] ||
            !row['Input Image Urls']
          ) {
            return standardManageError(
              req,
              res,
              'Invalid CSV format.. Please upload a valid one',
              'validate'
            )
          }
          products.push({
            serialNumber: row['Serial Number'],
            productName: row['Product Name'],
            inputImageUrls: row['Input Image Urls'].split(','),
            outputImageUrls: [],
            requestId: requestId,
            status: 'Pending',
            createdAt: new Date(),
          })
        }
        // Save to MongoDB (Fix: Remove the extra array)
        await db
          .insert('image', products)
          .then(() => console.log('Data successfully inserted into MongoDB'))
          .catch((err) => console.error('ERROR: Insert failed', err))
        if (fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath)
          console.log(`File deleted successfully: ${uploadedFilePath}`)
        }
        return res.json({
          code: 200,
          requestId,
          message: 'File uploaded successfully',
        })
      })
  } catch (exception) {
    console.log('Error uploading document:', exception)
    const errorMessage =
      errorMapping[exception.code] ||
      exception.message ||
      'An unexpected error occurred. Please try again later.'
    const errorType = exception.message ? 'exception' : 'validate'
    return standardManageError(req, res, errorMessage, errorType)
  }
  //  finally {
  //     // Delete the uploaded file after processing
  //     if (uploadedFilePath) deleteFile(uploadedFilePath);
  // }
}

/**
 @description get the document status
 */
const getDocumentStatus = async (req, res) => {
  try {
    const requestId = req.params.id
    const result = await db.get('image', `requestId $eq ${requestId}`)
    if (!result) {
      return standardManageError(req, res, 'Request id not found', 'notFound')
    }
    return res.json({
      code: 200,
      message: 'File found successfully',
      result: result,
    })
  } catch (exception) {
    console.error('Error uploading document:', exception)
    const errorMessage =
      errorMapping[exception.code] ||
      exception.message ||
      'An unexpected error occurred. Please try again later.'
    const errorType = exception.message ? 'exception' : 'validate'
    return standardManageError(req, res, errorMessage, errorType)
  }
}

/**
 * @description Checks if a given URL is valid.
 */
const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch (error) {
    return false
  }
}

/**
 * @description Process images and upload to AWS S3
 */
const processImages = async (requestId) => {
  // Fetch the document from MongoDB
  const product = await db.get('image', `requestId $eq ${requestId}`)

  if (!product) {
    console.error(`Request ID ${requestId} not found in the database.`)
    return
  }

  console.log(`Processing images for Request ID: ${requestId}`)

  let processedImages = []

  for (const imageUrl of product.inputImageUrls) {
    try {
      // Validate URL before downloading
      if (!isValidUrl(imageUrl)) {
        console.error(`Invalid URL: ${imageUrl}`)
        processedImages.push(null)
        continue
      }

      console.log(`Downloading image: ${imageUrl}`)

      // Download the image
      const response = await axios({
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: 10000, // Set a timeout to prevent hanging requests
      })

      // Ensure the uploads folder exists
      const uploadsFolder = 'uploads'
      if (!fs.existsSync(uploadsFolder)) fs.mkdirSync(uploadsFolder)

      // Generate a unique file name for the compressed image
      const fileName = `compressed-${Date.now()}.jpg`
      const outputPath = path.join(uploadsFolder, fileName)

      console.log(`Compressing image to: ${outputPath}`)

      // Compress the image using sharp
      await sharp(response.data).jpeg({ quality: 50 }).toFile(outputPath)

      // Upload the compressed image to AWS S3 and get the public URL
      const processedImageUrl = await utils.uploadToS3(outputPath, fileName)
      processedImages.push(processedImageUrl)

      // Delete the local compressed image after uploading
      fs.unlinkSync(outputPath)
    } catch (error) {
      console.error(`Error processing image ${imageUrl}:`, error.message)
      processedImages.push(null)
    }
  }

  // Update MongoDB with processed image URLs
  await db.update(
    'image',
    `requestId $eq ${requestId}`, // Corrected MongoDB filter
    { outputImageUrls: processedImages, status: 'Completed' }
  )

  console.log(`Image processing completed for Request ID: ${requestId}`)
  // Call Webhook After Completion
  await sendWebhook(requestId)
}

/**
 * @description Manually trigger image processing
 */
const triggerImageProcessing = async (req, res) => {
  try {
    const requestId = req.params.id
    console.log(`Manually processing images for Request ID: ${requestId}`)
    // Start processing images
    await processImages(requestId)
    return res.json({
      code: 200,
      message: 'Image processed completed successfully',
      requestId,
    })
  } catch (exception) {
    console.log('Error compressing document:', exception)
    const errorMessage =
      errorMapping[exception.code] ||
      exception.message ||
      'An unexpected error occurred. Please try again later.'
    const errorType = exception.message ? 'exception' : 'validate'
    return standardManageError(req, res, errorMessage, errorType)
  }
}

/**
 * @description Send Webhook Notification after processing completion.
 */
const sendWebhook = async (requestId) => {
  const webhookUrl = 'https://webhook.site/6f0b2050-ec76-44ee-ae8b-fa36dc8f92b2' // not
  try {
    const request = await db.get('image', `requestId $eq ${requestId}`)
    if (!request) return
    const payload = {
      requestId,
      status: 'Completed',
      products: {
        serialNumber: request.serialNumber,
        productName: request.productName,
        inputImageUrls: request.inputImageUrls,
        outputImageUrls: request.outputImageUrls,
      },
    }
    await axios.post(webhookUrl, payload)
    console.log(`Webhook sent successfully for request ID: ${requestId}`)
  } catch (error) {
    console.error('Webhook failed:', error.response?.data || error.message)
  }
}

export {
  uploadDocument,
  getDocumentStatus,
  triggerImageProcessing,
  sendWebhook,
}
