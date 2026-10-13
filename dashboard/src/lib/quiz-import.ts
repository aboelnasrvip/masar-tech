type QuizOptionInput = {
  option_text: string
  is_correct: boolean
  order_index: number
}

export type QuizQuestionInput = {
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'code_output'
  points: number
  order_index: number
  explanation: string
  options: QuizOptionInput[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function parseQuizImport(payload: unknown): QuizQuestionInput[] {
  let value = payload
  if (typeof value === 'string') {
    value = JSON.parse(value)
  }
  const wrapped = asRecord(value)
  if (wrapped && 'questions' in wrapped) {
    value = wrapped.questions
  }
  if (!Array.isArray(value)) {
    throw new Error('payload must be a questions array')
  }

  return value.flatMap((item, index) => {
    const row = asRecord(item)
    if (!row) return []
    const questionText = String(row.question_text ?? row.question ?? row.text ?? '').trim()
    if (!questionText) return []

    let questionType = String(row.question_type ?? row.type ?? 'multiple_choice')
    if (questionType !== 'multiple_choice' && questionType !== 'true_false' && questionType !== 'code_output') {
      questionType = 'multiple_choice'
    }

    const options = asArray(row.options).flatMap((option, optionIndex) => {
      const optionRow = asRecord(option)
      if (!optionRow) return []
      const optionText = String(optionRow.option_text ?? optionRow.text ?? '').trim()
      if (!optionText) return []
      return [
        {
          option_text: optionText,
          is_correct: Boolean(optionRow.is_correct),
          order_index: Number(optionRow.order_index ?? optionIndex),
        },
      ]
    })

    if (questionType === 'true_false' && options.length === 0) {
      options.push(
        { option_text: 'صح', is_correct: true, order_index: 0 },
        { option_text: 'غلط', is_correct: false, order_index: 1 },
      )
    }

    return [
      {
        question_text: questionText,
        question_type: questionType as QuizQuestionInput['question_type'],
        points: Number(row.points ?? 1) || 1,
        order_index: Number(row.order_index ?? index),
        explanation: String(row.explanation ?? ''),
        options,
      },
    ]
  })
}
