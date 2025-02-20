# **Image Processing System**

## **📌 Project Overview**
The **Image Processing System** is a Node.js-based backend application that processes image data from CSV files. It supports:

- **CSV Upload**: Accepts a CSV file with product image URLs.
- **Validation**: Ensures correct CSV format.
- **Asynchronous Image Processing**: Compresses images to 50% quality.
- **Storage**: Saves processed images and product details in MongoDB.
- **Webhook Notification**: Notifies a webhook after processing is completed.

---

## **📌 Tech Stack**
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Image Processing**: Sharp
- **File Uploads**: Multer
- **Webhook Integration**: Axios
- **Linting & Formatting**: ESLint, Prettier

---

## **📌 Project Setup**

### **1️⃣ Clone the Repository**
```sh
git clone https://github.com/your-repo/image-processing-system.git
cd image-processing-system
```

### **2️⃣ Install Dependencies**
```sh
npm install
```

### **3️⃣ Configure Environment Variables**
Create a `.env` file in the project root and add the following:
```sh
PORT=3000
MONGO_URI=mongodb://localhost:27017/image-processing
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
WEBHOOK_URL=https://your-webhook-url.com/notify
```

### **4️⃣ Start the Server**
```sh
npm start
```
Server runs on `http://localhost:3000`

---

## **📌 API Documentation**

### **1️⃣ Upload CSV**
- **Endpoint:** `POST /upload/document`
- **Description:** Uploads a CSV file containing product image URLs.
- **Request:**
  ```sh
  curl --location 'http://localhost:3000/upload/document' \
  --form 'file=@"/path/to/test.csv"'
  ```
- **Response:**
  ```json
  {
    "code": 200,
    "requestId": "4af06190-bb69-41d6-aea2-96f7ee9f2083",
    "message": "File uploaded successfully"
  }
  ```

### **2️⃣ Get Processing Status**
- **Endpoint:** `GET /upload/status/:id`
- **Description:** Retrieves the processing status of uploaded images.
- **Example:**
  ```sh
  curl -X GET 'http://localhost:3000/upload/status/4af06190-bb69-41d6-aea2-96f7ee9f2083'
  ```
- **Response:**
  ```json
  {
    "code": 200,
    "message": "File found successfully",
    "result": {
      "_id": "67b64569a7f9a523ad8bef6f",
      "serialNumber": "1",
      "productName": "SKU1",
      "inputImageUrls": [
        "https://www.public-image-url1.jpg",
        "https://www.public-image-url2.jpg"
      ],
      "outputImageUrls": [],
      "status": "Pending"
    }
  }
  ```

### **3️⃣ Trigger Image Processing**
- **Endpoint:** `POST /process-images/:id`
- **Description:** Compresses images and updates `outputImageUrls`.
- **Example:**
  ```sh
  curl -X POST 'http://localhost:3000/process-images/4af06190-bb69-41d6-aea2-96f7ee9f2083'
  ```
- **Response:**
  ```json
  {
    "code": 200,
    "message": "Image processing started",
    "requestId": "4af06190-bb69-41d6-aea2-96f7ee9f2083"
  }
  ```

### **4️⃣ Webhook Notification**
- **Triggered after processing is complete**
- **Webhook Payload:**
  ```json
  {
    "requestId": "4af06190-bb69-41d6-aea2-96f7ee9f2083",
    "status": "Completed",
    "products": {
      "serialNumber": "1",
      "productName": "SKU1",
      "inputImageUrls": ["https://www.public-image-url1.jpg"],
      "outputImageUrls": ["https://s3-bucket.com/compressed-image1.jpg"]
    }
  }
  ```

---

## **📌 Project Structure**
```
image-processing-system/
│── config/              # Configuration files
│── controllers/         # Database and error handling
│── routes/              # API routes
│── services/            # Business logic (image processing, webhook)
│── uploads/             # Temp storage for uploaded files
│── utils/               # Utility functions
│── .env                 # Environment variables
│── .eslintrc.json       # ESLint configuration
│── .prettierrc.json     # Prettier configuration
│── package.json         # Project dependencies
│── README.md            # Documentation
```

---

## **📌 Development Tools**
- **ESLint & Prettier**: Code formatting & linting
  ```sh
  npm run lint      # Check for linting issues
  npm run lint:fix  # Auto-fix linting issues
  npm run format    # Format code with Prettier
  ```

- **Testing APIs with Postman**: Import `postman-collection.json` for API testing.

---

## **📌 Contributing**
1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m "Added new feature"`
4. Push to your branch: `git push origin feature-name`
5. Open a Pull Request.

---

## **📌 License**
This project is **open-source** under the **MIT License**.

---

## **🚀 Author**
**Krish Ghosal**
📧 Contact: krishnendughosal999@gmail.com

