# Digital Grievance System

A full-stack web application built to simplify how students raise complaints and track their resolution within an institution.

The goal of this system is to create a transparent and accountable communication channel between students and departments, while also maintaining the option for anonymity when needed.

---

## Overview

In many institutions, students face delays or hesitation in raising issues due to lack of proper channels or fear of exposure. This project addresses that by providing:

- A structured complaint system
- Department-wise handling and escalation
- Real-time updates
- Optional anonymity for students

---

## Features

###  Student
- Register using institute-specific email
- OTP-based email verification
- Submit complaints to departments
- Track complaint status (Pending, In Progress, Resolved)
- View remarks and proof uploaded by departments
- Escalate complaints if not satisfied
- Receive real-time notifications

---

### Department
- View assigned complaints
- Update complaint status
- Upload proof documents (PDF)
- Add remarks while resolving issues
- Receive notifications on escalated complaints

---

### Admin
- Create and manage department accounts
- Define department hierarchy (for escalation)
- View analytics:
  - Total complaints
  - Status distribution
  - Department-wise complaints

---

### Authentication & Security
- JWT-based authentication (HTTP-only cookies)
- Role-based access control
- OTP verification using email
- Institute email pattern validation (e.g. bt23cs036@nitmz.ac.in)
- Rate-limited OTP resend

---

### Advanced Features
- Complaint escalation system (multi-level hierarchy)
- Real-time notifications using Socket.io
- Timeline tracking for complaint updates
- File upload support using Multer
- Responsive UI for mobile, tablet, and desktop

---

## Tech Stack

**Frontend**
- EJS (Server-side rendering)
- HTML, CSS (Custom responsive design)

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB (Mongoose)

**Other Tools**
- JWT (Authentication)
- Nodemailer (OTP system)
- Socket.io (Real-time updates)
- Multer (File uploads)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/vikash-kumar-fullstack/DigitalGrievanceSystem/
cd DigitalGrievanceSystem/backend