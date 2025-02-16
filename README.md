# URL Shortener API

![GitHub](https://img.shields.io/github/license/Yasg-uru/Url_shortner)
![GitHub issues](https://img.shields.io/github/issues/Yasg-uru/Url_shortner)
![GitHub stars](https://img.shields.io/github/stars/Yasg-uru/Url_shortner)
![GitHub last commit](https://img.shields.io/github/last-commit/Yasg-uru/Url_shortner)

A production-ready URL shortener built with **TypeScript** and **Express**. This project provides a robust API for shortening URLs, managing user authentication, and retrieving detailed analytics. It is designed to be scalable, secure, and easy to integrate into modern web applications.

---
# Live Links
Live Demo: [Live Demo](https://url-shortner-frontend-virid.vercel.app)
Experience the URL shortener in action! Shorten URLs, manage your links, and view analytics.

API Documentation: [api-docs](https://url-shortner-aeg8.onrender.com/api-docs/)
Explore the API endpoints, request/response schemas, and usage examples.

Backend GitHub Repository: [GitHub](https://github.com/Yasg-uru/Url_shortner)
View the source code, contribute, or report issues.

Frontend GitHub Repository: [Frontend GitHub](https://github.com/Yasg-uru/url-shortner-frontend)
Explore the frontend codebase built with React, TypeScript, and Tailwind CSS.



## Features

- **URL Shortening**: Convert long URLs into short, manageable links.
- **Custom Aliases**: Option to create custom short URLs.
- **User Authentication**: Secure authentication using **Google OAuth 2.0** and **JWT**.
- **Rate Limiting**: Protect your API from abuse with rate limiting.
- **Analytics**: Track clicks, unique users, device types, and more.
- **Topic-Based Analytics**: Group URLs by topics and retrieve aggregated analytics.
- **Swagger Documentation**: Fully documented API with Swagger UI.
- **Redis Integration**: Efficient caching for improved performance.
- **GeoIP Tracking**: Track user locations using IP addresses.
- **Device & OS Tracking**: Analyze user devices and operating systems.

---

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Analytics](#analytics)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Yasg-uru/Url_shortner.git
   cd Url_shortner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following variables:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/urlshortner
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   CLIENT_URL=http://localhost:3000
   REDIS_URL=redis://localhost:6379
   ```

4. Build and run the project:
   ```bash
   npm run build
   npm start
   ```

5. For development, use:
   ```bash
   npm run dev
   ```

---

## Usage

### Shorten a URL
- **Endpoint**: `POST /api/shorten`
- **Request Body**:
  ```json
  {
    "longUrl": "https://www.example.com/my-long-url",
    "customAlias": "myAlias",
    "topic": "Technology"
  }
  ```
- **Response**:
  ```json
  {
    "shortUrl": "https://short.ly/myAlias",
    "createdAt": "2024-02-01T12:00:00Z"
  }
  ```

### Redirect to Original URL
- **Endpoint**: `GET /api/shorten/{alias}`
- **Response**: Redirects to the original URL.

### Retrieve Analytics
- **Overall Analytics**: `GET /api/analytics/overall`
- **URL-Specific Analytics**: `GET /api/analytics/{alias}`
- **Topic-Based Analytics**: `GET /api/analytics/topic/{topic}`

---

## API Documentation

Explore the API documentation using **Swagger UI**:
- Visit `https://url-shortner-aeg8.onrender.com/api-docs/` after starting the server.

---

## Authentication

This project uses **Google OAuth 2.0** for user authentication. Users can log in using their Google accounts, and a **JWT token** is issued for subsequent API requests.

### Authentication Endpoints
- **Google Login**: `GET /auth/google`
- **Google Callback**: `GET /auth/google/callback`
- **Logout**: `POST /auth/logout`
- **Check Authentication**: `GET /auth/check`
- **Get User Profile**: `GET /auth/profile`

---

## Rate Limiting

To prevent abuse, the API implements rate limiting using the `express-rate-limit` middleware. By default, users are allowed **100 requests per 15 minutes**.

---

## Analytics

The API provides detailed analytics for shortened URLs, including:
- **Total Clicks**
- **Unique Users**
- **Clicks by Date**
- **OS Type Statistics**
- **Device Type Statistics**

---

## Environment Variables

| Variable              | Description                          | Default Value          |
|-----------------------|--------------------------------------|------------------------|
| `PORT`                | Port to run the server               | `3000`                 |
| `MONGO_URI`           | MongoDB connection string            | `mongodb://localhost:27017/urlshortner` |
| `JWT_SECRET`          | Secret key for JWT                   | `your_jwt_secret`      |
| `GOOGLE_CLIENT_ID`    | Google OAuth Client ID               | `your_google_client_id`|
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret           | `your_google_client_secret` |
| `CLIENT_URL`          | Frontend URL for OAuth redirect      | `http://localhost:3000`|
| `REDIS_URL`           | Redis connection URL                 | `redis://localhost:6379` |

---

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **Caching**: Redis
- **Authentication**: Google OAuth 2.0, JWT
- **Rate Limiting**: `express-rate-limit`
- **Analytics**: GeoIP, User-Agent parsing
- **Documentation**: Swagger UI
- **Testing**: Jest, Supertest

---

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

---

## License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

---

## Author

👤 **Yash Choudhary**

- GitHub: [yash Choudhary](https://github.com/Yasg-uru)
- Email: [yashpawar12122004@gmail.com](yashpawar12122004@gmail.com)

---

## Show Your Support

Give a ⭐️ if you like this project!

---

## Acknowledgments

- Special thanks to the **Express** and **TypeScript** communities.
- Inspired by popular URL shorteners like **Bitly** and **TinyURL**.

---

## Roadmap

- [ ] Add support for custom domains.
- [ ] Implement bulk URL shortening.
- [ ] Add more authentication providers (e.g., GitHub, Facebook).
- [ ] Enhance analytics with real-time dashboards.

---

## Feedback

If you have any feedback or suggestions, please open an issue or reach out to the author.

---

**Happy Coding!** 🚀