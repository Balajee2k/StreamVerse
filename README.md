# StreamVerse

**StreamVerse** is a learning project that combines the robust video streaming backend of platforms like YouTube with social media features reminiscent of Twitter. It enables users to upload and stream videos while also engaging in public posts and discussions, creating a unique blend of video content and social interaction.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Future Enhancements](#future-enhancements)
- [License](#license)
- [Contact](#contact)

## Features

### User Management
- **User Registration & Authentication:** Secure sign-up, login, and logout using JWT.
- **Profile Management:** Update personal details and manage user profiles.
- **Password Reset:** Secure password recovery and reset functionality.

### Video Management
- **Video Upload & Storage:** Upload videos with associated metadata (title, description, tags).
- **Efficient Streaming:** Support for smooth video streaming.
- **Cloud Integration:** Media assets are managed via cloud storage for reliability and scalability.

### Social Interaction
- **Public Posting:** Users can post public updates similar to tweets.
- **Commenting System:** Engage with video content through threaded comments.
- **Like/Dislike & Subscriptions:** Enhance user engagement with interactive features.

## Technologies Used

- **Backend Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/)
- **Password Hashing**: [bcrypt](https://www.npmjs.com/package/bcrypt)
- **Cloud Storage**: [Cloudinary](https://cloudinary.com/) (for video and image storage)

## Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/) (local or cloud instance)
- [Cloudinary](https://cloudinary.com/) account for media storage


### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Balajee2k/StreamVerse.git
   cd StreamVerse

## Future Enhancements
**Real-time Chat:** Integration of live chat features during video streams.
**Analytics Dashboard:** Implementation of analytics to track video views, user engagement, and post performance.
**Enhanced Social Features:** Adding functionalities such as retweets/shares, hashtags, and trending topics.
**Admin Panel:** Development of an admin dashboard for content moderation and user management.
