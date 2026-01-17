import { questions } from '@/lib/questions'
import QuestionPageClient from './QuestionPageClient'

// Pre-generate all question pages as static
export function generateStaticParams() {
  return questions.map((q) => ({
    id: String(q.id),
  }))
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <QuestionPageClient id={id} />
}
