// server/seed.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Book = require("./src/models/Book");

dotenv.config();

const dummyBooks = [
  {
    userId: "seed_user_1",
    authorName: "JK Rowling",
    title: "Harry Potter and the Sorcerer's Stone",
    desc: "A boy discovers he is a wizard.",
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/81iqZ2HHD-L.jpg",
    chapters: [{ title: "The Boy Who Lived", content: "Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much." }]
  },
  {
    userId: "seed_user_2",
    authorName: "JRR Tolkien",
    title: "The Hobbit",
    desc: "A hobbit goes on an adventure.",
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/91b0C2YNSrL.jpg",
    chapters: [{ title: "An Unexpected Party", content: "In a hole in the ground there lived a hobbit." }]
  },
  {
    userId: "seed_user_3",
    authorName: "George Orwell",
    title: "1984",
    desc: "Big Brother is watching.",
    privacy: "public",
    cover: "https://images-na.ssl-images-amazon.com/images/I/71kxa1-0mfL.jpg",
    chapters: [{ title: "Part 1", content: "It was a bright cold day in April, and the clocks were striking thirteen." }]
  },
  // ... (You can add more objects here to reach 15 if you want)
];

// Add 7 more generic ones to fill the feed
for(let i=1; i<=12; i++) {
    dummyBooks.push({
        userId: `seed_user_${i+3}`,
        authorName: `Author ${i}`,
        title: `Mystery Book ${i}`,
        desc: `This is a randomly generated description for book ${i}.`,
        privacy: "public",
        cover: "https://via.placeholder.com/150",
        chapters: [{ title: "Chapter 1", content: "Once upon a time..." }]
    })
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("DB Connected. Seeding...");
    await Book.deleteMany({ userId: { $regex: "seed_user" } }); // Clear old seed data
    await Book.insertMany(dummyBooks);
    console.log("Data Imported!");
    process.exit();
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });