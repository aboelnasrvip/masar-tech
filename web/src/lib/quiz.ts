export type StudentQuizQuestion = {
  id: string
  question_text: string
  question_type: string
  options?: Array<{ id: string; option_text: string }>
}

export type QuizReview = {
  question_id: string
  question_text: string
  is_correct: boolean
  selected_text: string | null
  correct_text: string | null
  explanation: string | null
  selected_option_id?: string | null
  answer_text?: string | null
}

export type QuizResult = {
  attempt?: {
    score?: number
    total_points?: number
    percentage?: number
    passed?: boolean
  }
  answers?: QuizReview[]
}

export function extractQuizQuestions(data: unknown): StudentQuizQuestion[] {
  let value = data
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (Array.isArray(value)) return value as StudentQuizQuestion[]
  if (value && typeof value === 'object') {
    const questions = (value as { questions?: unknown }).questions
    if (Array.isArray(questions)) return questions as StudentQuizQuestion[]
  }
  return []
}

export function extractLastAttempt(data: unknown): QuizResult | null {
  let value = data
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null
  const last = (value as { last_attempt?: QuizResult | null }).last_attempt
  if (!last?.attempt) return null
  return last
}

export function answersFromAttempt(result: QuizResult | null): Record<string, { option_id?: string; text?: string }> {
  const next: Record<string, { option_id?: string; text?: string }> = {}
  for (const item of result?.answers ?? []) {
    next[item.question_id] = {
      option_id: item.selected_option_id ?? undefined,
      text: item.answer_text ?? item.selected_text ?? undefined,
    }
  }
  return next
}
