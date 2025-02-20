'use strict'

import { trackMaintenanceActivity } from '../middileware/routeTracking.js'
import { standardManageError } from '../controllers/failureHandler.js'
import { imageProcessor } from '../services/index.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// Define __dirname manually in ES Module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure uploads folder exists
const uploadsFolder = path.join(__dirname, '../uploads') // <-- Fix the path
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true })
}

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsFolder) // Save files in the correct directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ext !== '.csv') {
    return cb(new Error('Only CSV files are allowed!'), false)
  }
  cb(null, true)
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
})

const handler = (app) => {
  app.all('*', (req, res, next) => {
    trackMaintenanceActivity(req, res, next)
  })

  // Upload document
  app.post('/upload/document', upload.single('file'), (req, res) => {
    imageProcessor.uploadDocument(req, res)
  })

  // Get document status
  app.get('/upload/status/:id', (req, res) => {
    imageProcessor.getDocumentStatus(req, res)
  })

  // Process images
  app.post('/process-images/:id', (req, res) => {
    imageProcessor.triggerImageProcessing(req, res)
  })

  app.all('*', (req, res) => {
    return standardManageError(
      req,
      res,
      `Endpoint - ${req.url} not found`,
      'notImplemented'
    )
  })
}

export { handler, upload }
