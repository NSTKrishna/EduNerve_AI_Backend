// Single source of truth for what a user can pick when starting an interview.
// The frontend renders its form from GET /interview/options and the server
// validates /start-interview against the same data.
export const INTERVIEW_TYPES = ["technical", "behavioral", "mixed"];

export const ROLE_TECHNOLOGIES = {
  "Full Stack Developer": ["React", "Node.js", "MongoDB", "PostgreSQL", "Express", "TypeScript", "AWS"],
  "Frontend Developer": ["React", "Vue.js", "Angular", "TypeScript", "Next.js", "CSS/SCSS", "Webpack"],
  "Backend Developer": ["Node.js", "Python", "Java", "Go", "PostgreSQL", "MongoDB", "Redis", "Microservices"],
  "Data Scientist": ["Python", "R", "TensorFlow", "PyTorch", "Pandas", "SQL", "Machine Learning"],
  "Machine Learning Engineer": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "Keras", "MLOps", "AWS SageMaker"],
  "DevOps Engineer": ["Docker", "Kubernetes", "Jenkins", "AWS", "Terraform", "CI/CD", "Linux"],
  "Mobile Developer": ["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android", "Firebase"],
  "UI/UX Designer": ["Figma", "Adobe XD", "User Research", "Prototyping", "Design Systems", "Wireframing"],
  "Product Manager": ["Product Strategy", "Roadmapping", "Analytics", "Agile", "Stakeholder Management"],
  "Cloud Architect": ["AWS", "Azure", "GCP", "Serverless", "Microservices", "Cloud Security", "Terraform"],
};

export const ROLES = Object.keys(ROLE_TECHNOLOGIES);
export const MAX_TECHNOLOGIES = 8;
