import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (optional)
  await prisma.interview.deleteMany();
  await prisma.user.deleteMany();

  // Create 5 users
  const users = await prisma.user.createMany({
    data: [
      {
        email: "alice@example.com",
        name: "Alice Johnson",
        password:
          "$2a$10$VYNtqdVaUA5J09ruBmr/MOuiwXazCMtohpOBcnMCjY3NZhfjfoihO",
        role: "Frontend Developer",
        experience: "2 years",
        skills: ["React", "JavaScript", "CSS"],
      },
      {
        email: "bob@example.com",
        name: "Bob Smith",
        password:
          "$2a$10$q6dtQN.twp3.nf6dY4KiRuVynlCdFvdVCY3jnXOCD5HmvQbIMP3fa",
        role: "Backend Developer",
        experience: "3 years",
        skills: ["Node.js", "Express", "PostgreSQL"],
      },
      {
        email: "charlie@example.com",
        name: "Charlie Brown",
        password:
          "$2a$10$RXG9dZJJ0q5EKsfTOkZQzOcD2OyUcPh61enjAzFCEsQ6JvtfjStoq",
        role: "Full Stack Developer",
        experience: "4 years",
        skills: ["React", "Node.js", "MongoDB"],
      },
      {
        email: "david@example.com",
        name: "David Lee",
        password:
          "$2a$10$wcfyuYLD6X9JeKCcLOezh.6eG860JT/F57aP7Fha4j1orGfyA8wJa",
        role: "DevOps Engineer",
        experience: "5 years",
        skills: ["Docker", "Kubernetes", "AWS"],
      },
      {
        email: "eva@example.com",
        name: "Eva Green",
        password:
          "$2a$10$wcfyuYLD6X9JeKCcLOezh.6eG860JT/F57aP7Fha4j1orGfyA8wJa",
        role: "Data Scientist",
        experience: "3 years",
        skills: ["Python", "Machine Learning", "Pandas"],
      },
    ],
  });

  console.log("Users created:", users);

  // Fetch users to create interviews
  const allUsers = await prisma.user.findMany();

  // Create interviews for each user
  for (const user of allUsers) {
    await prisma.interview.create({
      data: {
        userId: user.id,
        role: user.role || "Developer",
        interviewType: "technical",
        technologies: user.skills,
        duration: 45,
        status: "completed",
        completedAt: new Date(),

        transcript: { intro: "Sample transcript" },
        aiAnalysis: { summary: "Good performance" },
        feedback: "Strong fundamentals",

        technicalScore: 8,
        communicationScore: 7,
        problemSolvingScore: 8,
        overallScore: 7.7,

        weakAreas: ["System Design"],
        strengths: ["Coding", "Debugging"],
      },
    });
  }

  console.log("Interviews created ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
