import type { Exam, ExamConfiguration, PDFMetadata, Question, Section } from "@/types";

export interface ParsedPdfDocument {
  metadata: PDFMetadata;
  rawText?: string;
}

export interface ValidationIssue {
  questionId: string;
  severity: "warning" | "error";
  message: string;
}

/** Reads PDF files and returns metadata / raw text. */
export interface PDFParser {
  parse(file: File, onProgress?: (percent: number) => void): Promise<ParsedPdfDocument>;
}

/** Turns parsed PDF content into an exam skeleton (sections + configuration). */
export interface ExamParser {
  parse(doc: ParsedPdfDocument, config: ExamConfiguration): Promise<{ sections: Section[] }>;
}

/** Extracts structured questions from parsed PDF content. */
export interface QuestionExtractor {
  extract(doc: ParsedPdfDocument, sections: Section[]): Promise<Question[]>;
}

/** Validates extracted questions before an exam is generated. */
export interface QuestionValidator {
  validate(questions: Question[]): Promise<ValidationIssue[]>;
}

/** Facade over the future AI provider used for extraction and enrichment. */
export interface AIService {
  isEnabled(): boolean;
  generateExam(doc: ParsedPdfDocument, config: ExamConfiguration): Promise<Exam>;
}