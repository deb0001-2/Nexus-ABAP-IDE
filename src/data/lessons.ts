export type Lesson = {
  id: string;
  title: string;
  content: string;
  quiz: {
    question: string;
    options: string[];
    answer: string;
  };
};

export type LevelFolder = {
  level: number;
  title: string;
  lessons: Lesson[];
};

export const LEVEL_FOLDERS: LevelFolder[] = [
  {
    level: 0,
    title: "Level 0: Basics",
    lessons: [
      {
        id: "l0-1",
        title: "Lesson 1: Introduction",
        content: "ABAP (Advanced Business Application Programming) is a high-level programming language created by SAP. It is used for developing enterprise applications for the SAP R/3 system.\n\nABAP is primarily used to build custom reports, interfaces, and module extensions within the SAP software ecosystem.",
        quiz: {
          question: "Who created the ABAP language?",
          options: ["Microsoft", "SAP", "Oracle"],
          answer: "SAP"
        }
      }
    ]
  },
  {
    level: 2,
    title: "Level 2: Control Structures",
    lessons: [
      {
        id: "l2-1",
        title: "Lesson 1: IF Statements",
        content: "Control flow in ABAP is handled with IF, ELSEIF, and ELSE statements to execute code conditionally. Every block must be closed with ENDIF.\n\nExample:\nIF lv_age >= 18.\n  WRITE 'Adult'.\nELSE.\n  WRITE 'Minor'.\nENDIF.",
        quiz: {
          question: "Which statement is used for conditional execution?",
          options: ["IF", "LOOP", "FORM"],
          answer: "IF"
        }
      }
    ]
  }
];

export const getLessonById = (id: string): Lesson | undefined => {
  return LEVEL_FOLDERS.flatMap(folder => folder.lessons).find(l => l.id === id);
};
