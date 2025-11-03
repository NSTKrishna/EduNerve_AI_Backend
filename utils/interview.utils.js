export const buildInterviewSections = (interviewType) => {
  const sections = ["Introduction"];

  if (interviewType === "technical" || interviewType === "mixed") {
    sections.push("Technical Questions", "Problem Solving");
  }

  if (interviewType === "behavioral" || interviewType === "mixed") {
    sections.push("Behavioral Questions");
  }

  sections.push("Q&A", "Feedback");

  return sections;
};

export const buildInterviewConfig = (interviewType) => {
  return {
    type: "mock_interview",
    duration: "2-3 minutes",
    sections: buildInterviewSections(interviewType),
  };
}; 
